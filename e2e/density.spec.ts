import { type Page, expect, test } from '@playwright/test';
import { NET_HELP, chooseDem, clickPixel, fingerprint, inkedPixels, netCloud, openApp, openLink, serveTwoDems, stage } from './helpers';

/** The rim's radius as a share of half the net's square, as in `src/terrain/cloud.ts`. */
const NET_RIM = 0.9375;
const SAVED = 'pixel-net:view';
const SENTENCE =
  'Blue shading shows where pixels crowd together, counted in circles covering 1% of the net. The outer line is 2 times an even spread, and each line inward adds 1 more.';
const GORE_KEY = '2× to 6× even';
// The second DEM is one uniform slope, so nearly every pixel falls in one circle.
const SECOND_KEY = '20× to 80× even';

const toggle = (page: Page) => page.getByTestId('density-toggle');
const layer = (page: Page) => page.getByTestId('density-layer');
const drawing = (page: Page) => page.getByTestId('net-density');
const key = (page: Page) => page.getByTestId('density-key');
const fragment = (page: Page) => page.evaluate(() => window.location.hash);
const saved = (page: Page) => page.evaluate((name) => window.localStorage.getItem(name), SAVED);

test('the density button turns the layer on and off', async ({ page }) => {
  await openApp(page);
  const cloud = await fingerprint(netCloud(page));
  await expect(toggle(page)).toHaveAccessibleName('Density');
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(layer(page)).toHaveAttribute('data-on', 'false');
  expect(await inkedPixels(drawing(page))).toBe(0);
  await expect(key(page)).toHaveCount(0);

  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(layer(page)).toHaveAttribute('data-on', 'true');
  await expect(layer(page)).toHaveCSS('opacity', '1');
  expect(await inkedPixels(drawing(page))).toBeGreaterThan(1000);
  await expect(key(page)).toHaveText(GORE_KEY);
  await expect(key(page)).toHaveCSS('opacity', '1');
  // The cloud is not redrawn: the layer is a sheet over it.
  expect(await fingerprint(netCloud(page))).toBe(cloud);

  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(layer(page)).toHaveCSS('opacity', '0');
  await expect(key(page)).toHaveCSS('opacity', '0');
  await expect(key(page)).toHaveAttribute('aria-hidden', 'true');
});

test('the layer is drawn in the blue of the tokens, the size of the cloud', async ({ page }) => {
  await openApp(page);
  await toggle(page).click();
  await expect(layer(page)).toHaveCSS('opacity', '1');
  // A line is nearly opaque, so its color survives the canvas's rounding.
  const [red, green, blue] = await drawing(page).evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 200) return [data[i - 3], data[i - 2], data[i - 1]];
    return [-1, -1, -1];
  });
  expect(red).toBeLessThanOrEqual(3);
  expect(Math.abs(green - 114)).toBeLessThanOrEqual(3);
  expect(Math.abs(blue - 178)).toBeLessThanOrEqual(3);
  const cloudWidth = await netCloud(page).evaluate((element) => (element as HTMLCanvasElement).width);
  await expect(drawing(page)).toHaveJSProperty('width', cloudWidth);
  await expect(drawing(page)).toHaveJSProperty('height', cloudWidth);
});

test('the net’s explanation says what the layer shows while it is on', async ({ page }) => {
  await openApp(page);
  const net = page.getByRole('region', { name: 'Net' });
  await expect(net).toHaveAccessibleDescription(NET_HELP);
  await toggle(page).click();
  await page.mouse.move(0, 0); // off the button, so its own tooltip is not the one that shows
  await expect(net).toHaveAccessibleDescription(`${NET_HELP} ${SENTENCE}`);
  await page.getByRole('button', { name: 'How to read the net' }).focus();
  await expect(page.locator('.tooltip')).toHaveText(`${NET_HELP} ${SENTENCE}`);
  await page.keyboard.press('Escape');
  await toggle(page).click();
  await expect(net).toHaveAccessibleDescription(NET_HELP);
});

test('the layer is remembered, in the address and on the device', async ({ page }) => {
  await openApp(page);
  await toggle(page).click();
  await expect.poll(() => fragment(page)).toBe('#dem=gore&density=1');
  await expect.poll(() => saved(page)).toBe('dem=gore&density=1');

  await page.reload();
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(layer(page)).toHaveCSS('opacity', '1');
  await expect(key(page)).toHaveText(GORE_KEY);

  await toggle(page).click();
  await expect.poll(() => fragment(page)).toBe('');
  await expect.poll(() => saved(page)).toBeNull();
});

test('a link with density=1 opens with the layer on', async ({ page }) => {
  await openLink(page, 'dem=gore&density=1');
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(layer(page)).toHaveAttribute('data-on', 'true');
  await expect.poll(() => inkedPixels(drawing(page))).toBeGreaterThan(1000);
  await expect(key(page)).toHaveText(GORE_KEY);
});

