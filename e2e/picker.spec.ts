import { type Page, expect, test } from '@playwright/test';
import {
  GORE,
  SECOND,
  chooseDem,
  demButton,
  demSheet,
  demTile,
  openApp,
  serveOneDem,
  serveTwoDems,
  stage,
  terrainImage,
} from './helpers';

const SUNKEN = 'rgb(239, 236, 230)'; // --sunken

/** Serves `names` as the list, every one of them the Gore Range file. */
async function serveNames(page: Page, names: string[]): Promise<void> {
  await page.route('**/dems/dems.json', (route) =>
    route.fulfill({
      json: names.map((name, i) => ({
        id: `dem-${i}`,
        name,
        place: `${name}, Colorado`,
        region: 'Colorado',
        file: 'gore.tif',
        width: GORE.width,
        height: GORE.height,
        cell: 5,
      })),
    }),
  );
}

/** Waits until nothing in the sheet is still moving into place. */
const settled = (page: Page) =>
  demSheet(page).evaluate((sheet) => Promise.all(sheet.getAnimations().map((animation) => animation.finished)));

test('the DEM button opens a dialog named DEM, with focus on the current DEM', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);
  await expect(demButton(page)).toHaveText('Gore Range');
  await expect(demButton(page)).toHaveAccessibleName('DEM: Gore Range');
  await expect(demButton(page)).toHaveAttribute('aria-haspopup', 'dialog');

  await demButton(page).click();
  await expect(page.getByRole('dialog', { name: 'DEM' })).toBeVisible();
  await expect(demTile(page, 'Gore Range')).toBeFocused();
  await expect(demTile(page, 'Gore Range')).toHaveAttribute('aria-current', 'true');
  expect(await demTile(page, 'Second').getAttribute('aria-current')).toBeNull();
});

test('a tile shows the name, then the region and the pixel size the list gives', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);
  await demButton(page).click();
  await expect(demTile(page, 'Gore Range')).toHaveText('Gore RangeColorado · 5 m');
  // The second entry gives neither, so its tile has the name alone.
  await expect(demTile(page, 'Second')).toHaveText('Second');
});

test('pressing another tile switches DEM, closes the sheet and returns focus to the button', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);
  await chooseDem(page, 'Second');
  await expect(stage(page)).toHaveAttribute('data-dem', 'second');
  await expect(terrainImage(page)).toHaveJSProperty('width', SECOND.width);
  await expect(demButton(page)).toHaveText('Second');
  await expect(demButton(page)).toBeFocused();
});

test('pressing the current tile closes the sheet and changes nothing', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);
  await chooseDem(page, 'Gore Range');
  await expect(stage(page)).toHaveAttribute('data-dem', 'gore');
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
});

test('Escape, the close button and a press outside close the sheet with no change', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);

  await demButton(page).click();
  await expect(demSheet(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(demSheet(page)).toBeHidden();
  await expect(demButton(page)).toBeFocused();

  await demButton(page).click();
  await demSheet(page).getByRole('button', { name: 'Close' }).click();
  await expect(demSheet(page)).toBeHidden();

  await demButton(page).click();
  await expect(demSheet(page)).toBeVisible();
  await settled(page);
  // The top left corner is the dimmed view at every size.
  await page.mouse.click(8, 100);
  await expect(demSheet(page)).toBeHidden();

  await expect(stage(page)).toHaveAttribute('data-dem', 'gore');
  await expect(demButton(page)).toHaveText('Gore Range');
});

test('the keyboard opens the sheet, moves between tiles and chooses one', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);
  await demButton(page).focus();
  await page.keyboard.press('Enter');
  await expect(demTile(page, 'Gore Range')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(demTile(page, 'Second')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(demSheet(page)).toBeHidden();
  await expect(stage(page)).toHaveAttribute('data-dem', 'second');
});

test('with one DEM there is no button, only the name', async ({ page }) => {
  await serveOneDem(page);
  await openApp(page);
  await expect(page.getByRole('banner')).toContainText('Gore Range');
  await expect(demButton(page)).toHaveCount(0);
});

test('a DEM that cannot be loaded leaves the picker working', async ({ page }) => {
  await serveTwoDems(page);
  await page.route('**/dems/second.tif', (route) => route.fulfill({ status: 404 }));
  await openApp(page);
  await chooseDem(page, 'Second');
  await expect(stage(page)).toHaveAttribute('data-status', 'error');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(demButton(page)).toHaveText('Second');

  await chooseDem(page, 'Gore Range');
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(terrainImage(page)).toHaveJSProperty('width', GORE.width);
});

test('a tile with no thumbnail is a plain square and still works', async ({ page }) => {
  await serveTwoDems(page);
  await page.route('**/dems/second.png', (route) => route.fulfill({ status: 404 }));
  await openApp(page);
  await demButton(page).click();
  const picture = demTile(page, 'Second').locator('.dem-tile__picture');
  await expect(picture.locator('img')).toBeHidden();
  await expect(picture).toHaveCSS('background-color', SUNKEN);
  const box = (await picture.boundingBox())!;
  expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(1);

  await demTile(page, 'Second').click();
  await expect(stage(page)).toHaveAttribute('data-dem', 'second');
});

