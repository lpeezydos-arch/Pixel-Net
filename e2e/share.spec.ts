import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { type Page, type TestInfo, expect, test } from '@playwright/test';
import { type Box, cardLayout } from '../src/share/cardLayout';
import { fileName } from '../src/share/text';
import { APP_NAME, GORE, clickPixel, openApp, stage } from './helpers';

// A pixel of the bundled Gore Range DEM, and what the share sheet is told about it.
const WEST_SLOPE = { col: 150, row: 210 };
const WEST_TEXT = 'Gore Range, Colorado: slope 36.0°, aspect 259° W, elevation 3,874 m';
const WEST_FRAGMENT = '#dem=gore&px=150,210';

const share = (page: Page) => page.getByTestId('share');
const notice = (page: Page) => page.getByTestId('share-announcement');
const origin = (page: Page) => new URL(page.url()).origin;
const clipboard = (page: Page) => page.evaluate(() => navigator.clipboard.readText());

/** Takes the share sheet away, as on Firefox on a desktop. */
async function withoutShareSheet(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
  });
}

/**
 * Stands in for a share sheet that takes no files. What it is handed is kept
 * in `window.__shared`. It can take the share, be closed by the user, fail,
 * or stay open for a while.
 */
async function withShareSheet(page: Page, behavior: 'takes' | 'closed' | 'fails' | 'slow' = 'takes') {
  await page.addInitScript((how) => {
    const shared: unknown[] = [];
    Object.assign(window, { __shared: shared });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        shared.push({ title: data.title, text: data.text, url: data.url, files: data.files?.length ?? 0 });
        if (how === 'closed') throw new DOMException('Share canceled', 'AbortError');
        if (how === 'fails') throw new DOMException('Permission denied', 'NotAllowedError');
        if (how === 'slow') await new Promise((resolve) => setTimeout(resolve, 400));
      },
    });
  }, behavior);
}

const shared = (page: Page) => page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared);

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
});

test('the share button is disabled while the DEM loads', async ({ page }) => {
  await page.route('**/dems/gore.tif', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.goto('/');
  await expect(stage(page)).toHaveAttribute('data-status', 'loading');
  await expect(share(page)).toBeDisabled();
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(share(page)).toBeEnabled();
});

test('the share button is disabled when the DEM cannot be loaded', async ({ page }) => {
  await page.route('**/dems/gore.tif', (route) => route.fulfill({ status: 404, body: 'missing' }));
  await page.goto('/');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(share(page)).toBeDisabled();
});

test('with no share sheet, a press copies the link and says so', async ({ page }) => {
  await withoutShareSheet(page);
  await openApp(page);
  await clickPixel(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await share(page).click();

  await expect(share(page)).toHaveAttribute('data-done', 'true');
  await expect(page.locator('.tooltip')).toHaveText('Link copied');
  await expect(notice(page)).toHaveText('Link copied');
  expect(await clipboard(page)).toBe(`${origin(page)}/${WEST_FRAGMENT}`);

  // The check mark and the words go back by themselves.
  await expect(share(page)).toHaveAttribute('data-done', 'false', { timeout: 3000 });
  await expect(page.locator('.tooltip')).toHaveCount(0);
});

test('with a share sheet that takes no files, a press shares the link, the title and the text', async ({ page }) => {
  await withShareSheet(page);
  await openApp(page);
  await clickPixel(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await share(page).click();
  await expect
    .poll(() => shared(page))
    .toEqual([{ title: APP_NAME, text: WEST_TEXT, url: `${origin(page)}/${WEST_FRAGMENT}`, files: 0 }]);
  // The share sheet has said so itself; the button adds nothing.
  await expect(share(page)).toHaveAttribute('data-done', 'false');
  await expect(notice(page)).toHaveText('');
});

test('with nothing selected, the link names the DEM and the text is the place', async ({ page }) => {
  await withShareSheet(page);
  await openApp(page);
  await share(page).click();
  await expect
    .poll(() => shared(page))
    .toEqual([{ title: APP_NAME, text: 'Gore Range, Colorado', url: `${origin(page)}/#dem=gore`, files: 0 }]);
});

test('a shared link leaves out the query the address arrived with', async ({ page }) => {
  await withShareSheet(page);
  await page.goto('/?ref=mail');
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await share(page).click();
  await expect
    .poll(() => shared(page))
    .toEqual([{ title: APP_NAME, text: 'Gore Range, Colorado', url: `${origin(page)}/#dem=gore`, files: 0 }]);
});

test('closing the share sheet changes nothing', async ({ page }) => {
  await withShareSheet(page, 'closed');
  await openApp(page);
  await page.evaluate(() => navigator.clipboard.writeText('untouched'));
  await share(page).click();
  await expect.poll(async () => (await shared(page)).length).toBe(1);
  await page.waitForTimeout(200);
  await expect(share(page)).toHaveAttribute('data-done', 'false');
  await expect(notice(page)).toHaveText('');
  expect(await clipboard(page)).toBe('untouched');
});

test('a share sheet that fails falls back to copying the link', async ({ page }) => {
  await withShareSheet(page, 'fails');
  await openApp(page);
  await clickPixel(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await share(page).click();
  await expect(notice(page)).toHaveText('Link copied');
  await expect(share(page)).toHaveAttribute('data-done', 'true');
  expect(await clipboard(page)).toBe(`${origin(page)}/${WEST_FRAGMENT}`);
});

test('a refused copy says so', async ({ page }) => {
  await withoutShareSheet(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('refused')) },
    });
  });
  await openApp(page);
  await share(page).click();
  await expect(page.locator('.tooltip')).toHaveText('Could not copy the link');
  await expect(notice(page)).toHaveText('Could not copy the link');
  // No check mark: nothing was copied.
  await expect(share(page)).toHaveAttribute('data-done', 'false');
});

