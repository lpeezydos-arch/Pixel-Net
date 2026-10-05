import { type Locator, type Page, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { writeArrayBuffer } from 'geotiff';

/** The app's name, from the `VITE_APP_NAME` line of `.env`. */
export const APP_NAME = readFileSync('.env', 'utf8').match(/^VITE_APP_NAME=(.*)$/m)![1].trim();

/** The site's whole address, from the `VITE_SITE_URL` line of `.env`. Link-preview tags need it. */
export const SITE_URL = readFileSync('.env', 'utf8').match(/^VITE_SITE_URL=(.*)$/m)![1].trim();

/** Pixel dimensions of the bundled Gore Range DEM. */
export const GORE = { width: 288, height: 294 };

/** The caption's hint before anything is selected, which names the pointer the screen has. */
export const hint = (project: string) =>
  project === 'phone'
    ? 'Drag on the terrain to inspect a pixel'
    : 'Click or drag on the terrain to inspect a pixel';

/** The caption once a pixel is selected: the DEM's facts. */
export const FACTS = 'Gore Range, Colorado · 5 m pixels · 288 × 294';

/** The caption after the first selection: a touch screen is told how to clear it. */
export const firstFacts = (project: string) =>
  project === 'phone' ? 'Double-tap to clear · Gore Range, Colorado · 5 m pixels' : FACTS;

/** The one tooltip that explains the net and the three values read off it. */
export const NET_HELP =
  'Each dot is one pixel. Its direction from the center is its aspect, the way the slope faces looking downhill; its distance from the center is its slope, from 0° at the center to 90° at the rim. Elevation is the height the DEM stores for the pixel.';

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

/**
 * Opens the app at a link and waits until the DEM is drawn. It must be the
 * page's first navigation, or follow `page.goto('about:blank')`: going from
 * one fragment to another does not load the page again.
 */
export async function openLink(page: Page, fragment: string): Promise<void> {
  await page.goto(`/#${fragment}`);
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(terrainImage(page)).toBeVisible();
}

/** Clicks the center of a DEM pixel on the terrain: a press and a release. */
export async function clickPixel(page: Page, col: number, row: number, dem = GORE): Promise<void> {
  const box = (await page.getByTestId('terrain-area').boundingBox())!;
  await page.mouse.click(
    box.x + ((col + 0.5) / dem.width) * box.width,
    box.y + ((row + 0.5) / dem.height) * box.height,
  );
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

/** The block of no-data pixels in the second DEM when `serveTwoDems` is asked for one. */
export const NODATA_BLOCK = { col: 20, row: 10, width: 10, height: 10 };

/**
 * Adds a second DEM to the list: a small uniform slope, 36° steep and facing
 * northwest, served after `delay` milliseconds. With `withNoData`, a block of
 * `NODATA_BLOCK` pixels in it has no data.
 */
export async function serveTwoDems(page: Page, delay = 0, withNoData = false): Promise<void> {
  const values = Float32Array.from({ length: SECOND.width * SECOND.height }, (_, i) => {
    const col = i % SECOND.width;
    const row = Math.floor(i / SECOND.width);
    const hole =
      withNoData &&
      col >= NODATA_BLOCK.col &&
      col < NODATA_BLOCK.col + NODATA_BLOCK.width &&
      row >= NODATA_BLOCK.row &&
      row < NODATA_BLOCK.row + NODATA_BLOCK.height;
    return hole ? -9999 : 1000 + 3 * col + 2 * row;
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
    ...(withNoData ? { GDAL_NODATA: '-9999' } : {}),
  };
  const second = writeArrayBuffer(values, metadata);
  await page.route('**/dems/dems.json', (route) =>
    route.fulfill({
      json: [
        { id: 'gore', name: 'Gore Range', place: 'Gore Range, Colorado', region: 'Colorado', file: 'gore.tif', cell: 5 },
        { id: 'second', name: 'Second', place: 'Second place', file: 'second.tif' },
      ],
    }),
  );
  await page.route('**/dems/second.tif', async (route) => {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    await route.fulfill({ body: Buffer.from(second), contentType: 'image/tiff' });
  });
}

/** Pins the list to Gore Range alone, for tests of the screen with no picker. */
export async function serveOneDem(page: Page): Promise<void> {
  await page.route('**/dems/dems.json', (route) =>
    route.fulfill({
      json: [
        {
          id: 'gore',
          name: 'Gore Range',
          place: 'Gore Range, Colorado',
          region: 'Colorado',
          file: 'gore.tif',
          width: GORE.width,
          height: GORE.height,
          cell: 5,
        },
      ],
    }),
  );
}

/** The DEM's name in the title bar, which opens the picker. */
export const demButton = (page: Page) => page.getByTestId('dem-button');

/** The picker's sheet. */
export const demSheet = (page: Page) => page.getByTestId('dem-sheet');

/** A DEM's tile in the open sheet. */
export const demTile = (page: Page, name: string) => demSheet(page).getByRole('button', { name });

/**
 * Opens the picker and presses a DEM's tile. It waits for the sheet to go,
 * because a press at a point on the screen would otherwise land on it.
 */
export async function chooseDem(page: Page, name: string): Promise<void> {
  await demButton(page).click();
  await demTile(page, name).click();
  await expect(demSheet(page)).toBeHidden();
}
