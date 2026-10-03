import { type Page, expect, test } from '@playwright/test';
import {
  GORE,
  SECOND,
  caption,
  clickPixel,
  fingerprint,
  firstFacts,
  hint,
  openApp,
  openLink,
  serveTwoDems,
  stage,
  terrainImage,
} from './helpers';

// Values of the bundled Gore Range DEM, by Horn's method.
const WEST_SLOPE = { col: 150, row: 210, slope: '36.0°', aspect: '259° W', elevation: '3,874 m' };
const SAVED = 'pixel-net:view';

const ring = (page: Page) => page.getByTestId('selection-ring');
const marker = (page: Page) => page.getByTestId('net-marker');
const slope = (page: Page) => page.getByTestId('slope');
const aspect = (page: Page) => page.getByTestId('aspect');
const elevation = (page: Page) => page.getByTestId('elevation');
const sunLabel = (page: Page) => page.getByTestId('sun-label');

test('a link opens its pixel and its sun', async ({ page }, testInfo) => {
  await openApp(page);
  const underDefaultSun = await fingerprint(terrainImage(page));

  await page.goto('about:blank');
  await openLink(page, 'dem=gore&px=150,210&sun=120,35');
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
  await expect(aspect(page)).toHaveText(WEST_SLOPE.aspect);
  await expect(elevation(page)).toHaveText(WEST_SLOPE.elevation);
  await expect(ring(page)).toHaveAttribute('data-visible', 'true');
  await expect(marker(page)).toHaveAttribute('data-visible', 'true');
  // The point arrives as on any first selection.
  await expect(marker(page)).toHaveAttribute('data-pulse', 'true');
  await expect(sunLabel(page)).toHaveText('120° SE · 35° high');
  expect(await fingerprint(terrainImage(page))).not.toBe(underDefaultSun);
  await expect(caption(page)).toHaveText(firstFacts(testInfo.project.name));
  // No one asked for it to be spoken.
  await page.waitForTimeout(100); // the announcer writes its words 60 ms late
  await expect(page.getByTestId('announcement')).toHaveText('');
});

test('the saved view is opened when the address has none', async ({ page }) => {
  await page.addInitScript(
    ([key, view]) => window.localStorage.setItem(key, view),
    [SAVED, 'dem=gore&px=150,210&sun=120,35'],
  );
  await openApp(page);
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
  await expect(ring(page)).toHaveAttribute('data-visible', 'true');
  await expect(sunLabel(page)).toHaveText('120° SE · 35° high');
});

test('a link wins over the saved view', async ({ page }) => {
  await page.addInitScript(([key, view]) => window.localStorage.setItem(key, view), [SAVED, 'dem=gore&px=200,230']);
  await openLink(page, 'dem=gore&px=150,210');
  await expect(aspect(page)).toHaveText(WEST_SLOPE.aspect);
});

test('a link to the default view opens the default view on a device with a saved view', async ({ page }) => {
  await page.addInitScript(
    ([key, view]) => window.localStorage.setItem(key, view),
    [SAVED, 'dem=gore&px=150,210&sun=120,35'],
  );
  await openLink(page, 'dem=gore');
  await expect(slope(page)).toHaveText('–');
  await expect(ring(page)).toHaveAttribute('data-visible', 'false');
  await expect(sunLabel(page)).toHaveText('315° NW · 45° high');
});

test('a link to another DEM opens it with its pixel', async ({ page }) => {
  await serveTwoDems(page);
  await openLink(page, 'dem=second&px=30,20');
  await expect(terrainImage(page)).toHaveJSProperty('width', SECOND.width);
  await expect(page.getByRole('tab', { name: 'Second' })).toHaveAttribute('aria-selected', 'true');
  // The second DEM is a uniform slope facing northwest.
  await expect(slope(page)).toHaveText('35.8°');
  await expect(aspect(page)).toHaveText('304° NW');
});

test('a link to a DEM that is not in the list opens the first DEM with no pixel', async ({ page }) => {
  await openLink(page, 'dem=ghost&px=10,10&sun=120,35');
  await expect(terrainImage(page)).toHaveJSProperty('width', GORE.width);
  await expect(slope(page)).toHaveText('–');
  await expect(ring(page)).toHaveAttribute('data-visible', 'false');
  // The rest of the link still applies.
  await expect(sunLabel(page)).toHaveText('120° SE · 35° high');
});

