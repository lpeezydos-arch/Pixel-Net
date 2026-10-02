import { type Locator, type Page, expect } from '@playwright/test';
import { writeArrayBuffer } from 'geotiff';

/** Pixel dimensions of the bundled Gore Range DEM. */
export const GORE = { width: 288, height: 294 };

export const terrainImage = (page: Page) => page.getByTestId('terrain-image');
export const netCloud = (page: Page) => page.getByTestId('net-cloud');
export const caption = (page: Page) => page.getByTestId('caption');

export const stage = (page: Page) => page.getByRole('main');

/** Opens the app and waits until the first DEM is drawn. */
export async function openApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(terrainImage(page)).toBeVisible();
}

/** A number that changes when the canvas's pixels change. */
export async function fingerprint(canvas: Locator): Promise<number> {
  return canvas.evaluate((element) => {
    const el = element as HTMLCanvasElement;
    const data = el.getContext('2d')!.getImageData(0, 0, el.width, el.height).data;
    let hash = 0;
    for (let i = 0; i < data.length; i += 41) hash = (hash * 31 + data[i]) >>> 0;
    return hash;
  });
}

/** How many pixels of the canvas are not fully transparent. */
export async function inkedPixels(canvas: Locator): Promise<number> {
  return canvas.evaluate((element) => {
    const el = element as HTMLCanvasElement;
    const data = el.getContext('2d')!.getImageData(0, 0, el.width, el.height).data;
    let count = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) count++;
    return count;
  });
}

/** Pixel dimensions of the synthetic DEM served by `serveTwoDems`. */
export const SECOND = { width: 60, height: 40 };

/**
 * Adds a second DEM to the list: a small uniform slope, 36° steep and facing
 * northwest, served after `delay` milliseconds.
 */
export async function serveTwoDems(page: Page, delay = 0): Promise<void> {
  const values = Float32Array.from({ length: SECOND.width * SECOND.height }, (_, i) => {
    const col = i % SECOND.width;
    const row = Math.floor(i / SECOND.width);
    return 1000 + 3 * col + 2 * row;
  });
  // Declared apart from the call because geotiff's types omit some GeoKeys.
  const metadata = {
    width: SECOND.width,
    height: SECOND.height,
    GTModelTypeGeoKey: 1,
    ProjectedCSTypeGeoKey: 32613,
    ProjLinearUnitsGeoKey: 9001,
    ModelPixelScale: [5, 5, 0],
    ModelTiepoint: [0, 0, 0, 500000, 4400000, 0],
  };
  const second = writeArrayBuffer(values, metadata);
  await page.route('**/dems/dems.json', (route) =>
    route.fulfill({
      json: [
        { id: 'gore', name: 'Gore Range', place: 'Gore Range, Colorado', file: 'gore.tif' },
        { id: 'second', name: 'Second', place: 'Second place', file: 'second.tif' },
      ],
    }),
  );
  await page.route('**/dems/second.tif', async (route) => {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    await route.fulfill({ body: Buffer.from(second), contentType: 'image/tiff' });
  });
}
