import { type Page, expect, test } from '@playwright/test';
import { GORE, fingerprint, netCloud, openApp, serveTwoDems, stage, terrainImage } from './helpers';

const NET_RIM = 0.9375;
/** Distance of the sun from the center of the net, as a share of the rim, at 45° high. */
const R45 = Math.SQRT2 * Math.sin(Math.PI / 8);

const sun = (page: Page) => page.getByTestId('sun');
const label = (page: Page) => page.getByTestId('sun-label');

/** Viewport position of a point on the net, in rim radii east and north of the center. */
async function netPoint(page: Page, east: number, north: number) {
  const net = (await page.getByTestId('net').boundingBox())!;
  const rim = (net.width / 2) * NET_RIM;
  return { x: net.x + net.width / 2 + east * rim, y: net.y + net.height / 2 - north * rim };
}

async function sunCenter(page: Page) {
  const box = (await sun(page).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Drags the sun to a point on the net and leaves the mouse button down. */
async function dragSunTo(page: Page, east: number, north: number) {
  const from = await sunCenter(page);
  const to = await netPoint(page, east, north);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
}

test('the sun starts in the northwest, 45° high', async ({ page }) => {
  await openApp(page);
  await expect(label(page)).toHaveText('NW · 45° high');
  const expected = await netPoint(page, -R45 * Math.SQRT1_2, R45 * Math.SQRT1_2);
  const actual = await sunCenter(page);
  expect(Math.abs(actual.x - expected.x)).toBeLessThan(1);
  expect(Math.abs(actual.y - expected.y)).toBeLessThan(1);
});

test('the sun can be dragged again after its pointer is lost', async ({ page }) => {
  await openApp(page);
  await sun(page).evaluate((element) => {
    const init = { pointerId: 7, pointerType: 'touch', bubbles: true };
    element.dispatchEvent(new PointerEvent('pointerdown', { ...init, clientX: 1, clientY: 1 }));
    element.dispatchEvent(new PointerEvent('lostpointercapture', init));
  });
  await expect(label(page)).toHaveAttribute('data-active', 'false');

  await dragSunTo(page, R45, 0);
  await expect(label(page)).toHaveText('E · 45° high');
  await page.mouse.up();
});

test('the sun states its position at rest, and keeps stating it after a drag', async ({ page }) => {
  await openApp(page);
  await expect(label(page)).toHaveText('NW · 45° high');
  await expect(label(page)).toBeVisible();
  await expect(label(page)).toHaveAttribute('data-active', 'false');
  await expect(sun(page)).toHaveAttribute(
    'aria-label',
    'Sun, NW · 45° high. Arrow keys move the light; Home resets it.',
  );

  await dragSunTo(page, R45, 0);
  await page.mouse.up();
  await expect(label(page)).toHaveText('E · 45° high');
  await expect(label(page)).toBeVisible();
  await expect(label(page)).toHaveAttribute('data-active', 'false');
  await expect(sun(page)).toHaveAttribute(
    'aria-label',
    'Sun, E · 45° high. Arrow keys move the light; Home resets it.',
  );
  await expect(page.getByTestId('sun-announcement')).toHaveText('Sun E, 45° high');
});

test('key presses raise the label for a moment and announce where the sun ended up', async ({ page }) => {
  await openApp(page);
  await sun(page).focus();
  // Three steps of 5° take the sun from NW (315°) into NNW.
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  await expect(label(page)).toHaveAttribute('data-active', 'true');
  await expect(label(page)).toHaveText('NNW · 45° high');
  // One announcement for the run of presses, not one per press.
  await expect(page.getByTestId('sun-announcement')).toHaveText('Sun NNW, 45° high');
  await expect(label(page)).toHaveAttribute('data-active', 'false', { timeout: 3000 });
});

test('a tap on a moved sun says how to put it back', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'needs a touch screen');
  await openApp(page);
  await dragSunTo(page, 0, -R45);
  await page.mouse.up();
  await expect(label(page)).toHaveText('S · 45° high');

  await sun(page).tap();
  await expect(label(page)).toHaveText('Double-tap to reset');
  await expect(label(page)).toHaveAttribute('data-active', 'true');
  // The hint gives way to the position again.
  await expect(label(page)).toHaveText('S · 45° high', { timeout: 3500 });
  await expect(label(page)).toHaveAttribute('data-active', 'false');
});

