// Draws each DEM's thumbnail for the picker: public/dems/<id>.png, the
// hillshade at the default sun with its shorter side 360px. Run with
// `npm run thumbs` after adding a DEM. It builds the app and reads the
// terrain's own canvas, so the picture is the app's shading and nothing else;
// like the browser tests, it needs Playwright's Chromium.
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { build, preview } from 'vite';

const SHORT_SIDE = 360; // twice a tile in the desktop card, and more than a tile at any size
const FOLDER = 'public/dems/';
// The app shows only the first four entries (MAX_DEMS in src/state/useDems.ts);
// a fifth would make this wait for a DEM the app never opens.
const entries = JSON.parse(readFileSync(`${FOLDER}dems.json`, 'utf8')).slice(0, 4);

await build({ logLevel: 'warn' });
// 4178 is beside make-preview.mjs's 4179 and clear of the tests' 4173.
const server = await preview({ logLevel: 'warn', preview: { port: 4178, strictPort: true } });
const browser = await chromium.launch();
try {
  for (const entry of entries) {
    // A new context each time: nothing saved, so the sun is at its default.
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    await page.goto(`${server.resolvedUrls.local[0]}#dem=${entry.id}`);
    await page.locator(`main[data-status="ready"][data-dem="${entry.id}"]`).waitFor();
    const canvas = page.locator('[data-testid="terrain-image"]');
    // A canvas is blank until the hillshade is drawn on it; wait for the first pixel.
    await page.waitForFunction(() => {
      const element = document.querySelector('[data-testid="terrain-image"]');
      if (!(element instanceof HTMLCanvasElement) || element.width === 0) return false;
      const data = element.getContext('2d').getImageData(0, 0, element.width, element.height).data;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 0) return true;
      return false;
    });
    const url = await canvas.evaluate((element, shortSide) => {
      const scale = shortSide / Math.min(element.width, element.height);
      const out = document.createElement('canvas');
      out.width = Math.round(element.width * scale);
      out.height = Math.round(element.height * scale);
      const context = out.getContext('2d');
      context.imageSmoothingQuality = 'high';
      context.drawImage(element, 0, 0, out.width, out.height);
      return out.toDataURL('image/png');
    }, SHORT_SIDE);
    writeFileSync(`${FOLDER}${entry.id}.png`, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
    console.log(`${FOLDER}${entry.id}.png`);
    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
}
