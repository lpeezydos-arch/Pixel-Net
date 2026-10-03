import { expect, test } from '@playwright/test';
import { APP_NAME, SITE_URL } from './helpers';

test('a pasted link shows a card: title, description and image', async ({ page }) => {
  await page.goto('/');
  const property = (name: string) => page.locator(`meta[property="${name}"]`);
  await expect(property('og:type')).toHaveAttribute('content', 'website');
  await expect(property('og:title')).toHaveAttribute('content', APP_NAME);
  await expect(property('og:description')).toHaveAttribute(
    'content',
    'A hillshade and a Schmidt net of every pixel in a DEM.',
  );
  // Preview tags are read by other sites, so they need whole addresses.
  expect(SITE_URL).toMatch(/^https:\/\/.+\/$/);
  await expect(property('og:url')).toHaveAttribute('content', SITE_URL);
  await expect(property('og:image')).toHaveAttribute('content', `${SITE_URL}preview.png`);
  await expect(property('og:image:width')).toHaveAttribute('content', '1200');
  await expect(property('og:image:height')).toHaveAttribute('content', '630');
  await expect(property('og:image:alt')).toHaveAttribute('content', /Gore Range/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
});

test('the preview image is a 1200 × 630 PNG', async ({ request }) => {
  const response = await request.get('/preview.png');
  expect(response.ok()).toBe(true);
  const png = await response.body();
  expect(png.subarray(1, 4).toString('latin1')).toBe('PNG');
  // A PNG's header gives its width at byte 16 and its height at byte 20.
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
});
