import { readFileSync } from 'node:fs';
import { type Page, expect, test } from '@playwright/test';
import { caption, hint, openApp, stage } from './helpers';

// The list is read as a file: the app's module imports it as JSON, which
// Playwright's loader does not take.
const NEWS: { id: number; date: string; text: string }[] = JSON.parse(
  readFileSync('src/help/news.json', 'utf8'),
);
const NEWEST = NEWS[NEWS.length - 1].id;
const SHOWN = NEWS.slice(-3).reverse();
const SEEN = 'pixel-net:news-seen';

const NAME = "Help and what's new";
const NAME_WITH_NEWS = "Help and what's new, new changes";

const help = (page: Page) => page.getByTestId('help');
const dot = (page: Page) => page.getByTestId('help-dot');
const sheet = (page: Page) => page.getByTestId('help-sheet');
const howTo = (page: Page) => page.getByTestId('help-how').getByRole('listitem');
const news = (page: Page) => page.getByTestId('help-news').getByRole('listitem');
const remembered = (page: Page) => page.evaluate((key) => window.localStorage.getItem(key), SEEN);
const remember = (page: Page, value: string) =>
  page.addInitScript(([key, seen]) => window.localStorage.setItem(key, seen), [SEEN, value]);

test('a device that has shown nothing gets the dot, and opening the sheet clears it for good', async ({ page }) => {
  await openApp(page);
  await expect(dot(page)).toBeVisible();
  await expect(help(page)).toHaveAttribute('aria-label', NAME_WITH_NEWS);

  await help(page).click();
  await expect(sheet(page)).toBeVisible();
  await expect(dot(page)).toHaveCount(0);
  await expect(help(page)).toHaveAttribute('aria-label', NAME);
  expect(await remembered(page)).toBe(String(NEWEST));

  await page.reload();
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(dot(page)).toHaveCount(0);
  await expect(help(page)).toHaveAttribute('aria-label', NAME);
});

test('the sheet is a dialog named Help with the two parts', async ({ page }, testInfo) => {
  await openApp(page);
  await help(page).click();

  const dialog = page.getByRole('dialog', { name: 'Help' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'How to use it' })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: "What's new" })).toBeVisible();

  // The first line names the gesture the screen has, as the caption does.
  await expect(howTo(page)).toHaveCount(6);
  await expect(howTo(page).first()).toHaveText(`${hint(testInfo.project.name)}.`);
  await expect(howTo(page).nth(1)).toHaveText(
    testInfo.project.name === 'phone'
      ? 'Double-tap the terrain to clear it.'
      : 'Arrow keys move one pixel, and Shift moves ten; Escape clears it.',
  );

  // The latest three, newest first, each with its date for assistive technology.
  await expect(news(page)).toHaveCount(SHOWN.length);
  for (const [i, entry] of SHOWN.entries()) {
    await expect(news(page).nth(i)).toContainText(entry.text);
    await expect(news(page).nth(i).locator('time')).toHaveAttribute('datetime', entry.date);
  }
});

test('on a device that has shown nothing, every entry is marked new while the sheet is open', async ({ page }) => {
  await openApp(page);
  await help(page).click();
  for (let i = 0; i < SHOWN.length; i++) {
    await expect(news(page).nth(i)).toHaveAttribute('data-new', 'true');
    await expect(news(page).nth(i)).toContainText('New. ');
  }

  // The marks are for this opening only.
  await page.keyboard.press('Escape');
  await expect(sheet(page)).toBeHidden();
  await help(page).click();
  for (let i = 0; i < SHOWN.length; i++) {
    await expect(news(page).nth(i)).toHaveAttribute('data-new', 'false');
  }
});

test('a device that has shown all but the newest entry gets the dot and one mark', async ({ page }) => {
  await remember(page, String(NEWEST - 1));
  await openApp(page);
  await expect(dot(page)).toBeVisible();

  await help(page).click();
  await expect(news(page).first()).toHaveAttribute('data-new', 'true');
  for (let i = 1; i < SHOWN.length; i++) {
    await expect(news(page).nth(i)).toHaveAttribute('data-new', 'false');
    await expect(news(page).nth(i)).not.toContainText('New. ');
  }
});

test('a device that has shown everything gets no dot and no marks', async ({ page }) => {
  await remember(page, String(NEWEST));
  await openApp(page);
  await expect(dot(page)).toHaveCount(0);
  await expect(help(page)).toHaveAttribute('aria-label', NAME);

  await help(page).click();
  await expect(sheet(page).locator('[data-new="true"]')).toHaveCount(0);
});

test('a remembered value higher than any entry gives no dot and is left alone', async ({ page }) => {
  await remember(page, '9999');
  await openApp(page);
  await expect(dot(page)).toHaveCount(0);

  await help(page).click();
  await expect(sheet(page)).toBeVisible();
  expect(await remembered(page)).toBe('9999');
});