for (const size of [
  { width: 320, height: 568 },
  { width: 667, height: 375 },
]) {
  test(`four tiles fit a ${size.width} × ${size.height} screen without scrolling`, async ({ page }) => {
    await page.setViewportSize(size);
    await serveNames(page, ['Gore Range', 'Second Peak', 'Third Basin', 'Fourth Ridge']);
    await openApp(page);
    await demButton(page).click();
    await expect(demSheet(page)).toBeVisible();
    await settled(page);

    const sheet = (await demSheet(page).boundingBox())!;
    expect(sheet.x).toBeGreaterThanOrEqual(0);
    expect(sheet.y).toBeGreaterThanOrEqual(0);
    expect(sheet.x + sheet.width).toBeLessThanOrEqual(size.width + 0.5);
    expect(sheet.y + sheet.height).toBeLessThanOrEqual(size.height + 0.5);
    expect(await demSheet(page).evaluate((e) => e.scrollHeight <= e.clientHeight)).toBe(true);

    const tiles = await demSheet(page).locator('.dem-tile').all();
    expect(tiles).toHaveLength(4);
    const tops = new Set<number>();
    for (const tile of tiles) {
      const box = (await tile.boundingBox())!;
      tops.add(Math.round(box.y));
      expect(box.x).toBeGreaterThanOrEqual(sheet.x);
      expect(box.x + box.width).toBeLessThanOrEqual(sheet.x + sheet.width + 0.5);
      expect(box.y + box.height).toBeLessThanOrEqual(sheet.y + sheet.height + 0.5);
    }
    // Two rows upright; one row with the phone on its side.
    expect(tops.size).toBe(size.width > 520 ? 1 : 2);
  });
}

test('on a desktop the sheet is a card in the middle with two tiles across', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'the card is the desktop arrangement');
  await serveTwoDems(page);
  await openApp(page);
  await demButton(page).click();
  await settled(page);
  const sheet = (await demSheet(page).boundingBox())!;
  expect(Math.round(sheet.width)).toBe(420);
  expect(Math.abs(sheet.x + sheet.width / 2 - 640)).toBeLessThanOrEqual(1);
  const [first, second] = [
    (await demTile(page, 'Gore Range').boundingBox())!,
    (await demTile(page, 'Second').boundingBox())!,
  ];
  expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(1);
  expect(Math.round(first.width)).toBe(180);
});

test('at 320px the app name and "Massanutten" are both whole', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await serveNames(page, ['Gore Range', 'Massanutten']);
  await openApp(page);
  await chooseDem(page, 'Massanutten');
  await expect(demButton(page)).toHaveText('Massanutten');
  for (const selector of ['.titlebar__name', '.dem-btn__name']) {
    expect(await page.locator(selector).evaluate((e) => e.scrollWidth <= e.clientWidth), selector).toBe(true);
  }
  const help = (await page.getByTestId('help').boundingBox())!;
  expect(help.x + help.width).toBeLessThanOrEqual(320);
});

test('a name too long for the title bar is cut, and the arrow and the buttons stay on screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await serveNames(page, ['The long north ridge above the upper lake', 'Second Peak']);
  await openApp(page);
  expect(await page.locator('.dem-btn__name').evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true);
  for (const part of [demButton(page).locator('svg'), page.getByTestId('share'), page.getByTestId('help')]) {
    const box = (await part.boundingBox())!;
    expect(box.width).toBeGreaterThan(0);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
  }
});

test('the DEM button and the tiles are 44px targets on a touch screen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'touch sizes apply to touch screens');
  await serveTwoDems(page);
  await openApp(page);
  expect(Math.round((await demButton(page).boundingBox())!.height)).toBeGreaterThanOrEqual(44);
  await demButton(page).click();
  const close = (await demSheet(page).getByRole('button', { name: 'Close' }).boundingBox())!;
  expect(Math.round(close.width)).toBeGreaterThanOrEqual(44);
  expect(Math.round(close.height)).toBeGreaterThanOrEqual(44);
});

test('the current tile has the accent ring and the others have none', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);
  await demButton(page).click();
  // --accent is rgb(184, 74, 0).
  await expect(demTile(page, 'Gore Range').locator('.dem-tile__picture')).toHaveCSS('box-shadow', /rgb\(184, 74, 0\)/);
  // Move the mouse off the tiles, so no tile has the ring a mouse gives.
  await page.mouse.move(2, 2);
  await expect(demTile(page, 'Second').locator('.dem-tile__picture')).toHaveCSS('box-shadow', 'none');
});

test('the app ships two DEMs, each with its thumbnail and its facts', async ({ page }) => {
  await openApp(page);
  await expect(demButton(page)).toHaveText('Gore Range');
  await demButton(page).click();
  await expect(demTile(page, 'Gore Range')).toHaveText('Gore RangeColorado · 5 m');
  await expect(demTile(page, 'Massanutten')).toHaveText('MassanuttenVirginia · 100 m');
  for (const name of ['Gore Range', 'Massanutten']) {
    const picture = demTile(page, name).locator('img');
    await expect(picture).toBeVisible();
    await expect.poll(() => picture.evaluate((img: HTMLImageElement) => Math.min(img.naturalWidth, img.naturalHeight))).toBe(360);
  }

  await demTile(page, 'Massanutten').click();
  await expect(stage(page)).toHaveAttribute('data-dem', 'massanutten');
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(terrainImage(page)).toHaveJSProperty('width', 390);
  await expect(terrainImage(page)).toHaveJSProperty('height', 390);
  await expect(demButton(page)).toHaveText('Massanutten');
  // The address names the DEM, so the view can be shared and reopened.
  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('dem=massanutten');
});
