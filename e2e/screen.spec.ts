import { expect, test } from '@playwright/test';
import { writeArrayBuffer } from 'geotiff';
import {
  APP_NAME,
  GORE,
  SECOND,
  caption,
  fingerprint,
  hint,
  inkedPixels,
  netCloud,
  openApp,
  serveTwoDems,
  stage,
  terrainImage,
} from './helpers';

test('shows the terrain, the net and a hint for the pointer the screen has', async ({ page }, testInfo) => {
  await openApp(page);
  await expect(page.getByRole('heading', { name: APP_NAME })).toBeVisible();
  await expect(caption(page)).toHaveText(hint(testInfo.project.name));
  await expect(terrainImage(page)).toHaveJSProperty('width', GORE.width);
  expect(await fingerprint(terrainImage(page))).not.toBe(0);
  expect(await inkedPixels(netCloud(page))).toBeGreaterThan(10_000);
});

test('tells a keyboard user how to choose a pixel while the terrain has focus', async ({ page }) => {
  await openApp(page);
  const area = page.getByTestId('terrain-area');
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    if (await area.evaluate((element) => element === document.activeElement)) break;
  }
  await expect(caption(page)).toHaveText('Arrow keys choose a pixel · Shift moves ten');
  await page.keyboard.press('ArrowDown');
  await expect(caption(page)).toHaveText('Gore Range, Colorado · 5 m pixels · 288 × 294');
});

test('names the only DEM in the title bar quietly, without a picker', async ({ page }) => {
  await openApp(page);
  await expect(page.getByRole('banner')).toContainText('Gore Range');
  await expect(page.getByRole('tablist')).toHaveCount(0);
  // Plain text, not something that looks like a control.
  expect(await page.locator('.titlebar__dem').evaluate((e) => getComputedStyle(e).fontWeight)).toBe('400');
});

test('reading order follows the layout: net first when stacked, terrain first side by side', async ({ page }, testInfo) => {
  await openApp(page);
  const terrainFirst = await page.evaluate(() => {
    const net = document.querySelector('[aria-label="Net"]')!;
    const terrain = document.querySelector('[aria-label="Terrain"]')!;
    return Boolean(terrain.compareDocumentPosition(net) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(terrainFirst).toBe(testInfo.project.name !== 'phone');
});

test('lets the cards grow on a large monitor', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openApp(page);
  const terrain = (await page.getByRole('region', { name: 'Terrain' }).boundingBox())!;
  const net = (await page.getByTestId('net').boundingBox())!;
  expect(terrain.width).toBeGreaterThanOrEqual(700);
  expect(net.width).toBeGreaterThanOrEqual(600);
});

test('puts the readout under the net on a tall phone', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await openApp(page);
  const net = (await page.getByTestId('net').boundingBox())!;
  const slope = (await page.getByTestId('slope').boundingBox())!;
  expect(slope.y).toBeGreaterThanOrEqual(net.y + net.height);
  expect(net.width).toBeGreaterThan(290);
});

test('fits the screen without scrolling', async ({ page }) => {
  await openApp(page);
  const viewport = page.viewportSize()!;
  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(scrollHeight).toBeLessThanOrEqual(viewport.height);
  for (const region of ['Net', 'Terrain']) {
    const box = (await page.getByRole('region', { name: region }).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  }
});

test('puts the net above the terrain on a phone and beside it on a desktop', async ({ page }, testInfo) => {
  await openApp(page);
  const net = (await page.getByRole('region', { name: 'Net' }).boundingBox())!;
  const terrain = (await page.getByRole('region', { name: 'Terrain' }).boundingBox())!;
  if (testInfo.project.name === 'phone') {
    expect(net.y + net.height).toBeLessThanOrEqual(terrain.y);
  } else {
    expect(terrain.x + terrain.width).toBeLessThanOrEqual(net.x);
  }
});

test('shows an error card when the DEM cannot be loaded, and recovers on retry', async ({ page }) => {
  await page.route('**/dems/gore.tif', (route) => route.fulfill({ status: 404, body: 'missing' }));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('This DEM could not be loaded.');
  await expect(terrainImage(page)).toHaveCount(0);

  await page.unroute('**/dems/gore.tif');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(terrainImage(page)).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('explains why a DEM in degrees cannot be used', async ({ page }) => {
  const degrees = writeArrayBuffer(Float32Array.from({ length: 16 }, (_, i) => i), {
    width: 4,
    height: 4,
    GTModelTypeGeoKey: 2,
    GeographicTypeGeoKey: 4326,
    ModelPixelScale: [0.0001, 0.0001, 0],
    ModelTiepoint: [0, 0, 0, -106, 39, 0],
  });
  await page.route('**/dems/gore.tif', (route) =>
    route.fulfill({ body: Buffer.from(degrees), contentType: 'image/tiff' }),
  );
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText(
    'This DEM is not in meters with square cells, so its slopes cannot be computed.',
  );
});

test('switches DEMs from the picker', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);
  const second = page.getByRole('tab', { name: 'Second' });
  await expect(page.getByRole('tab', { name: 'Gore Range' })).toHaveAttribute('aria-selected', 'true');

  await second.click();
  await expect(second).toHaveAttribute('aria-selected', 'true');
  await expect(terrainImage(page)).toHaveJSProperty('width', SECOND.width);
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  expect(await inkedPixels(netCloud(page))).toBeGreaterThan(0);
});

test('keeps the DEM chosen last when an earlier choice loads slowly', async ({ page }) => {
  await serveTwoDems(page, 600);
  await openApp(page);

  await page.getByRole('tab', { name: 'Second' }).click();
  await page.getByRole('tab', { name: 'Gore Range' }).click();
  await page.waitForTimeout(1000);
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(terrainImage(page)).toHaveJSProperty('width', GORE.width);
});

test('the selected DEM tab shows a focus ring', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);
  await page.keyboard.press('Tab');
  const focused = () =>
    page.evaluate(() => {
      const element = document.activeElement as HTMLElement;
      return { name: element.textContent, shadow: getComputedStyle(element).boxShadow };
    });
  expect((await focused()).name).toBe('Gore Range');
  // The ring is a 3px spread with no offset or blur; the tab's resting shadow
  // is not. The shadow animates to the ring, so wait for it to arrive.
  await expect.poll(async () => (await focused()).shadow).toMatch(/0px 0px 0px 3px/);
});
