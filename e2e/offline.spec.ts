import { expect, test } from '@playwright/test';
import { APP_NAME, openApp, stage } from './helpers';

// The other tests block service workers so they can fake responses.
test.use({ serviceWorkers: 'allow' });

/** Runs in the page: true once the service worker has stored a URL containing `part`. */
async function isCached(part: string): Promise<boolean> {
  for (const name of await caches.keys()) {
    const cache = await caches.open(name);
    const requests = await cache.keys();
    if (requests.some((request) => request.url.includes(part))) return true;
  }
  return false;
}

test('opens and works with no network after one visit', async ({ page, context }) => {
  await openApp(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(isCached, 'dems.json')).toBe(true);
  // Every DEM in the list must be stored, whatever its size.
  const entries: Array<{ file: string }> = await page.evaluate(() =>
    fetch('dems/dems.json').then((response) => response.json()),
  );
  expect(entries.length).toBeGreaterThan(0);
  for (const entry of entries) {
    await expect.poll(() => page.evaluate(isCached, entry.file), `${entry.file} is stored`).toBe(true);
  }
  await expect.poll(() => page.evaluate(isCached, '.woff2')).toBe(true);
  // The link-preview image is for other sites to read; the app never shows it.
  expect(await page.evaluate(isCached, 'preview.png')).toBe(false);

  await context.setOffline(true);
  await page.reload();
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');

  const area = (await page.getByTestId('terrain-area').boundingBox())!;
  await page.mouse.click(area.x + area.width / 2, area.y + area.height / 2);
  await expect(page.getByTestId('slope')).toHaveText(/°$/);
});

test('can be installed: manifest, icons and a white status bar', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(new URL(href!, page.url()).toString())).json();

  expect(manifest.name).toBe(APP_NAME);
  expect(manifest.display).toBe('standalone');
  expect(manifest.theme_color).toBe('#ffffff');
  expect(manifest.background_color).toBe('#f7f5f1');
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(['192x192', '512x512', '512x512']);
  expect(manifest.icons[2].purpose).toBe('maskable');
  for (const icon of manifest.icons) {
    const response = await request.get(new URL(icon.src, new URL(href!, page.url())).toString());
    expect(response.ok()).toBe(true);
  }

  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#ffffff');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  await expect(page).toHaveTitle(APP_NAME);
});
