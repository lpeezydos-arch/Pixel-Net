import { expect, test } from '@playwright/test';
import { writeArrayBuffer } from 'geotiff';
import {
  APP_NAME,
  GORE,
  SECOND,
  caption,
  fingerprint,
  inkedPixels,
  netCloud,
  openApp,
  serveTwoDems,
  stage,
  terrainImage,
} from './helpers';

test('shows the terrain, the net and a hint', async ({ page }) => {
  await openApp(page);
  await expect(page.getByRole('heading', { name: APP_NAME })).toBeVisible();
  await expect(caption(page)).toHaveText('Drag on the terrain to inspect a pixel');
  await expect(terrainImage(page)).toHaveJSProperty('width', GORE.width);
  expect(await fingerprint(terrainImage(page))).not.toBe(0);
  expect(await inkedPixels(netCloud(page))).toBeGreaterThan(10_000);
});

test('names the only DEM in the title bar without a picker', async ({ page }) => {
  await openApp(page);
  await expect(page.getByRole('banner')).toContainText('Gore Range');
  await expect(page.getByRole('tablist')).toHaveCount(0);
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
