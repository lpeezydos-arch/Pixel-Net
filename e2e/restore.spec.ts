import { type Page, expect, test } from '@playwright/test';
import {
  GORE,
  SECOND,
  caption,
  clickPixel,
  fingerprint,
  firstFacts,
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
});
