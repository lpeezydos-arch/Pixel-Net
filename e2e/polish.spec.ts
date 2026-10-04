import { type Locator, type Page, expect, test } from '@playwright/test';
import { NET_HELP, openApp, serveTwoDems, stage } from './helpers';

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
    // The page clips what overflows, so check that the net and its readout
    // lie inside the Net region itself.
    const inside = (box: { x: number; y: number; width: number; height: number }) => {
      expect(box.x).toBeGreaterThanOrEqual(a.x - 1);
      expect(box.y).toBeGreaterThanOrEqual(a.y - 1);
      expect(box.x + box.width).toBeLessThanOrEqual(a.x + a.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(a.y + a.height + 1);
    };
    inside(netBox);
    for (const id of ['slope', 'aspect', 'elevation']) {
      inside((await page.getByTestId(id).boundingBox())!);
    }
    expect(b.width / b.height).toBeCloseTo(288 / 294, 1);
  });
}

test('four DEMs with two-word names stay inside a phone screen', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const names = ['Gore Range', 'Second Peak', 'Third Basin', 'Fourth Ridge'];
  await page.route('**/dems/dems.json', (route) =>
    route.fulfill({
      json: names.map((name, i) => ({
        id: `dem-${i}`,
        name,
        place: `${name}, Colorado`,
        file: 'gore.tif',
      })),
    }),
  );
  await openApp(page);

  const width = 360;
  expect(Math.round((await page.getByRole('banner').boundingBox())!.width)).toBeLessThanOrEqual(width);
  const tabs = await page.getByRole('tab').all();
  expect(tabs).toHaveLength(4);
  for (const tab of tabs) {
    const box = (await tab.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    if (testInfo.project.name === 'phone') expect(Math.round(box.height)).toBeGreaterThanOrEqual(44);
  }
  const shareBox = (await page.getByTestId('share').boundingBox())!;
  expect(shareBox.x).toBeGreaterThanOrEqual(0);
  expect(shareBox.x + shareBox.width).toBeLessThanOrEqual(width);
  const helpBox = (await page.getByTestId('help').boundingBox())!;
  expect(helpBox.x).toBeGreaterThanOrEqual(shareBox.x + shareBox.width);
  expect(helpBox.x + helpBox.width).toBeLessThanOrEqual(width);
  for (const region of [net(page), terrain(page)]) {
    const box = (await region.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
  }
});

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

test('the loading shimmer is a circle on the net and follows the terrain card corners', async ({ page }) => {
  await page.route('**/dems/gore.tif', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });
  await page.goto('/');
  await expect(page.locator('.skeleton')).toHaveCount(2);
  const radius = (selector: string) =>
    page.locator(selector).evaluate((element) => getComputedStyle(element).borderTopLeftRadius);

  // A circle: the corner radius is at least half the box.
  const shimmer = (await page.locator('.net__skeleton').boundingBox())!;
  expect(parseFloat(await radius('.net__skeleton'))).toBeGreaterThanOrEqual(shimmer.width / 2);
  expect(await radius('.terrain__skeleton')).toBe(await radius('.terrain'));
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
  const shareBox = (await page.getByTestId('share').boundingBox())!;
  expect(Math.round(shareBox.width)).toBeGreaterThanOrEqual(44);
  expect(Math.round(shareBox.height)).toBeGreaterThanOrEqual(44);
  const helpBox = (await page.getByTestId('help').boundingBox())!;
  expect(Math.round(helpBox.width)).toBeGreaterThanOrEqual(44);
  expect(Math.round(helpBox.height)).toBeGreaterThanOrEqual(44);

  // The info icon is 16px with an invisible 44px target around it.
  const button = page.getByRole('button', { name: 'How to read the net' });
  for (const [dx, dy] of [[21, 0], [-21, 0], [0, 21], [0, -21]]) {
    expect(await hitAt(button, dx, dy), `info dot at ${dx},${dy}`).toBe(true);
  }

  // The density button is 28px with an invisible 44px target around it.
  const density = page.getByTestId('density-toggle');
  for (const [dx, dy] of [[21, 0], [-21, 0], [0, 21], [0, -21]]) {
    expect(await hitAt(density, dx, dy), `density button at ${dx},${dy}`).toBe(true);
  }
});

test('the info dot is help for the net, not a tab stop', async ({ page }) => {
  await openApp(page);
  await expect(page.getByRole('button', { name: 'How to read the net' })).toHaveAttribute('tabindex', '-1');
  await expect(page.getByRole('region', { name: 'Net' })).toHaveAccessibleDescription(NET_HELP);
});

test('the loading shimmer shows the net frame through it', async ({ page }) => {
  await page.route('**/dems/gore.tif', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });
  await page.goto('/');
  const shimmer = page.locator('.net__skeleton');
  await expect(shimmer).toBeVisible();
  expect(await shimmer.evaluate((element) => getComputedStyle(element).mixBlendMode)).toBe('multiply');
  await expect(page.locator('.net-frame circle')).toHaveCount(3);
});

test('the retry button is a 44px target on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'touch sizes apply to touch screens');
  await page.route('**/dems/gore.tif', (route) => route.fulfill({ status: 404, body: 'missing' }));
  await page.goto('/');
  const retry = page.getByRole('button', { name: 'Try again' });
  expect(Math.round((await retry.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
});

test('every control can be reached by keyboard, in reading order, and shows a focus ring', async ({ page }, testInfo) => {
  await serveTwoDems(page);
  await openApp(page);
  const sunName = 'Sun, 315° NW · 45° high. Arrow keys move the light; Home resets it.';
  const terrainName = 'Terrain. Drag, or use the arrow keys, to inspect a pixel.';
  const shareName = 'Share this view';
  const helpName = "Help and what's new, new changes";
  // Tab follows the eye: the title bar first, then the net above the terrain
  // on a phone and to the right of it on a desktop. The info dot is help, not a stop;
  // the density button is a control, and is one.
  const expected =
    testInfo.project.name === 'phone'
      ? ['Gore Range', 'Second', shareName, helpName, 'Density', sunName, terrainName]
      : ['Gore Range', 'Second', shareName, helpName, terrainName, 'Density', sunName];

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
  for (let i = 0; i < expected.length; i++) {
    await page.keyboard.press('Tab');
    const { name } = await focused();
    seen.push(name);
    // The ring is a 3px spread with no offset or blur. Some controls animate
    // to it from a resting shadow, so wait for it to arrive.
    await expect
      .poll(async () => (await focused()).shadow, { message: `focus ring on "${name}"` })
      .toMatch(/0px 0px 0px 3px/);
  }
  expect(seen).toEqual(expected);
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

test('makes every request to its own origin and uses the self-hosted typeface', async ({ page }) => {
  const origins = new Set<string>();
  page.on('request', (request) => origins.add(new URL(request.url()).origin));
  await openApp(page);
  const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(family).toContain('Source Sans 3 Variable');
  await expect.poll(() => page.evaluate(() => document.fonts.check("16px 'Source Sans 3 Variable'"))).toBe(true);
  expect([...origins]).toEqual([new URL(page.url()).origin]);
});