test('a link without it opens with the layer off', async ({ page }) => {
  await openLink(page, 'dem=gore&px=150,210&sun=120,35');
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(layer(page)).toHaveAttribute('data-on', 'false');
});

test('the layer stays on when the DEM changes, and shows the new DEM', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);
  await toggle(page).click();
  await expect(key(page)).toHaveText(GORE_KEY);
  const gore = await fingerprint(drawing(page));

  await chooseDem(page, 'Second');
  await expect(stage(page)).toHaveAttribute('data-dem', 'second');
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(key(page)).toHaveText(SECOND_KEY);
  await expect.poll(() => fingerprint(drawing(page))).not.toBe(gore);
  await expect.poll(() => fragment(page)).toBe('#dem=second&density=1');
});

test('a layer turned on after the DEM changed shows the new DEM, never the old', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);
  await toggle(page).click();
  await expect(key(page)).toHaveText(GORE_KEY);
  const gore = await fingerprint(drawing(page));
  await toggle(page).click();
  await expect(layer(page)).toHaveCSS('opacity', '0');

  await chooseDem(page, 'Second');
  await expect(stage(page)).toHaveAttribute('data-dem', 'second');
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  // The second DEM has not been counted, so the key has nothing to say yet.
  await expect(key(page)).toHaveCount(0);

  await toggle(page).click();
  await expect(key(page)).toHaveText(SECOND_KEY);
  expect(await fingerprint(drawing(page))).not.toBe(gore);
});

test('the layer is redrawn at the cloud’s size when the window changes', async ({ page }) => {
  await openApp(page);
  await toggle(page).click();
  await expect(layer(page)).toHaveCSS('opacity', '1');
  const before = await drawing(page).evaluate((element) => (element as HTMLCanvasElement).width);

  await page.setViewportSize({ width: 320, height: 480 });
  await expect
    .poll(() => netCloud(page).evaluate((element) => (element as HTMLCanvasElement).width))
    .not.toBe(before);
  const cloudWidth = await netCloud(page).evaluate((element) => (element as HTMLCanvasElement).width);
  await expect(drawing(page)).toHaveJSProperty('width', cloudWidth);
  expect(await inkedPixels(drawing(page))).toBeGreaterThan(500);
});

/** The button and the key in the net's corners, clear of the rim, at the window's present size. */
async function checkCorners(page: Page, expectedKey: string) {
  await openApp(page);
  await toggle(page).click();
  await expect(key(page)).toHaveCSS('opacity', '1');
  await expect(key(page)).toHaveText(expectedKey);
  const net = (await page.getByTestId('net').boundingBox())!;
  const centerX = net.x + net.width / 2;
  const centerY = net.y + net.height / 2;
  const rim = (net.width / 2) * NET_RIM;
  const inside = (box: { x: number; y: number; width: number; height: number }) => {
    expect(box.x).toBeGreaterThanOrEqual(net.x - 0.5);
    expect(box.y).toBeGreaterThanOrEqual(net.y - 0.5);
    expect(box.x + box.width).toBeLessThanOrEqual(net.x + net.width + 0.5);
    expect(box.y + box.height).toBeLessThanOrEqual(net.y + net.height + 0.5);
  };

  // The button is in the top-right corner: its nearest point to the center is its bottom-left.
  const button = (await toggle(page).boundingBox())!;
  inside(button);
  expect(Math.round(button.x + button.width)).toBe(Math.round(net.x + net.width));
  expect(Math.round(button.y)).toBe(Math.round(net.y));
  expect(Math.hypot(button.x - centerX, button.y + button.height - centerY)).toBeGreaterThan(rim);

  // The key is in the bottom-left corner: its nearest point to the center is its top-right.
  const words = (await key(page).boundingBox())!;
  inside(words);
  expect(Math.round(words.x)).toBe(Math.round(net.x));
  expect(Math.round(words.y + words.height)).toBe(Math.round(net.y + net.height));
  expect(Math.hypot(words.x + words.width - centerX, words.y - centerY)).toBeGreaterThan(rim);
}

test('the button and the key sit in the net’s corners, clear of the rim', async ({ page }) => {
  await checkCorners(page, GORE_KEY);
});

/** Whether two boxes share any area. */
const overlap = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) => a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5 && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5;