test('a second press while the share sheet is open is ignored', async ({ page }) => {
  await withShareSheet(page, 'slow');
  await openApp(page);
  await share(page).click();
  await share(page).click();
  await page.waitForTimeout(700); // longer than the stand-in sheet stays open
  expect(await shared(page)).toHaveLength(1);
  await expect(notice(page)).toHaveText('');
});

test('names the button and explains it from its tooltip', async ({ page }) => {
  await openApp(page);
  await expect(page.getByRole('button', { name: 'Share this view' })).toBeVisible();
  await share(page).focus();
  await expect(page.locator('.tooltip')).toHaveText('Share this view');
});

// More pixels of the Gore Range DEM. `net` is where the point plots, in rim radii.
const NORTHEAST_SLOPE = { col: 200, row: 230, net: { x: 0.288, y: 0.409 } };
const LAKE = { col: 230, row: 70 };
const NET_RIM = 0.9375;
const PAPER = [255, 255, 255, 255];
const RUST = [184, 74, 0, 255];
const GORE_SHAPE = GORE.width / GORE.height;

/** The picture follows the screen: stacked on the phone, side by side on the desktop. */
const modeOf = (testInfo: TestInfo) => (testInfo.project.name === 'phone' ? 'portrait' : 'wide');

/**
 * Stands in for a share sheet that takes PNG files. What it is handed is kept
 * in `window.__shared`, and the picture, decoded, in `window.__picture`.
 */
async function withFileShareSheet(page: Page) {
  await page.addInitScript(() => {
    const shared: unknown[] = [];
    Object.assign(window, { __shared: shared });
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: (data: ShareData) => (data.files ?? []).every((file) => file.type === 'image/png'),
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        const file = data.files?.[0];
        let picture = null;
        if (file) {
          const bitmap = await createImageBitmap(file);
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
          Object.assign(window, { __picture: canvas });
          picture = { name: file.name, type: file.type, width: bitmap.width, height: bitmap.height };
        }
        shared.push({ title: data.title, text: data.text, url: data.url, picture });
      },
    });
  });
}

/** The color of one pixel of the shared picture: red, green, blue, alpha. */
const colorAt = (page: Page, x: number, y: number) =>
  page.evaluate(
    ([px, py]) => {
      const canvas = (window as unknown as { __picture: HTMLCanvasElement }).__picture;
      return [...canvas.getContext('2d')!.getImageData(px, py, 1, 1).data];
    },
    [Math.round(x), Math.round(y)],
  );

/** How many pixels in a box of the shared picture are not white. */
const inkIn = (page: Page, box: Box) =>
  page.evaluate((b) => {
    const canvas = (window as unknown as { __picture: HTMLCanvasElement }).__picture;
    const data = canvas.getContext('2d')!.getImageData(b.x, b.y, b.width, b.height).data;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) count++;
    }
    return count;
  }, box);