for (const junk of ['abc', '-1', '1.5']) {
  test(`a remembered value of "${junk}" reads as nothing shown`, async ({ page }) => {
    await remember(page, junk);
    await openApp(page);
    await expect(dot(page)).toBeVisible();
    await help(page).click();
    await expect(news(page).first()).toHaveAttribute('data-new', 'true');
  });
}

test('with storage closed to the app, the dot clears for the visit and comes back on the next', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const refuse = () => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    };
    Storage.prototype.getItem = refuse;
    Storage.prototype.setItem = refuse;
    Storage.prototype.removeItem = refuse;
  });
  await openApp(page);
  await expect(dot(page)).toBeVisible();

  await help(page).click();
  await expect(sheet(page)).toBeVisible();
  await expect(dot(page)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(sheet(page)).toBeHidden();
  await expect(dot(page)).toHaveCount(0);

  await page.reload();
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(dot(page)).toBeVisible();
  expect(errors).toEqual([]);
});

test('Escape closes the sheet and returns focus to the help button', async ({ page }) => {
  await openApp(page);
  await help(page).click();
  // Focus moves into the sheet when it opens.
  await expect(page.getByRole('button', { name: 'Close' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(sheet(page)).toBeHidden();
  await expect(help(page)).toBeFocused();
});

test('the close button closes the sheet and returns focus to the help button', async ({ page }) => {
  await openApp(page);
  await help(page).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(sheet(page)).toBeHidden();
  await expect(help(page)).toBeFocused();
});

test('the close button is a 44px target on a touch screen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'A mouse gets the 40px button.');
  await openApp(page);
  await help(page).click();
  const box = (await page.getByRole('button', { name: 'Close' }).boundingBox())!;
  expect(Math.round(box.width)).toBeGreaterThanOrEqual(44);
  expect(Math.round(box.height)).toBeGreaterThanOrEqual(44);
});

test('a press on the dimmed view closes the sheet and selects nothing', async ({ page }, testInfo) => {
  await openApp(page);
  await help(page).click();
  await expect(sheet(page)).toBeVisible();

  // A point on a card and clear of the sheet: the net at the top of a phone,
  // the terrain at the left of a desktop.
  const target = testInfo.project.name === 'phone' ? page.getByTestId('net-cloud') : page.getByTestId('terrain-area');
  const box = (await target.boundingBox())!;
  const sheetBox = (await sheet(page).boundingBox())!;
  const point = { x: box.x + 24, y: box.y + 24 };
  const inSheet =
    point.x >= sheetBox.x &&
    point.x <= sheetBox.x + sheetBox.width &&
    point.y >= sheetBox.y &&
    point.y <= sheetBox.y + sheetBox.height;
  expect(inSheet, 'the test point must be outside the sheet').toBe(false);

  await page.mouse.click(point.x, point.y);
  await expect(sheet(page)).toBeHidden();
  await expect(help(page)).toBeFocused();
  // The press went to the sheet, not through it.
  await expect(page.getByTestId('selection-ring')).toHaveAttribute('data-visible', 'false');
  await expect(caption(page)).toHaveText(hint(testInfo.project.name));
});

test('the tooltip does not open when the sheet hands focus back', async ({ page }) => {
  await openApp(page);
  for (const close of [
    () => page.keyboard.press('Escape'),
    () => page.getByRole('button', { name: 'Close' }).click(),
  ]) {
    await help(page).click();
    await expect(sheet(page)).toBeVisible();
    await close();
    await expect(sheet(page)).toBeHidden();
    await expect(help(page)).toBeFocused();
    // Longer than the tooltip's delay.
    await page.waitForTimeout(500);
    await expect(page.locator('.tooltip')).toHaveCount(0);
  }
});

test('a mouse over the help button shows its name', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'A touch screen has no hover.');
  await openApp(page);
  await help(page).hover();
  await expect(page.locator('.tooltip')).toHaveText(NAME);
});

test('the help button works while the DEM cannot be loaded', async ({ page }) => {
  await page.route('**/dems/gore.tif', (route) => route.abort());
  await page.goto('/');
  await expect(stage(page)).toHaveAttribute('data-status', 'error');

  await expect(help(page)).toBeEnabled();
  await help(page).click();
  await expect(sheet(page)).toBeVisible();
  await expect(howTo(page)).toHaveCount(6);
});

test('the help button sits after the share button and is a 44px target on a touch screen', async ({ page }, testInfo) => {
  await openApp(page);
  const shareBox = (await page.getByTestId('share').boundingBox())!;
  const helpBox = (await help(page).boundingBox())!;
  expect(helpBox.x).toBeGreaterThanOrEqual(shareBox.x + shareBox.width);
  expect(helpBox.x + helpBox.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  if (testInfo.project.name === 'phone') {
    expect(Math.round(helpBox.width)).toBeGreaterThanOrEqual(44);
    expect(Math.round(helpBox.height)).toBeGreaterThanOrEqual(44);
  }
});

/** Waits until the sheet has finished moving. */
const settled = (page: Page) =>
  sheet(page).evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));