test('dragging the sun re-lights the terrain and leaves the net and the readout alone', async ({ page }) => {
  await openApp(page);
  const area = (await page.getByTestId('terrain-area').boundingBox())!;
  await page.mouse.click(area.x + (150.5 / GORE.width) * area.width, area.y + (210.5 / GORE.height) * area.height);
  await expect(page.getByTestId('slope')).toHaveText('36.0°');
  const terrainBefore = await fingerprint(terrainImage(page));
  const netBefore = await fingerprint(netCloud(page));

  await dragSunTo(page, R45, 0);
  await expect(label(page)).toHaveText('E · 45° high');
  await expect(label(page)).toHaveAttribute('data-active', 'true');
  await expect(page.locator('.tooltip')).toHaveCount(0); // the label replaces the tooltip
  await expect.poll(() => fingerprint(terrainImage(page))).not.toBe(terrainBefore);

  await page.mouse.up();
  await expect(label(page)).toHaveAttribute('data-active', 'false');
  expect(await fingerprint(netCloud(page))).toBe(netBefore);
  await expect(page.getByTestId('slope')).toHaveText('36.0°');
  await expect(page.getByTestId('aspect')).toHaveText('259° W');
});

test('the sun stops at 10° above the horizon', async ({ page }) => {
  await openApp(page);
  await dragSunTo(page, 1.6, 0);
  await expect(label(page)).toHaveText('E · 10° high');
  const limit = await netPoint(page, Math.SQRT2 * Math.sin((80 * Math.PI) / 360), 0);
  const actual = await sunCenter(page);
  expect(Math.abs(actual.x - limit.x)).toBeLessThan(1);
  await page.mouse.up();
});

test('dragging the sun to the center puts it overhead', async ({ page }) => {
  await openApp(page);
  await dragSunTo(page, 0, 0);
  await expect(label(page)).toHaveText('Overhead');
  await page.mouse.up();
});

test('a double click sends the sun back to the northwest', async ({ page }) => {
  await openApp(page);
  const terrainBefore = await fingerprint(terrainImage(page));
  await dragSunTo(page, 0, -R45);
  await page.mouse.up();
  await expect(label(page)).toHaveText('S · 45° high');

  await sun(page).dblclick();
  await expect(label(page)).toHaveText('NW · 45° high');
  await expect.poll(() => fingerprint(terrainImage(page))).toBe(terrainBefore);
});

test('arrow keys move the sun and Home resets it', async ({ page }) => {
  await openApp(page);
  await sun(page).focus();
  for (let i = 0; i < 9; i++) await page.keyboard.press('ArrowRight');
  await expect(label(page)).toHaveText('N · 45° high');
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowDown');
  await expect(label(page)).toHaveText('N · 10° high');
  for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowUp');
  await expect(label(page)).toHaveText('Overhead');

  await page.keyboard.press('Home');
  await expect(label(page)).toHaveText('NW · 45° high');
});

test('pressing the net away from the sun does nothing', async ({ page }) => {
  await openApp(page);
  const terrainBefore = await fingerprint(terrainImage(page));
  const away = await netPoint(page, 0.5, -0.5);
  await page.mouse.click(away.x, away.y);
  await page.mouse.move(away.x + 40, away.y);
  await expect(label(page)).toHaveText('NW · 45° high');
  expect(await fingerprint(terrainImage(page))).toBe(terrainBefore);
});

test('the sun keeps its place when the DEM changes', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);
  await sun(page).focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  await expect(label(page)).toHaveText('NNW · 45° high');

  await page.getByRole('tab', { name: 'Second' }).click();
  await expect(terrainImage(page)).toHaveJSProperty('width', 60);
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(label(page)).toHaveText('NNW · 45° high');
});

test('the selected point is drawn above the sun', async ({ page }) => {
  await openApp(page);
  const order = await page.evaluate(() => {
    const z = (selector: string) => Number(getComputedStyle(document.querySelector(selector)!).zIndex);
    return { marker: z('.net-marker'), sun: z('.sun') };
  });
  expect(order.marker).toBeGreaterThan(order.sun);
});

test('explains the sun from its tooltip', async ({ page }) => {
  await openApp(page);
  await sun(page).focus();
  await expect(page.locator('.tooltip')).toHaveText(
    'Drag, or use the arrow keys, to move the light. Double-click or Home resets it.',
  );
});

test('moving the sun during a reset keeps it where the user put it', async ({ page }) => {
  await openApp(page);
  await sun(page).focus();
  for (let i = 0; i < 9; i++) await page.keyboard.press('ArrowRight');
  await expect(label(page)).toHaveText('N · 45° high');

  await page.keyboard.press('Home'); // the sun starts gliding back to the northwest
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  const interrupted = await label(page).textContent();
  expect(interrupted).not.toBe('NW · 45° high');

  // Long enough for the abandoned glide to have finished, had it kept running.
  await page.waitForTimeout(1200);
  await expect(label(page)).toHaveText(interrupted!);
});
