// Draws the link-preview image: the app at 1200 × 630 with a pixel selected.
// Run with `npm run preview-image`. It builds the app, and needs Playwright's
// Chromium, as the browser tests do.
import { chromium } from '@playwright/test';
import { build, preview } from 'vite';

const WIDTH = 1200;
const HEIGHT = 630;
// A west-facing slope of the Gore Range, opened by its link.
const VIEW = 'dem=gore&px=150,210';

await build({ logLevel: 'warn' });
const server = await preview({ logLevel: 'warn', preview: { port: 4179, strictPort: true } });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    // The picture is of this build, not of anything a service worker kept.
    serviceWorkers: 'block',
  });
  await page.goto(`${server.resolvedUrls.local[0]}#${VIEW}`);
  await page.locator('main[data-status="ready"]').waitFor();
  // The net point is a zero-size anchor, which Playwright never counts as
  // visible; its own attribute says when it is shown.
  await page.locator('[data-testid="net-marker"][data-visible="true"]').waitFor({ state: 'attached' });
  await page.evaluate(() => document.fonts.ready);
  // Let the cloud fade in and the point finish its pulse.
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'public/preview.png' });
  console.log('public/preview.png');
} finally {
  await browser.close();
  await server.close();
}