test('with a share sheet that takes files, a press shares a picture of the view', async ({ page }, testInfo) => {
  await withFileShareSheet(page);
  await openApp(page);
  await clickPixel(page, NORTHEAST_SLOPE.col, NORTHEAST_SLOPE.row);
  await share(page).click();
  await expect.poll(async () => (await shared(page)).length).toBe(1);

  const layout = cardLayout({ mode: modeOf(testInfo), aspect: GORE_SHAPE, lines: [40, 28, 28] });
  expect(await shared(page)).toEqual([
    {
      title: APP_NAME,
      text: 'Gore Range, Colorado: slope 41.5°, aspect 35° NE, elevation 3,878 m',
      url: `${origin(page)}/#dem=gore&px=200,230`,
      picture: { name: fileName(APP_NAME, 'gore'), type: 'image/png', width: layout.width, height: layout.height },
    },
  ]);

  // Keep the picture beside the test's results, to be looked at by eye.
  const png = await page.evaluate(() =>
    (window as unknown as { __picture: HTMLCanvasElement }).__picture.toDataURL('image/png').split(',')[1],
  );
  const path = testInfo.outputPath('share-picture.png');
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.from(png, 'base64'));

  // White at the corner.
  expect(await colorAt(page, 2, 2)).toEqual(PAPER);
  // Rust at the selected pixel's point on the net.
  const rim = (layout.net.width / 2) * NET_RIM;
  const pointX = layout.net.x + layout.net.width / 2 + NORTHEAST_SLOPE.net.x * rim;
  const pointY = layout.net.y + layout.net.height / 2 - NORTHEAST_SLOPE.net.y * rim;
  expect(await colorAt(page, pointX, pointY)).toEqual(RUST);
  // Rust in the ring around the selected pixel on the terrain: its accent
  // band runs from 7.5 to 12 out from the pixel's center.
  const ringX = layout.terrain.x + ((NORTHEAST_SLOPE.col + 0.5) / GORE.width) * layout.terrain.width;
  const ringY = layout.terrain.y + ((NORTHEAST_SLOPE.row + 0.5) / GORE.height) * layout.terrain.height;
  expect(await colorAt(page, ringX + 9.75, ringY)).toEqual(RUST);
  // A gray of the hillshade in the middle of the terrain.
  const [red, green, blue, alpha] = await colorAt(
    page,
    layout.terrain.x + layout.terrain.width / 2,
    layout.terrain.y + layout.terrain.height / 2,
  );
  expect(green).toBe(red);
  expect(blue).toBe(red);
  expect(alpha).toBe(255);
});

test('the picture has no readout line when nothing is selected', async ({ page }, testInfo) => {
  await withFileShareSheet(page);
  await openApp(page);
  await share(page).click();
  await expect.poll(async () => (await shared(page)).length).toBe(1);
  const layout = cardLayout({ mode: modeOf(testInfo), aspect: GORE_SHAPE, lines: [28, 28] });
  const [sent] = (await shared(page)) as Array<{ picture: { width: number; height: number } }>;
  expect(sent.picture.width).toBe(layout.width);
  expect(sent.picture.height).toBe(layout.height);
});

test('a flat pixel is drawn hollow at the center of the net', async ({ page }, testInfo) => {
  await withFileShareSheet(page);
  await openApp(page);
  await clickPixel(page, LAKE.col, LAKE.row);
  await expect(page.getByTestId('aspect')).toHaveText('Flat');
  await share(page).click();
  await expect.poll(async () => (await shared(page)).length).toBe(1);

  const layout = cardLayout({ mode: modeOf(testInfo), aspect: GORE_SHAPE, lines: [40, 28, 28] });
  const centerX = layout.net.x + layout.net.width / 2;
  const centerY = layout.net.y + layout.net.height / 2;
  expect(await colorAt(page, centerX, centerY)).toEqual(PAPER);
  // The accent ring of a hollow point runs from 4.5 to 7.5 out from the center.
  expect(await colorAt(page, centerX + 6, centerY)).toEqual(RUST);
});

test('a place name too long for the picture is set smaller and stays inside it', async ({ page }, testInfo) => {
  const place = 'The cirque above the upper lake on the east side of the Gore Range, Eagle County, Colorado';
  await page.route('**/dems/dems.json', (route) =>
    route.fulfill({ json: [{ id: 'gore', name: 'Gore Range', place, file: 'gore.tif', width: 288, height: 294 }] }),
  );
  await withFileShareSheet(page);
  await openApp(page);
  await share(page).click();
  await expect.poll(async () => (await shared(page)).length).toBe(1);

  const layout = cardLayout({ mode: modeOf(testInfo), aspect: GORE_SHAPE, lines: [28, 28] });
  const first = layout.caption.lines[0];
  const last = layout.caption.lines[layout.caption.lines.length - 1];
  const captionHeight = last.y + last.height - first.y;
  // The caption is there...
  const captionBox = { x: layout.caption.x, y: first.y, width: layout.caption.width, height: captionHeight };
  expect(await inkIn(page, captionBox)).toBeGreaterThan(0);
  // ...and nothing runs into the space to its right.
  const margin = { x: layout.width - 48, y: first.y, width: 48, height: captionHeight };
  expect(await inkIn(page, margin)).toBe(0);
});

test('when the picture cannot be made, the link is shared without it', async ({ page }) => {
  await withFileShareSheet(page);
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.toDataURL = () => {
      throw new Error('This canvas cannot be read.');
    };
  });
  await openApp(page);
  await clickPixel(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await share(page).click();
  await expect
    .poll(() => shared(page))
    .toEqual([{ title: APP_NAME, text: WEST_TEXT, url: `${origin(page)}/${WEST_FRAGMENT}`, picture: null }]);
});
