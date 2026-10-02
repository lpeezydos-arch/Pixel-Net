import { type Page, expect, test } from '@playwright/test';
import { GORE, caption, openApp, serveTwoDems, stage, terrainImage } from './helpers';

// Values of the bundled Gore Range DEM, by Horn's method.
const WEST_SLOPE = { col: 150, row: 210, slope: '36.0°', aspect: '259° W', elevation: '3,874 m' };
const NORTHEAST_SLOPE = { col: 200, row: 230, slope: '41.5°', aspect: '35° NE', net: { x: 0.288, y: 0.409 } };
const LAKE = { col: 230, row: 70, elevation: '3,620 m' };
const NET_RIM = 0.9375;

const area = (page: Page) => page.getByTestId('terrain-area');
const ring = (page: Page) => page.getByTestId('selection-ring');
const loupe = (page: Page) => page.getByTestId('loupe');
const marker = (page: Page) => page.getByTestId('net-marker');
const slope = (page: Page) => page.getByTestId('slope');
const aspect = (page: Page) => page.getByTestId('aspect');
const elevation = (page: Page) => page.getByTestId('elevation');

/** Viewport position of the center of a DEM pixel. */
async function pointOf(page: Page, col: number, row: number, dem = GORE) {
  const box = (await area(page).boundingBox())!;
  return {
    x: box.x + ((col + 0.5) / dem.width) * box.width,
    y: box.y + ((row + 0.5) / dem.height) * box.height,
  };
}

async function press(page: Page, col: number, row: number) {
  const point = await pointOf(page, col, row);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
}

/** Viewport position of a zero-size anchor such as the ring or the net point. */
async function anchorOf(page: Page, testId: string) {
  const box = (await page.getByTestId(testId).boundingBox())!;
  return { x: box.x, y: box.y };
}

test('shows dashes until a pixel is chosen', async ({ page }) => {
  await openApp(page);
  await expect(slope(page)).toHaveText('–');
  await expect(aspect(page)).toHaveText('–');
  await expect(elevation(page)).toHaveText('–');
  await expect(ring(page)).toHaveAttribute('data-visible', 'false');
  await expect(marker(page)).toHaveAttribute('data-visible', 'false');
});

test('pressing a pixel shows its slope, aspect and elevation', async ({ page }) => {
  await openApp(page);
  await press(page, WEST_SLOPE.col, WEST_SLOPE.row);

  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
  await expect(aspect(page)).toHaveText(WEST_SLOPE.aspect);
  await expect(elevation(page)).toHaveText(WEST_SLOPE.elevation);
  await expect(loupe(page)).toHaveAttribute('data-visible', 'true');
  await expect(ring(page)).toHaveAttribute('data-visible', 'true');
  await expect(marker(page)).toHaveAttribute('data-visible', 'true');

  await page.mouse.up();
  await expect(loupe(page)).toHaveAttribute('data-visible', 'false');
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
  await expect(ring(page)).toHaveAttribute('data-visible', 'true');
  await expect(caption(page)).toHaveText('Gore Range, Colorado · 5 m pixels · 288 × 294');
  await expect(page.getByTestId('announcement')).toHaveText(
    `Slope ${WEST_SLOPE.slope}, aspect ${WEST_SLOPE.aspect}, elevation ${WEST_SLOPE.elevation}`,
  );
});

test('dragging moves the point on the net to where the new pixel belongs', async ({ page }) => {
  await openApp(page);
  await press(page, WEST_SLOPE.col, WEST_SLOPE.row);
  const target = await pointOf(page, NORTHEAST_SLOPE.col, NORTHEAST_SLOPE.row);
  await page.mouse.move(target.x, target.y, { steps: 12 });

  await expect(slope(page)).toHaveText(NORTHEAST_SLOPE.slope);
  await expect(aspect(page)).toHaveText(NORTHEAST_SLOPE.aspect);

  const net = (await page.getByTestId('net').boundingBox())!;
  const rim = (net.width / 2) * NET_RIM;
  const expected = {
    x: net.x + net.width / 2 + NORTHEAST_SLOPE.net.x * rim,
    y: net.y + net.height / 2 - NORTHEAST_SLOPE.net.y * rim,
  };
  // The point springs to its place; wait for it to settle.
  await expect.poll(async () => Math.abs((await anchorOf(page, 'net-marker')).x - expected.x)).toBeLessThan(1.5);
  await expect.poll(async () => Math.abs((await anchorOf(page, 'net-marker')).y - expected.y)).toBeLessThan(1.5);

  const ringAt = await anchorOf(page, 'selection-ring');
  expect(Math.abs(ringAt.x - target.x)).toBeLessThan(1);
  expect(Math.abs(ringAt.y - target.y)).toBeLessThan(1);
  await page.mouse.up();
});