// On an upright iPhone in Safari the net is 180px, and the full key would
// cross its rim. There the readout is beside the net, and the key is its last line.
for (const size of [
  { width: 320, height: 480 },
  { width: 390, height: 660 },
  { width: 667, height: 375 },
]) {
  test(`on a ${size.width} × ${size.height} screen the key is the last line of the readout, in full`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await openApp(page);
    const slopeLabel = page.locator('.stat__label', { hasText: 'Slope' });
    const resting = (await slopeLabel.boundingBox())!;
    await toggle(page).click();
    await expect(key(page)).toHaveText(GORE_KEY);
    await expect(key(page)).toHaveCSS('opacity', '1');

    const check = async () => {
      const card = (await page.getByRole('region', { name: 'Net' }).boundingBox())!;
      const net = (await page.getByTestId('net').boundingBox())!;
      const words = (await key(page).boundingBox())!;
      const elevation = (await page.getByTestId('elevation').boundingBox())!;
      const label = (await slopeLabel.boundingBox())!;
      // Inside the card, beside the net, under the last value.
      expect(words.x).toBeGreaterThanOrEqual(net.x + net.width);
      expect(words.x + words.width).toBeLessThanOrEqual(card.x + card.width + 0.5);
      expect(words.y + words.height).toBeLessThanOrEqual(net.y + net.height + 0.5);
      expect(words.y).toBeGreaterThanOrEqual(elevation.y + elevation.height - 0.5);
      // The three values made room without leaving the card's content area.
      expect(label.y).toBeGreaterThanOrEqual(net.y - 0.5);
      for (const id of ['slope', 'aspect', 'elevation']) {
        expect(overlap(words, (await page.getByTestId(id).boundingBox())!), `key over ${id}`).toBe(false);
      }
    };
    // Wait for the values to finish moving before measuring.
    await expect
      .poll(async () => {
        const elevation = (await page.getByTestId('elevation').boundingBox())!;
        return (await key(page).boundingBox())!.y - (elevation.y + elevation.height);
      })
      .toBeGreaterThanOrEqual(-0.5);
    await check();

    // A selected pixel's values are as tall as the dashes they replace, and wider.
    await clickPixel(page, 150, 210);
    await expect(page.getByTestId('elevation')).toHaveText('3,874 m');
    await check();

    // With the layer off the values go back where they were.
    await toggle(page).click();
    await expect(key(page)).toHaveCSS('opacity', '0');
    await expect.poll(async () => Math.abs((await slopeLabel.boundingBox())!.y - resting.y)).toBeLessThan(0.5);
  });
}

test('the button can be pressed on a small net with the sun low in the northeast', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await openLink(page, 'dem=gore&sun=45,10');
  // The sun's 44px target reaches the button's corner here. A click that the sun took would fail.
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
});

test('the button works from the keyboard', async ({ page }) => {
  await openApp(page);
  await toggle(page).focus();
  await page.keyboard.press('Space');
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Enter');
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
});

test('the button is named by its tooltip', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'a touch screen has no hover');
  await openApp(page);
  await toggle(page).hover();
  await expect(page.locator('.tooltip')).toHaveText('Density');
});

test('with reduced motion the layer appears at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  await toggle(page).click();
  expect(await layer(page).evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
  expect(await layer(page).evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('0s');
});

test('there is no density button on the error card', async ({ page }) => {
  await page.route('**/dems/gore.tif', (route) => route.fulfill({ status: 404 }));
  await page.goto('/#dem=gore&density=1');
  await expect(stage(page)).toHaveAttribute('data-status', 'error');
  await expect(toggle(page)).toHaveCount(0);
  await expect(layer(page)).toHaveCount(0);
});

test('the sun can still be dragged on a small net when it is low in the northeast', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await openLink(page, 'dem=gore&sun=45,10');
  const box = (await page.getByTestId('sun').boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 40, y + 40, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => fragment(page)).not.toContain('sun=45,10');
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
});

/** Starts recording the animations begun on the layer's canvas, from before the page's scripts run. */
async function recordLayerAnimations(page: Page) {
  await page.addInitScript(() => {
    const calls: string[] = [];
    (window as unknown as { layerAnimations: string[] }).layerAnimations = calls;
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (this: Element, ...args: Parameters<Element['animate']>) {
      if (this.getAttribute('data-testid') === 'net-density') calls.push('animate');
      return animate.apply(this, args);
    } as typeof animate;
  });
}
const layerAnimations = (page: Page) =>
  page.evaluate(() => (window as unknown as { layerAnimations: unknown[] }).layerAnimations.length);

test('a link with density=1 fades the layer in with the cloud', async ({ page }) => {
  await recordLayerAnimations(page);
  await page.goto('/#dem=gore&density=1');
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(layer(page)).toHaveAttribute('data-on', 'true');
  expect(await layerAnimations(page)).toBe(1);
});

test('pressing the button starts no fade of its own on the layer’s canvas', async ({ page }) => {
  await recordLayerAnimations(page);
  await openApp(page);
  await toggle(page).click();
  await expect(layer(page)).toHaveCSS('opacity', '1');
  expect(await inkedPixels(drawing(page))).toBeGreaterThan(1000);
  expect(await layerAnimations(page)).toBe(0);
});