test('a pixel outside the DEM is ignored', async ({ page }) => {
  await openLink(page, 'dem=gore&px=999,999');
  await expect(slope(page)).toHaveText('–');
  await expect(ring(page)).toHaveAttribute('data-visible', 'false');
  await expect(marker(page)).toHaveAttribute('data-visible', 'false');
});

test('a pixel waiting for its DEM is dropped when another DEM is chosen first', async ({ page }) => {
  await serveTwoDems(page, 600);
  await page.goto('/#dem=second&px=30,20');
  // The second DEM is still on its way; the picker is already there.
  await page.getByRole('tab', { name: 'Gore Range' }).click();
  await expect(terrainImage(page)).toHaveJSProperty('width', GORE.width);
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  // Long enough for the abandoned DEM to have arrived, had it been waited for.
  await page.waitForTimeout(800);
  await expect(slope(page)).toHaveText('–');
  await expect(ring(page)).toHaveAttribute('data-visible', 'false');
});

test('storage that refuses to be used does not stop the app', async ({ page }) => {
  await page.addInitScript(() => {
    const refuse = () => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    };
    Storage.prototype.getItem = refuse;
    Storage.prototype.setItem = refuse;
    Storage.prototype.removeItem = refuse;
  });
  await openApp(page);
  await clickPixel(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
  // The address still follows the view; only the saving is lost.
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('#dem=gore&px=150,210');
});

const fragment = (page: Page) => page.evaluate(() => window.location.hash);
const saved = (page: Page) => page.evaluate((key) => window.localStorage.getItem(key), SAVED);

test('the app reopens where it was left', async ({ page }) => {
  await openApp(page);
  await clickPixel(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await page.getByTestId('sun').focus();
  // Three steps of 5° take the sun from 315° to 330°.
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  await expect.poll(() => saved(page)).toBe('dem=gore&px=150,210&sun=330,45');

  await page.reload();
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
  await expect(ring(page)).toHaveAttribute('data-visible', 'true');
  await expect(sunLabel(page)).toHaveText('330° NW · 45° high');

  // The installed app opens at the bare address: the saved view alone restores it.
  await page.goto('about:blank');
  await openApp(page);
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
  await expect(sunLabel(page)).toHaveText('330° NW · 45° high');
});

test('the address follows the view, and is bare again at the default view', async ({ page }) => {
  await openApp(page);
  expect(await fragment(page)).toBe('');
  const entries = await page.evaluate(() => window.history.length);

  await clickPixel(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await expect.poll(() => fragment(page)).toBe('#dem=gore&px=150,210');

  await page.getByTestId('terrain-area').focus();
  await page.keyboard.press('Escape');
  await expect.poll(() => fragment(page)).toBe('');
  expect(await saved(page)).toBeNull();
  // The address is replaced in place, so Back still leaves the app.
  expect(await page.evaluate(() => window.history.length)).toBe(entries);
});

test('the view is saved at once when the page is hidden', async ({ page }) => {
  await openApp(page);
  // One synchronous step: select the center pixel with a key, then hide the
  // page, so the 400 ms timer has had no chance to run.
  const savedAtOnce = await page.getByTestId('terrain-area').evaluate((area, key) => {
    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    return window.localStorage.getItem(key);
  }, SAVED);
  expect(savedAtOnce).toBe('dem=gore&px=144,147');
});

test('a link pasted into the open tab is applied', async ({ page }, testInfo) => {
  await openApp(page);
  // A pixel chosen by hand is announced.
  await clickPixel(page, 200, 230);
  await expect(page.getByTestId('announcement')).toHaveText('Slope 41.5°, aspect 35° NE, elevation 3,878 m');

  await page.evaluate(() => {
    window.location.hash = 'dem=gore&px=150,210&sun=120,35';
  });
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
  await expect(ring(page)).toHaveAttribute('data-visible', 'true');
  await expect(sunLabel(page)).toHaveText('120° SE · 35° high');
  // What was said about the pixel before no longer describes the screen.
  await page.waitForTimeout(100); // the announcer writes its words 60 ms late
  await expect(page.getByTestId('announcement')).toHaveText('');

  // A link describes the whole view: one with no pixel clears the selection.
  await page.evaluate(() => {
    window.location.hash = 'dem=gore&sun=200,60';
  });
  await expect(slope(page)).toHaveText('–');
  await expect(ring(page)).toHaveAttribute('data-visible', 'false');
  await expect(sunLabel(page)).toHaveText('200° S · 60° high');
  await expect(caption(page)).toHaveText(hint(testInfo.project.name));
});

test('a pasted link to another DEM switches to it', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);
  await page.evaluate(() => {
    window.location.hash = 'dem=second&px=30,20';
  });
  await expect(terrainImage(page)).toHaveJSProperty('width', SECOND.width);
  await expect(slope(page)).toHaveText('35.8°');
  await expect.poll(() => saved(page)).toBe('dem=second&px=30,20');
});