test('a flat pixel has no point on the net', async ({ page }) => {
  await openApp(page);
  await press(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await expect(marker(page)).toHaveAttribute('data-visible', 'true');

  const lake = await pointOf(page, LAKE.col, LAKE.row);
  await page.mouse.move(lake.x, lake.y, { steps: 6 });
  await expect(slope(page)).toHaveText('0.0°');
  await expect(aspect(page)).toHaveText('Flat');
  await expect(elevation(page)).toHaveText(LAKE.elevation);
  await expect(marker(page)).toHaveAttribute('data-visible', 'false');
  await expect(ring(page)).toHaveAttribute('data-visible', 'true');
  await page.mouse.up();
});

test('arrow keys step the selection one pixel, or ten with Shift', async ({ page }) => {
  await openApp(page);
  await area(page).focus();
  await page.keyboard.press('ArrowDown');
  // The first press selects the center pixel.
  await expect(elevation(page)).toHaveText('4,009 m');
  await expect(loupe(page)).toHaveAttribute('data-visible', 'false');

  await press(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await page.mouse.up();
  await page.keyboard.press('ArrowDown');
  await expect(slope(page)).toHaveText('36.5°');
  await expect(elevation(page)).toHaveText('3,873 m');
  await expect(page.getByTestId('announcement')).toHaveText('Slope 36.5°, aspect 252° W, elevation 3,873 m');

  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Shift+ArrowRight');
  await expect(slope(page)).toHaveText('52.0°');
  await expect(elevation(page)).toHaveText('3,929 m');
});

test('arrow keys with a modifier are left to the browser', async ({ page }) => {
  await openApp(page);
  await press(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await page.mouse.up();
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);

  await area(page).focus();
  await page.keyboard.press('Control+ArrowRight');
  await page.keyboard.press('Alt+ArrowDown');
  await page.keyboard.press('Meta+ArrowUp');
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
  await expect(elevation(page)).toHaveText(WEST_SLOPE.elevation);
});

test('the net point pulses when it first appears after starting on a flat pixel', async ({ page }) => {
  await openApp(page);
  await press(page, LAKE.col, LAKE.row);
  await expect(marker(page)).toHaveAttribute('data-visible', 'false');
  const target = await pointOf(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await page.mouse.move(target.x, target.y, { steps: 8 });
  await expect(marker(page)).toHaveAttribute('data-visible', 'true');
  await expect(marker(page)).toHaveAttribute('data-pulse', 'true');
  await page.mouse.up();
});

test('the net info button sits at the top-left corner of the net', async ({ page }) => {
  await openApp(page);
  const button = page.getByRole('button', { name: 'How to read the net' });
  expect(await button.evaluate((element) => getComputedStyle(element).position)).toBe('absolute');
  const box = (await button.boundingBox())!;
  const netBox = (await page.getByTestId('net').boundingBox())!;
  expect(Math.abs(box.x - netBox.x)).toBeLessThan(1);
  expect(Math.abs(box.y - netBox.y)).toBeLessThan(1);
});

test('dragging past the edge keeps the nearest edge pixel', async ({ page }) => {
  await openApp(page);
  await press(page, WEST_SLOPE.col, WEST_SLOPE.row);
  const box = (await area(page).boundingBox())!;
  const inside = await pointOf(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await page.mouse.move(box.x + box.width + 30, inside.y, { steps: 8 });

  await expect(slope(page)).toHaveText(/^\d+\.\d°$/);
  const edge = await pointOf(page, GORE.width - 1, WEST_SLOPE.row);
  const ringAt = await anchorOf(page, 'selection-ring');
  expect(Math.abs(ringAt.x - edge.x)).toBeLessThan(1);

  const lens = (await loupe(page).boundingBox())!;
  expect(lens.x).toBeGreaterThanOrEqual(box.x - 1);
  expect(lens.x + lens.width).toBeLessThanOrEqual(box.x + box.width + 1);
  await page.mouse.up();
});

test('a second finger does not take over the drag', async ({ page }) => {
  await openApp(page);
  const first = await pointOf(page, WEST_SLOPE.col, WEST_SLOPE.row);
  const second = await pointOf(page, LAKE.col, LAKE.row);
  const fire = (type: string, pointerId: number, at: { x: number; y: number }) =>
    area(page).evaluate(
      (element, event) =>
        element.dispatchEvent(
          new PointerEvent(event.type, {
            pointerId: event.pointerId,
            pointerType: 'touch',
            clientX: event.at.x,
            clientY: event.at.y,
            bubbles: true,
          }),
        ),
      { type, pointerId, at },
    );

  await fire('pointerdown', 1, first);
  await fire('pointerdown', 2, second);
  await fire('pointermove', 2, second);
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);

  await fire('pointerup', 2, second);
  await expect(loupe(page)).toHaveAttribute('data-visible', 'true');
  await fire('pointerup', 1, first);
  await expect(loupe(page)).toHaveAttribute('data-visible', 'false');
});

test('keeps the selection on its pixel when the screen changes size', async ({ page }) => {
  await openApp(page);
  await press(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await page.mouse.up();

  const before = page.viewportSize()!;
  await page.setViewportSize({ width: before.height, height: before.width }); // turn it sideways
  await expect.poll(async () => (await area(page).boundingBox())!.width).not.toBe(0);

  const pixel = await pointOf(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await expect.poll(async () => Math.abs((await anchorOf(page, 'selection-ring')).x - pixel.x)).toBeLessThan(1);
  await expect.poll(async () => Math.abs((await anchorOf(page, 'selection-ring')).y - pixel.y)).toBeLessThan(1);
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);

  const net = (await page.getByTestId('net').boundingBox())!;
  await expect
    .poll(async () => {
      const at = await anchorOf(page, 'net-marker');
      return at.x > net.x && at.x < net.x + net.width && at.y > net.y && at.y < net.y + net.height;
    })
    .toBe(true);
});

test('switching DEMs clears the selection', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);
  await press(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await page.mouse.up();
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);

  await page.getByRole('tab', { name: 'Second' }).click();
  await expect(terrainImage(page)).toHaveJSProperty('width', 60);
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(slope(page)).toHaveText('–');
  await expect(ring(page)).toHaveAttribute('data-visible', 'false');
  await expect(marker(page)).toHaveAttribute('data-visible', 'false');
  await expect(caption(page)).toHaveText('Drag on the terrain to inspect a pixel');

  // The second DEM is a uniform slope facing northwest.
  const box = (await area(page).boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(slope(page)).toHaveText('35.8°');
  await expect(aspect(page)).toHaveText('304° NW');
});

test('choosing the DEM that is already shown changes nothing', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);
  await press(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await page.mouse.up();
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);

  const statuses: string[] = [];
  await stage(page).evaluate((main, sink) => {
    new MutationObserver(() => {
      (window as unknown as Record<string, string[]>)[sink].push(main.getAttribute('data-status')!);
    }).observe(main, { attributes: true, attributeFilter: ['data-status'] });
    (window as unknown as Record<string, string[]>)[sink] = [];
  }, '__statuses');

  await page.getByRole('tab', { name: 'Gore Range' }).click();
  await page.waitForTimeout(300);
  statuses.push(...(await page.evaluate(() => (window as unknown as Record<string, string[]>).__statuses)));
  expect(statuses).toEqual([]);
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
  await expect(aspect(page)).toHaveText(WEST_SLOPE.aspect);
  await expect(elevation(page)).toHaveText(WEST_SLOPE.elevation);
  await expect(ring(page)).toHaveAttribute('data-visible', 'true');
});

test('the net point pulses again on the first selection after a DEM switch', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);
  await press(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await page.mouse.up();
  await expect(marker(page)).toHaveAttribute('data-pulse', 'true');

  await page.getByRole('tab', { name: 'Second' }).click();
  await expect(terrainImage(page)).toHaveJSProperty('width', 60);
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  // Clearing the selection re-arms the pulse.
  await expect(marker(page)).toHaveAttribute('data-pulse', 'false');

  const box = (await area(page).boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(marker(page)).toHaveAttribute('data-pulse', 'true');
});

test('explains each value from its info button', async ({ page }) => {
  await openApp(page);
  const tips: Array<[string, string]> = [
    ['How to read the net', 'Each dot is one pixel: its direction from the center is the way the slope faces, and its distance from the center is how steep it is.'],
    ['About slope', 'How steep the ground is at this pixel, from 0° for flat to 90° for vertical.'],
    ['About aspect', 'The compass direction this slope faces, looking downhill.'],
    ['About elevation', 'The height stored in the DEM at this pixel.'],
  ];
  for (const [name, text] of tips) {
    await page.getByRole('button', { name }).focus();
    await expect(page.locator('.tooltip')).toHaveText(text);
    await page.keyboard.press('Escape');
    await expect(page.locator('.tooltip')).toHaveCount(0);
  }
});

test('a tap opens an info tooltip and a second tap closes it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'needs a touch screen');
  await openApp(page);
  const button = page.getByRole('button', { name: 'About slope' });
  await button.tap();
  await expect(page.locator('.tooltip')).toBeVisible();
  await button.tap();
  await expect(page.locator('.tooltip')).toHaveCount(0);
});
