import { type Page, expect, test } from '@playwright/test';
import { APP_NAME, clickPixel, openApp, stage } from './helpers';

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

test('with nothing selected, the link is the bare address and the text is the place', async ({ page }) => {
  await withShareSheet(page);
  await openApp(page);
  await share(page).click();
  await expect
    .poll(() => shared(page))
    .toEqual([{ title: APP_NAME, text: 'Gore Range, Colorado', url: `${origin(page)}/`, files: 0 }]);
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
