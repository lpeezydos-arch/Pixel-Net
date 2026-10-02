import { type Locator, type Page, expect, test } from '@playwright/test';
import { openApp, serveTwoDems, stage } from './helpers';

const net = (page: Page) => page.getByRole('region', { name: 'Net' });
const terrain = (page: Page) => page.getByRole('region', { name: 'Terrain' });

/** True if a tap `dx` pixels right and `dy` pixels below the element's center still hits it. */
async function hitAt(target: Locator, dx: number, dy: number): Promise<boolean> {
  return target.evaluate(
    (element, offset) => {
      const box = element.getBoundingClientRect();
      const hit = document.elementFromPoint(
        box.left + box.width / 2 + offset.dx,
        box.top + box.height / 2 + offset.dy,
      );
      return hit !== null && (hit === element || element.contains(hit));
    },
    { dx, dy },
  );
}

const SCREENS = [
  { name: 'small phone', width: 320, height: 568 },
  { name: 'phone', width: 375, height: 667 },
  { name: 'tall phone', width: 390, height: 844 },
  { name: 'phone on its side', width: 844, height: 390 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'large monitor', width: 1920, height: 1080 },
];

for (const screen of SCREENS) {
  test(`fits a ${screen.name} without scrolling or overlap`, async ({ page }) => {
    await page.setViewportSize({ width: screen.width, height: screen.height });
    await openApp(page);

    const scroll = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }));
    expect(scroll.width).toBeLessThanOrEqual(screen.width);
    expect(scroll.height).toBeLessThanOrEqual(screen.height);

    const a = (await net(page).boundingBox())!;
    const b = (await terrain(page).boundingBox())!;
    const caption = (await page.getByTestId('caption').boundingBox())!;
    for (const box of [a, b, caption]) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(56);
      expect(box.x + box.width).toBeLessThanOrEqual(screen.width);
      expect(box.y + box.height).toBeLessThanOrEqual(screen.height);
    }
    const apart = a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
    expect(apart).toBe(true);

    const netBox = (await page.getByTestId('net').boundingBox())!;
    expect(netBox.width).toBeGreaterThanOrEqual(180);
    expect(b.width / b.height).toBeCloseTo(288 / 294, 1);
  });
}

test('nothing moves when the DEM arrives', async ({ page }) => {
  await page.route('**/dems/gore.tif', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.goto('/');
  await expect(stage(page)).toHaveAttribute('data-status', 'loading');
  await expect(page.locator('.skeleton')).toHaveCount(2);
  await expect.poll(async () => (await terrain(page).boundingBox())!.width).toBeGreaterThan(0);
  // The DEM list has arrived and given the layout the DEM's shape.
  await expect(page.getByRole('banner')).toContainText('Gore Range');
  const before = { net: await net(page).boundingBox(), terrain: await terrain(page).boundingBox() };

  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(page.locator('.skeleton')).toHaveCount(0);
  expect(await net(page).boundingBox()).toEqual(before.net);
  expect(await terrain(page).boundingBox()).toEqual(before.terrain);
});

test('touch targets are at least 44px', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'touch sizes apply to touch screens');
  await serveTwoDems(page);
  await openApp(page);

  for (const tab of await page.getByRole('tab').all()) {
    expect(Math.round((await tab.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
  }
  const sun = (await page.getByTestId('sun').boundingBox())!;
  expect(Math.round(sun.width)).toBeGreaterThanOrEqual(44);
  expect(Math.round(sun.height)).toBeGreaterThanOrEqual(44);

  // The info icons are 16px with an invisible 44px target around them.
  for (const name of ['About slope', 'About aspect', 'About elevation', 'How to read the net']) {
    const button = page.getByRole('button', { name });
    for (const [dx, dy] of [[21, 0], [-21, 0], [0, 21], [0, -21]]) {
      expect(await hitAt(button, dx, dy), `${name} at ${dx},${dy}`).toBe(true);
    }
  }
});

test('the retry button is a 44px target on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'touch sizes apply to touch screens');
  await page.route('**/dems/gore.tif', (route) => route.fulfill({ status: 404, body: 'missing' }));
  await page.goto('/');
  const retry = page.getByRole('button', { name: 'Try again' });
  expect(Math.round((await retry.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
});

test('every control can be reached by keyboard and shows a focus ring', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);

  const focused = () =>
    page.evaluate(() => {
      const element = document.activeElement as HTMLElement;
      // The sun draws its ring on the disc inside the 44px target.
      const ringed = element.querySelector('.sun__disc') ?? element;
      return {
        name: element.getAttribute('aria-label') ?? element.textContent ?? '',
        shadow: getComputedStyle(ringed).boxShadow,
      };
    });

  const seen: string[] = [];
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    const { name } = await focused();
    seen.push(name);
    // The ring is a 3px spread with no offset or blur. Some controls animate
    // to it from a resting shadow, so wait for it to arrive.
    await expect
      .poll(async () => (await focused()).shadow, { message: `focus ring on "${name}"` })
      .toMatch(/0px 0px 0px 3px/);
  }
  expect(seen).toEqual([
    'Gore Range',
    'Second',
    'How to read the net',
    'Sun. Arrow keys move the light; Home resets it.',
    'About slope',
    'About aspect',
    'About elevation',
    'Terrain. Drag, or use the arrow keys, to inspect a pixel.',
  ]);
});

test('with reduced motion the point jumps and nothing animates', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  const base = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--t-base').trim(),
  );
  expect(parseFloat(base)).toBe(0);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);

  const area = (await page.getByTestId('terrain-area').boundingBox())!;
  const at = (col: number, row: number) => ({
    x: area.x + ((col + 0.5) / 288) * area.width,
    y: area.y + ((row + 0.5) / 294) * area.height,
  });
  const markerX = async () => (await page.getByTestId('net-marker').boundingBox())!.x;

  await page.mouse.move(at(150, 210).x, at(150, 210).y);
  await page.mouse.down();
  const first = await markerX();
  await page.mouse.move(at(200, 230).x, at(200, 230).y);
  await expect(page.getByTestId('aspect')).toHaveText('35° NE');

  // No spring: the point is already at rest in its new place.
  const moved = await markerX();
  expect(moved).not.toBe(first);
  await page.waitForTimeout(300);
  expect(await markerX()).toBe(moved);
  await page.mouse.up();
});

test('uses one self-hosted typeface and no images from other sites', async ({ page }) => {
  const origins = new Set<string>();
  page.on('request', (request) => origins.add(new URL(request.url()).origin));
  await openApp(page);
  const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(family).toContain('Source Sans 3 Variable');
  await expect.poll(() => page.evaluate(() => document.fonts.check("16px 'Source Sans 3 Variable'"))).toBe(true);
  expect([...origins]).toEqual([new URL(page.url()).origin]);
});
