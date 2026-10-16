import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

// Analytics load only in a build made with VITE_GA_ID set, which this one is not.
test('a build with no measurement ID loads no tag and asks nothing of Google', async ({ page }) => {
  const google: string[] = [];
  page.on('request', (request) => {
    if (/google/i.test(new URL(request.url()).hostname)) google.push(request.url());
  });
  await openApp(page);
  const area = (await page.getByTestId('terrain-area').boundingBox())!;
  await page.mouse.click(area.x + area.width / 2, area.y + area.height / 2);
  await expect(page.getByTestId('slope')).toHaveText(/°$/);
  expect(await page.evaluate(() => 'gtag' in window)).toBe(false);
  expect(google).toEqual([]);
});