/** Opens the sheet and checks that all of it is on the screen and nothing scrolls. */
async function expectSheetFits(page: Page) {
  await help(page).click();
  await expect(sheet(page)).toBeVisible();
  await settled(page);

  const viewport = page.viewportSize()!;
  const box = (await sheet(page).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 0.5);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 0.5);

  const overflow = await sheet(page).evaluate((element) => ({
    sheet: element.scrollHeight - element.clientHeight,
    page: document.documentElement.scrollHeight - window.innerHeight,
    wide: document.documentElement.scrollWidth - window.innerWidth,
  }));
  expect(overflow.sheet).toBeLessThanOrEqual(0);
  expect(overflow.page).toBeLessThanOrEqual(0);
  expect(overflow.wide).toBeLessThanOrEqual(0);

  // Every line is inside the sheet, not hanging out of it.
  for (const item of [...(await howTo(page).all()), ...(await news(page).all())]) {
    const line = (await item.boundingBox())!;
    expect(line.x).toBeGreaterThanOrEqual(box.x);
    expect(line.x + line.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
    expect(line.y + line.height).toBeLessThanOrEqual(box.y + box.height + 0.5);
  }
  return box;
}

const parts = (page: Page) => sheet(page).locator('.sheet__part');

test('on an upright phone the sheet stands on the bottom edge and spans the screen', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 839 });
  await openApp(page);
  const box = await expectSheetFits(page);
  expect(Math.round(box.x)).toBe(0);
  expect(Math.round(box.width)).toBe(412);
  expect(Math.round(box.y + box.height)).toBe(839);
  // The parts are stacked.
  const [how, whatsNew] = [(await parts(page).nth(0).boundingBox())!, (await parts(page).nth(1).boundingBox())!];
  expect(whatsNew.y).toBeGreaterThanOrEqual(how.y + how.height);
});

test('the sheet fits a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await openApp(page);
  await expectSheetFits(page);
});

test('on a desktop the sheet is a 420px card in the middle of the window', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openApp(page);
  const box = await expectSheetFits(page);
  expect(Math.round(box.width)).toBe(420);
  expect(Math.abs(box.x + box.width / 2 - 640)).toBeLessThanOrEqual(1);
  expect(Math.abs(box.y + box.height / 2 - 400)).toBeLessThanOrEqual(1);
});

for (const size of [
  { width: 839, height: 412 },
  { width: 640, height: 360 },
]) {
  test(`on a sideways phone, ${size.width} × ${size.height}, the two parts sit side by side`, async ({ page }) => {
    await page.setViewportSize(size);
    await openApp(page);
    await expectSheetFits(page);
    const [how, whatsNew] = [(await parts(page).nth(0).boundingBox())!, (await parts(page).nth(1).boundingBox())!];
    expect(Math.abs(how.y - whatsNew.y)).toBeLessThanOrEqual(1);
    expect(whatsNew.x).toBeGreaterThanOrEqual(how.x + how.width);
  });
}

test('turning the phone while the sheet is open rearranges it, and it still fits', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 839 });
  await openApp(page);
  await expectSheetFits(page);

  await page.setViewportSize({ width: 839, height: 412 });
  await expect(sheet(page)).toBeVisible();
  const box = (await sheet(page).boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(412.5);
  expect(box.x + box.width).toBeLessThanOrEqual(839.5);
  const [how, whatsNew] = [(await parts(page).nth(0).boundingBox())!, (await parts(page).nth(1).boundingBox())!];
  expect(Math.abs(how.y - whatsNew.y)).toBeLessThanOrEqual(1);

  // And back.
  await page.setViewportSize({ width: 412, height: 839 });
  // Changing arrangement swaps the sheet's animation for another, so let that one finish.
  await settled(page);
  const upright = (await sheet(page).boundingBox())!;
  expect(Math.round(upright.y + upright.height)).toBe(839);
});

test('the sheet moves into place, and with reduced motion it does not move', async ({ page }) => {
  await openApp(page);
  await help(page).click();
  const moving = await sheet(page).evaluate((element) => getComputedStyle(element).animationName);
  expect(moving).not.toBe('none');
  await page.keyboard.press('Escape');
  await expect(sheet(page)).toBeHidden();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await help(page).click();
  await expect(sheet(page)).toBeVisible();
  expect(await sheet(page).evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  expect(await page.locator('.scrim').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  // With nothing to wait for, it is gone at once.
  await page.keyboard.press('Escape');
  await expect(sheet(page)).toHaveCount(0);
});