test('a link pasted while another DEM is loading goes to its own DEM', async ({ page }) => {
  await serveTwoDems(page, 600);
  await openApp(page);
  await page.getByRole('tab', { name: 'Second' }).click();
  await expect(stage(page)).toHaveAttribute('data-status', 'loading');
  await page.evaluate(() => {
    window.location.hash = 'dem=gore&px=150,210';
  });
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
  await expect(terrainImage(page)).toHaveJSProperty('width', GORE.width);
  await expect(page.getByRole('tab', { name: 'Gore Range' })).toHaveAttribute('aria-selected', 'true');
  // Long enough for the abandoned DEM to have arrived, had it been waited for.
  await page.waitForTimeout(800);
  await expect(terrainImage(page)).toHaveJSProperty('width', GORE.width);
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
});

test('an address emptied by hand is left alone and filled in at the next change', async ({ page }) => {
  await openLink(page, 'dem=gore&px=150,210');
  await page.evaluate(() => {
    window.location.hash = '';
  });
  await page.waitForTimeout(600); // longer than the write delay
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
  expect(await fragment(page)).toBe('');

  await clickPixel(page, 200, 230);
  await expect.poll(() => fragment(page)).toBe('#dem=gore&px=200,230');
});

test('a fragment that names no view is ignored', async ({ page }) => {
  await page.addInitScript(
    ([key, view]) => window.localStorage.setItem(key, view),
    [SAVED, 'dem=gore&px=150,210&sun=120,35'],
  );
  await openLink(page, 'top');
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
  await expect(sunLabel(page)).toHaveText('120° SE · 35° high');
  await page.waitForTimeout(600); // longer than the write delay
  expect(await saved(page)).toBe('dem=gore&px=150,210&sun=120,35');
});

test('a fragment that names no view is ignored in an open tab', async ({ page }) => {
  await openApp(page);
  await clickPixel(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
  await page.evaluate(() => {
    window.location.hash = 'top';
  });
  await page.waitForTimeout(600); // longer than the write delay
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
  await expect(ring(page)).toHaveAttribute('data-visible', 'true');
});

test('a link with a part that cannot be used is corrected in the address', async ({ page }) => {
  await openLink(page, 'dem=ghost&px=10,10&sun=120,35');
  await expect.poll(() => fragment(page)).toBe('#dem=gore&sun=120,35');

  await page.goto('about:blank');
  await openLink(page, 'dem=gore&px=999,999');
  await expect.poll(() => fragment(page)).toBe('');
  await expect.poll(() => saved(page)).toBeNull();
});

test('opening a link makes it the saved view', async ({ page }) => {
  await openLink(page, 'dem=gore&px=150,210');
  await expect.poll(() => saved(page)).toBe('dem=gore&px=150,210');
});

test('a dragged sun is written in whole degrees and reopens where its label said', async ({ page }) => {
  await openApp(page);
  const box = (await page.getByTestId('sun').boundingBox())!;
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 37.3, from.y + 21.7, { steps: 5 });
  await page.mouse.up();
  const label = await sunLabel(page).textContent();
  expect(label).not.toBe('315° NW · 45° high');
  await expect.poll(() => fragment(page)).toMatch(/^#dem=gore&sun=\d+,\d+$/);

  await page.reload();
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(sunLabel(page)).toHaveText(label!);
});

test('an address that already has a query keeps it', async ({ page }) => {
  await page.goto('/?ref=mail#dem=gore&px=150,210');
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);

  await clickPixel(page, 200, 230);
  await expect
    .poll(() => page.evaluate(() => window.location.search + window.location.hash))
    .toBe('?ref=mail#dem=gore&px=200,230');
});
