# A Second DEM and a New Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Massanutten Mountain as a second sample DEM, and replace the segmented control with the DEM's name as a button that opens a sheet of tiles.

**Architecture:** A new `DemPicker` holds the button and a Radix dialog; a new `DemSheet` holds the tiles and reuses the `.sheet` and `.scrim` styles Help uses. Thumbnails are static PNGs beside the DEMs, made by a script that reads the app's own terrain canvas. `useDems`, the address and the saved view do not change.

**Tech Stack:** React 19, TypeScript, `@radix-ui/react-dialog`, `lucide-react`, plain CSS with the tokens in `src/styles/tokens.css`, Vitest (node), Playwright (Chromium; projects `phone` = Pixel 7 and `desktop` = 1280 × 800).

**Spec:** `docs/superpowers/specs/2026-10-04-second-dem-and-picker-design.md`. Read it before starting a task.

## Global Constraints

- No new dependencies.
- Colors, sizes, radii, shadows and durations come from `src/styles/tokens.css`. Do not edit that file.
- Touch targets are at least 44px on a touch screen (`@media (pointer: coarse)`, `--touch`).
- The sheet never scrolls. At most four DEMs are shown (`MAX_DEMS` in `src/state/useDems.ts` stays 4).
- Copy is plain, one sentence at a time. Exact strings: the dialog is named `DEM`; the button is named `DEM: <name>`; the news entry is `A second landscape, Massanutten Mountain in Virginia. Press the DEM's name to switch.`
- A tile's line is `<region> · <cell> m`, as in `Virginia · 100 m`. A part the entry does not give is left out.
- A thumbnail is `public/dems/<id>.png`, shorter side 360px, at the default sun (azimuth 315°, height 45°).
- Comments say why, in plain sentences, as the surrounding code does. No comment restates the code.
- Commit messages are one plain sentence in the imperative, as in `git log`. Each ends with the line `Claude-Session: https://claude.ai/code/session_01HWQbiQgX3NUxBSmC3SRion`.
- Commands: unit tests `npx vitest run <file>`; types `npx tsc --noEmit`; browser tests `npx playwright test <file>` (this builds the app first, so allow two minutes).

## Review Focus

1. A DEM whose file fails to load after its tile is pressed: the error card shows, and the DEM button still opens the sheet so the user can go back. Test in Task 2, `e2e/picker.spec.ts`.
2. A list entry with a `cell` or `region` of the wrong kind (`"5"`, `0`, `-1`, `NaN`, `""`): the tile shows no `undefined m` or `NaN m`; the bad part is left out. Test in Task 1, `src/terrain/format.test.ts`.
3. A thumbnail that is missing: the tile shows a plain `--sunken` square with no broken-image mark, and still works. Test in Task 2, `e2e/picker.spec.ts`.
4. A DEM name too long for a 320px title bar: the name is cut with an ellipsis, and the arrow, the share button and the help button stay on screen. Test in Task 2, `e2e/picker.spec.ts`.
5. A tile pressed while another DEM is still loading: the DEM chosen last is the one shown. The existing test in `e2e/screen.spec.ts` is moved to the new helper in Task 2, with a delay long enough to keep the race.

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/terrain/format.ts` | modify | Gains `tileLine`, the text under a tile's name. |
| `src/state/useDems.ts` | modify | `DemEntry` gains `region?` and `cell?`. |
| `src/components/DemPicker.tsx` | create | The DEM button and the dialog's root; holds whether the sheet is open. |
| `src/components/DemSheet.tsx` | create | The sheet's contents: heading, close button, tiles. |
| `src/components/TitleBar.tsx` | modify | Shows `DemPicker` in place of the segmented control. |
| `src/app.css` | modify | `.dem-btn`, `.dem-tiles`, `.dem-tile`, `.sheet--dems`; `.segmented` removed. |
| `scripts/make-thumbs.mjs` | create | Writes `public/dems/<id>.png` for each DEM in the list. |
| `src/state/manifest.test.ts` | create | Holds `dems.json` to the files it names. |
| `public/dems/` | modify | `massanutten.tif`, `gore.png`, `massanutten.png`, `dems.json`. |
| `e2e/helpers.ts` | modify | `demButton`, `demSheet`, `demTile`, `chooseDem`, `serveOneDem`. |
| `e2e/picker.spec.ts` | create | The picker's own browser tests. |
| `e2e/*.spec.ts` | modify | Steps that pressed a tab use `chooseDem`. |
| `README.md`, `PRODUCT.md`, `src/help/news.json`, `CHANGELOG.md`, `.gitignore`, `screenshots/` | modify | Records. |

---

### Task 1: The tile's line and the two new fields

**Files:**
- Modify: `src/terrain/format.ts` (the `pixelSize` function, near line 43)
- Modify: `src/state/useDems.ts` (`DemEntry`, lines 6–15)
- Test: `src/terrain/format.test.ts`

**Interfaces:**
- Produces: `tileLine(entry: { region?: unknown; cell?: unknown }): string` exported from `src/terrain/format.ts`. Returns `''` when there is nothing to say.
- Produces: `DemEntry.region?: string` and `DemEntry.cell?: number`.

- [ ] **Step 1: Write the failing tests**

In `src/terrain/format.test.ts`, add `tileLine` to the import from `./format`, and add at the end of the file:

```ts
describe('tileLine', () => {
  it('writes the region and the pixel size', () => {
    expect(tileLine({ region: 'Virginia', cell: 100 })).toBe('Virginia · 100 m');
  });

  it('writes the pixel size as the caption does, without the word', () => {
    expect(tileLine({ region: 'Colorado', cell: 4.99712 })).toBe('Colorado · 5 m');
    expect(tileLine({ cell: 2.5 })).toBe('2.5 m');
  });

  it('leaves out a part the entry does not give', () => {
    expect(tileLine({ region: 'Colorado' })).toBe('Colorado');
    expect(tileLine({ cell: 5 })).toBe('5 m');
    expect(tileLine({})).toBe('');
  });

  // The list is written by hand, so a value may be of the wrong kind.
  it('leaves out a part that is not usable', () => {
    expect(tileLine({ region: '  ', cell: 5 })).toBe('5 m');
    expect(tileLine({ region: 7, cell: 5 })).toBe('5 m');
    for (const cell of ['5', 0, -1, Number.NaN, Number.POSITIVE_INFINITY, null]) {
      expect(tileLine({ region: 'Colorado', cell })).toBe('Colorado');
    }
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/terrain/format.test.ts`
Expected: FAIL, `tileLine` is not exported.

- [ ] **Step 3: Implement**

In `src/terrain/format.ts`, replace the `pixelSize` function with:

```ts
/** A length in meters, to two decimals at most. */
function meters(length: number): string {
  return `${Number(length.toFixed(2))} m`;
}

/** The DEM's pixel size, as the caption writes it. */
export function pixelSize(dem: Dem): string {
  return `${meters(dem.cellSize)} pixels`;
}

/**
 * The line under a DEM's name in the picker: its region and its pixel size.
 * The list is written by hand, so a part that is missing or unusable is left out.
 */
export function tileLine(entry: { region?: unknown; cell?: unknown }): string {
  const parts: string[] = [];
  if (typeof entry.region === 'string' && entry.region.trim()) parts.push(entry.region.trim());
  if (typeof entry.cell === 'number' && Number.isFinite(entry.cell) && entry.cell > 0) {
    parts.push(meters(entry.cell));
  }
  return parts.join(' · ');
}
```

In `src/state/useDems.ts`, add to `DemEntry` after `place: string;`:

```ts
  /** Optional short name for where the DEM is, for its tile in the picker. */
  region?: string;
```

and after the `height?: number;` line:

```ts
  /** Optional pixel size in meters, for its tile in the picker. */
  cell?: number;
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npx vitest run src/terrain/format.test.ts && npx tsc --noEmit`
Expected: PASS, and no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/terrain/format.ts src/terrain/format.test.ts src/state/useDems.ts
git commit -m "Write a DEM's region and pixel size as one line for the picker

Claude-Session: https://claude.ai/code/session_01HWQbiQgX3NUxBSmC3SRion"
```

---

### Task 2: The DEM button and the sheet of tiles

**Files:**
- Create: `src/components/DemPicker.tsx`, `src/components/DemSheet.tsx`, `e2e/picker.spec.ts`
- Modify: `src/components/TitleBar.tsx`, `src/app.css`, `e2e/helpers.ts`
- Modify: `e2e/screen.spec.ts`, `e2e/polish.spec.ts`, `e2e/restore.spec.ts`, `e2e/selection.spec.ts`, `e2e/density.spec.ts`, `e2e/sun.spec.ts`

**Interfaces:**
- Consumes: `tileLine` and `DemEntry` from Task 1.
- Produces: `<DemPicker entries activeId onSelect />` with props `{ entries: DemEntry[]; activeId: string | null; onSelect: (id: string) => void }`.
- Produces test ids: `dem-button` (the button), `dem-sheet` (the dialog). Each tile is a `button` whose accessible name starts with the DEM's name, with `aria-current="true"` on the current one.
- Produces in `e2e/helpers.ts`: `demButton(page)`, `demSheet(page)`, `demTile(page, name)`, `chooseDem(page, name)`, `serveOneDem(page)`.

- [ ] **Step 1: Add the helpers**

In `e2e/helpers.ts`, in `serveTwoDems`, give the Gore entry its tile line (the second entry stays bare, which covers a tile with no line):

```ts
        { id: 'gore', name: 'Gore Range', place: 'Gore Range, Colorado', region: 'Colorado', file: 'gore.tif', cell: 5 },
        { id: 'second', name: 'Second', place: 'Second place', file: 'second.tif' },
```

At the end of the file add:

```ts
/** Pins the list to Gore Range alone, for tests of the screen with no picker. */
export async function serveOneDem(page: Page): Promise<void> {
  await page.route('**/dems/dems.json', (route) =>
    route.fulfill({
      json: [
        {
          id: 'gore',
          name: 'Gore Range',
          place: 'Gore Range, Colorado',
          region: 'Colorado',
          file: 'gore.tif',
          width: GORE.width,
          height: GORE.height,
          cell: 5,
        },
      ],
    }),
  );
}

/** The DEM's name in the title bar, which opens the picker. */
export const demButton = (page: Page) => page.getByTestId('dem-button');

/** The picker's sheet. */
export const demSheet = (page: Page) => page.getByTestId('dem-sheet');

/** A DEM's tile in the open sheet. */
export const demTile = (page: Page, name: string) => demSheet(page).getByRole('button', { name });

/**
 * Opens the picker and presses a DEM's tile. It waits for the sheet to go,
 * because a press at a point on the screen would otherwise land on it.
 */
export async function chooseDem(page: Page, name: string): Promise<void> {
  await demButton(page).click();
  await demTile(page, name).click();
  await expect(demSheet(page)).toBeHidden();
}
```

- [ ] **Step 2: Write the picker's failing tests**

Create `e2e/picker.spec.ts`:

```ts
import { type Page, expect, test } from '@playwright/test';
import {
  GORE,
  SECOND,
  chooseDem,
  demButton,
  demSheet,
  demTile,
  openApp,
  serveOneDem,
  serveTwoDems,
  stage,
  terrainImage,
} from './helpers';

const SUNKEN = 'rgb(239, 236, 230)'; // --sunken

/** Serves `names` as the list, every one of them the Gore Range file. */
async function serveNames(page: Page, names: string[]): Promise<void> {
  await page.route('**/dems/dems.json', (route) =>
    route.fulfill({
      json: names.map((name, i) => ({
        id: `dem-${i}`,
        name,
        place: `${name}, Colorado`,
        region: 'Colorado',
        file: 'gore.tif',
        width: GORE.width,
        height: GORE.height,
        cell: 5,
      })),
    }),
  );
}

/** Waits until nothing in the sheet is still moving into place. */
const settled = (page: Page) =>
  demSheet(page).evaluate((sheet) => Promise.all(sheet.getAnimations().map((animation) => animation.finished)));

test('the DEM button opens a dialog named DEM, with focus on the current DEM', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);
  await expect(demButton(page)).toHaveText('Gore Range');
  await expect(demButton(page)).toHaveAccessibleName('DEM: Gore Range');
  await expect(demButton(page)).toHaveAttribute('aria-haspopup', 'dialog');

  await demButton(page).click();
  await expect(page.getByRole('dialog', { name: 'DEM' })).toBeVisible();
  await expect(demTile(page, 'Gore Range')).toBeFocused();
  await expect(demTile(page, 'Gore Range')).toHaveAttribute('aria-current', 'true');
  expect(await demTile(page, 'Second').getAttribute('aria-current')).toBeNull();
});

test('a tile shows the name, then the region and the pixel size the list gives', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);
  await demButton(page).click();
  await expect(demTile(page, 'Gore Range')).toHaveText('Gore RangeColorado · 5 m');
  // The second entry gives neither, so its tile has the name alone.
  await expect(demTile(page, 'Second')).toHaveText('Second');
});

test('pressing another tile switches DEM, closes the sheet and returns focus to the button', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);
  await chooseDem(page, 'Second');
  await expect(stage(page)).toHaveAttribute('data-dem', 'second');
  await expect(terrainImage(page)).toHaveJSProperty('width', SECOND.width);
  await expect(demButton(page)).toHaveText('Second');
  await expect(demButton(page)).toBeFocused();
});

test('pressing the current tile closes the sheet and changes nothing', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);
  await chooseDem(page, 'Gore Range');
  await expect(stage(page)).toHaveAttribute('data-dem', 'gore');
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
});

test('Escape, the close button and a press outside close the sheet with no change', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);

  await demButton(page).click();
  await expect(demSheet(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(demSheet(page)).toBeHidden();
  await expect(demButton(page)).toBeFocused();

  await demButton(page).click();
  await demSheet(page).getByRole('button', { name: 'Close' }).click();
  await expect(demSheet(page)).toBeHidden();

  await demButton(page).click();
  await expect(demSheet(page)).toBeVisible();
  await settled(page);
  // The top left corner is the dimmed view at every size.
  await page.mouse.click(8, 100);
  await expect(demSheet(page)).toBeHidden();

  await expect(stage(page)).toHaveAttribute('data-dem', 'gore');
  await expect(demButton(page)).toHaveText('Gore Range');
});

test('the keyboard opens the sheet, moves between tiles and chooses one', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);
  await demButton(page).focus();
  await page.keyboard.press('Enter');
  await expect(demTile(page, 'Gore Range')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(demTile(page, 'Second')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(demSheet(page)).toBeHidden();
  await expect(stage(page)).toHaveAttribute('data-dem', 'second');
});

test('with one DEM there is no button, only the name', async ({ page }) => {
  await serveOneDem(page);
  await openApp(page);
  await expect(page.getByRole('banner')).toContainText('Gore Range');
  await expect(demButton(page)).toHaveCount(0);
});

test('a DEM that cannot be loaded leaves the picker working', async ({ page }) => {
  await serveTwoDems(page);
  await page.route('**/dems/second.tif', (route) => route.fulfill({ status: 404 }));
  await openApp(page);
  await chooseDem(page, 'Second');
  await expect(stage(page)).toHaveAttribute('data-status', 'error');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(demButton(page)).toHaveText('Second');

  await chooseDem(page, 'Gore Range');
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(terrainImage(page)).toHaveJSProperty('width', GORE.width);
});

test('a tile with no thumbnail is a plain square and still works', async ({ page }) => {
  await serveTwoDems(page);
  await page.route('**/dems/second.png', (route) => route.fulfill({ status: 404 }));
  await openApp(page);
  await demButton(page).click();
  const picture = demTile(page, 'Second').locator('.dem-tile__picture');
  await expect(picture.locator('img')).toBeHidden();
  await expect(picture).toHaveCSS('background-color', SUNKEN);
  const box = (await picture.boundingBox())!;
  expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(1);

  await demTile(page, 'Second').click();
  await expect(stage(page)).toHaveAttribute('data-dem', 'second');
});

for (const size of [
  { width: 320, height: 568 },
  { width: 667, height: 375 },
]) {
  test(`four tiles fit a ${size.width} × ${size.height} screen without scrolling`, async ({ page }) => {
    await page.setViewportSize(size);
    await serveNames(page, ['Gore Range', 'Second Peak', 'Third Basin', 'Fourth Ridge']);
    await openApp(page);
    await demButton(page).click();
    await expect(demSheet(page)).toBeVisible();
    await settled(page);

    const sheet = (await demSheet(page).boundingBox())!;
    expect(sheet.x).toBeGreaterThanOrEqual(0);
    expect(sheet.y).toBeGreaterThanOrEqual(0);
    expect(sheet.x + sheet.width).toBeLessThanOrEqual(size.width + 0.5);
    expect(sheet.y + sheet.height).toBeLessThanOrEqual(size.height + 0.5);
    expect(await demSheet(page).evaluate((e) => e.scrollHeight <= e.clientHeight)).toBe(true);

    const tiles = await demSheet(page).locator('.dem-tile').all();
    expect(tiles).toHaveLength(4);
    const tops = new Set<number>();
    for (const tile of tiles) {
      const box = (await tile.boundingBox())!;
      tops.add(Math.round(box.y));
      expect(box.x).toBeGreaterThanOrEqual(sheet.x);
      expect(box.x + box.width).toBeLessThanOrEqual(sheet.x + sheet.width + 0.5);
      expect(box.y + box.height).toBeLessThanOrEqual(sheet.y + sheet.height + 0.5);
    }
    // Two rows upright; one row with the phone on its side.
    expect(tops.size).toBe(size.width > 520 ? 1 : 2);
  });
}

test('on a desktop the sheet is a card in the middle with two tiles across', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'the card is the desktop arrangement');
  await serveTwoDems(page);
  await openApp(page);
  await demButton(page).click();
  await settled(page);
  const sheet = (await demSheet(page).boundingBox())!;
  expect(Math.round(sheet.width)).toBe(420);
  expect(Math.abs(sheet.x + sheet.width / 2 - 640)).toBeLessThanOrEqual(1);
  const [first, second] = [
    (await demTile(page, 'Gore Range').boundingBox())!,
    (await demTile(page, 'Second').boundingBox())!,
  ];
  expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(1);
  expect(Math.round(first.width)).toBe(180);
});

test('at 320px the app name and "Massanutten" are both whole', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await serveNames(page, ['Gore Range', 'Massanutten']);
  await openApp(page);
  await chooseDem(page, 'Massanutten');
  await expect(demButton(page)).toHaveText('Massanutten');
  for (const selector of ['.titlebar__name', '.dem-btn__name']) {
    expect(await page.locator(selector).evaluate((e) => e.scrollWidth <= e.clientWidth), selector).toBe(true);
  }
  const help = (await page.getByTestId('help').boundingBox())!;
  expect(help.x + help.width).toBeLessThanOrEqual(320);
});

test('a name too long for the title bar is cut, and the arrow and the buttons stay on screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await serveNames(page, ['The long north ridge above the upper lake', 'Second Peak']);
  await openApp(page);
  expect(await page.locator('.dem-btn__name').evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true);
  for (const part of [demButton(page).locator('svg'), page.getByTestId('share'), page.getByTestId('help')]) {
    const box = (await part.boundingBox())!;
    expect(box.width).toBeGreaterThan(0);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
  }
});

test('the DEM button and the tiles are 44px targets on a touch screen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'touch sizes apply to touch screens');
  await serveTwoDems(page);
  await openApp(page);
  expect(Math.round((await demButton(page).boundingBox())!.height)).toBeGreaterThanOrEqual(44);
  await demButton(page).click();
  const close = (await demSheet(page).getByRole('button', { name: 'Close' }).boundingBox())!;
  expect(Math.round(close.width)).toBeGreaterThanOrEqual(44);
  expect(Math.round(close.height)).toBeGreaterThanOrEqual(44);
});

test('the current tile has the accent ring and the others have none', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);
  await demButton(page).click();
  // --accent is rgb(184, 74, 0).
  await expect(demTile(page, 'Gore Range').locator('.dem-tile__picture')).toHaveCSS('box-shadow', /rgb\(184, 74, 0\)/);
  // Move the mouse off the tiles, so no tile has the ring a mouse gives.
  await page.mouse.move(2, 2);
  await expect(demTile(page, 'Second').locator('.dem-tile__picture')).toHaveCSS('box-shadow', 'none');
});
```

- [ ] **Step 3: Run them and see them fail**

Run: `npx playwright test e2e/picker.spec.ts`
Expected: FAIL, every test, with nothing matching `dem-button`.

- [ ] **Step 4: Write `DemSheet`**

Create `src/components/DemSheet.tsx`:

```tsx
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { type CSSProperties, useRef } from 'react';
import type { DemEntry } from '../state/useDems';
import { tileLine } from '../terrain/format';

const DEM_FOLDER = `${import.meta.env.BASE_URL}dems/`;

interface DemSheetProps {
  entries: DemEntry[];
  activeId: string | null;
  /** A tile was pressed, the current DEM's included. */
  onChoose: (id: string) => void;
}

/**
 * The DEMs to choose from, one tile each. It goes inside a `Dialog.Root`,
 * which holds whether it is open. Like the help sheet it never scrolls: four
 * tiles are all the list can hold.
 */
export function DemSheet({ entries, activeId, onChoose }: DemSheetProps) {
  const current = useRef<HTMLButtonElement>(null);
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="scrim" />
      <Dialog.Content
        className="sheet sheet--dems"
        data-testid="dem-sheet"
        // The heading says what is here; there is no description.
        aria-describedby={undefined}
        // Focus starts on the DEM that is shown, not on the close button.
        onOpenAutoFocus={(event) => {
          if (!current.current) return;
          event.preventDefault();
          current.current.focus();
        }}
      >
        <Dialog.Title className="sheet__heading">DEM</Dialog.Title>
        <Dialog.Close asChild>
          <button type="button" className="icon-btn sheet__close" aria-label="Close">
            <X size={20} aria-hidden="true" />
          </button>
        </Dialog.Close>
        {/* role="list": Safari VoiceOver drops list semantics when list-style is none. */}
        <ul className="dem-tiles" role="list" style={{ '--tiles': entries.length } as CSSProperties}>
          {entries.map((entry) => {
            const isCurrent = entry.id === activeId;
            const line = tileLine(entry);
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  className="dem-tile"
                  ref={isCurrent ? current : undefined}
                  aria-current={isCurrent ? 'true' : undefined}
                  onClick={() => onChoose(entry.id)}
                >
                  <span className="dem-tile__picture">
                    <img
                      src={`${DEM_FOLDER}${entry.id}.png`}
                      alt=""
                      draggable={false}
                      // A DEM with no thumbnail keeps its plain square.
                      onError={(event) => {
                        event.currentTarget.hidden = true;
                      }}
                    />
                  </span>
                  <span className="dem-tile__name">{entry.name}</span>
                  {line && <span className="dem-tile__line">{line}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
```

- [ ] **Step 5: Write `DemPicker`**

Create `src/components/DemPicker.tsx`:

```tsx
import * as Dialog from '@radix-ui/react-dialog';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { DemEntry } from '../state/useDems';
import { DemSheet } from './DemSheet';

interface DemPickerProps {
  entries: DemEntry[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

/**
 * The picker: the DEM's name as a button, and the sheet of DEMs it opens.
 * The button stays usable while a DEM loads and when one fails, so there is
 * always a way to another DEM.
 */
export function DemPicker({ entries, activeId, onSelect }: DemPickerProps) {
  const [open, setOpen] = useState(false);
  const name = entries.find((entry) => entry.id === activeId)?.name ?? '';

  const choose = (id: string) => {
    setOpen(false);
    onSelect(id);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className="dem-btn" aria-label={`DEM: ${name}`} data-testid="dem-button">
          <span className="dem-btn__name">{name}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </Dialog.Trigger>
      <DemSheet entries={entries} activeId={activeId} onChoose={choose} />
    </Dialog.Root>
  );
}
```

- [ ] **Step 6: Use it in the title bar**

In `src/components/TitleBar.tsx`, add `import { DemPicker } from './DemPicker';` after the `DemEntry` import, and replace the whole `<div className="segmented" …>…</div>` element with:

```tsx
          <DemPicker entries={entries} activeId={activeId} onSelect={onSelect} />
```

- [ ] **Step 7: Style it**

In `src/app.css`:

Replace the comment above `.titlebar__dem` (line 62) with:

```css
/* The only DEM's name: a fact, not a control, so it does not dress like the picker's button. */
```

Delete the four `.segmented` rules (`.segmented`, `.segmented__seg`, `.segmented__seg[aria-selected='true']`, `.segmented__seg:focus-visible`, lines 215–251) and put in their place:

```css
/* The picker's button: the DEM's name and an arrow, with no box until it is
   pointed at. The name gives way before the arrow does. */
.dem-btn {
  flex: 0 1 auto;
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  min-width: 0;
  height: 40px;
  padding: 0 var(--sp-2) 0 var(--sp-3);
  border: 0;
  border-radius: var(--r-pill);
  background: transparent;
  color: var(--ink-700);
  font-size: var(--fs-sm);
  font-weight: 600;
  cursor: pointer;
  transition:
    background var(--t-fast) var(--ease-out),
    color var(--t-fast) var(--ease-out),
    box-shadow var(--t-fast) var(--ease-out);
}

.dem-btn:hover,
.dem-btn[data-state='open'] {
  background: var(--sunken);
  color: var(--ink-900);
}

.dem-btn__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dem-btn svg {
  flex: none;
}

/* The narrowest phones: the button gives up its side padding so an
   eleven-letter name stays whole beside the app's name. */
@media (max-width: 359px) {
  .dem-btn {
    padding: 0 var(--sp-1) 0 var(--sp-2);
  }
}
```

In the `@media (pointer: coarse)` block (near line 353), replace the `.segmented__seg { min-height: var(--touch); }` rule with:

```css
  .dem-btn {
    height: var(--touch);
  }
```

Directly before the comment `/* Wider than a phone held upright: a card in the middle of the window. */` (near line 1030), add:

```css
/* The picker's tiles, two across: a picture, a name and a line of facts. */
.dem-tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.dem-tile {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

/* Square whatever the DEM's shape; the plain ground shows until the picture
   arrives, and stays if there is none. */
.dem-tile__picture {
  display: block;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: var(--r-md);
  background: var(--sunken);
  transition: box-shadow var(--t-fast) var(--ease-out);
}

.dem-tile__picture img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dem-tile__name,
.dem-tile__line {
  display: block;
  overflow: hidden;
  line-height: var(--lh-snug);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dem-tile__name {
  margin-top: var(--sp-2);
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--ink-900);
}

.dem-tile__line {
  font-size: var(--fs-xs);
  color: var(--ink-500);
}

/* The rings go round the picture, with a gap of paper, not round the whole tile. */
.dem-tile:hover .dem-tile__picture {
  box-shadow:
    0 0 0 2px var(--paper),
    0 0 0 4px var(--line-strong);
}

.dem-tile[aria-current='true'] .dem-tile__picture {
  box-shadow:
    0 0 0 2px var(--paper),
    0 0 0 4px var(--accent);
}

.dem-tile:focus-visible {
  box-shadow: none;
}

.dem-tile:focus-visible .dem-tile__picture {
  box-shadow: var(--ring);
}

.dem-tile[aria-current='true']:focus-visible .dem-tile__picture {
  box-shadow:
    0 0 0 2px var(--paper),
    0 0 0 4px var(--accent),
    0 0 0 7px color-mix(in srgb, var(--accent) 60%, transparent);
}
```

Inside the existing `@media (min-width: 521px) and (max-height: 520px)` block, after the `.sheet { … }` rule, add:

```css
  /* The picker's card is as wide as its tiles, which sit in one row and
     shrink together on a screen too narrow for four. */
  .sheet--dems {
    width: fit-content;
    max-width: calc(100vw - 2 * var(--sp-4));
  }

  .sheet--dems .dem-tiles {
    grid-template-columns: repeat(var(--tiles), minmax(0, 150px));
  }
```

- [ ] **Step 8: Run the picker's tests**

Run: `npx tsc --noEmit && npx playwright test e2e/picker.spec.ts`
Expected: PASS in both projects (the desktop-only and phone-only tests skip in the other).

If "at 320px the app name and Massanutten are both whole" fails, the title bar is over by a few pixels: in the `@media (max-width: 359px)` block also set `.titlebar { gap: var(--sp-2); }`, and run again.

- [ ] **Step 9: Move the other tests to the helper**

Add `chooseDem` and `demButton` to each file's import from `./helpers` as it needs them. Then apply these two rules everywhere in `e2e/`:

- `await page.getByRole('tab', { name: 'X' }).click();` becomes `await chooseDem(page, 'X');`
- `await expect(page.getByRole('tab', { name: 'X' })).toHaveAttribute('aria-selected', 'true');` becomes `await expect(demButton(page)).toHaveText('X');`

`chooseDem` takes about 0.7 s, so a test that relies on a choice landing while a slow DEM loads needs a longer load. In each of these three tests change `serveTwoDems(page, 600)` to `serveTwoDems(page, 3000)` and the wait that follows the choices to `await page.waitForTimeout(3500);`:

- `e2e/screen.spec.ts`: "keeps the DEM chosen last when an earlier choice loads slowly" (its wait is `1000`).
- `e2e/restore.spec.ts`: "a pixel waiting for its DEM is dropped when another DEM is chosen first" (its wait is `800`).
- `e2e/restore.spec.ts`: "a link pasted while another DEM is loading goes to its own DEM" (its wait is `800`).

These tests need more than the two rules:

`e2e/screen.spec.ts`, "names the only DEM in the title bar quietly, without a picker": add `serveOneDem` to the import, and replace its body with:

```ts
  await serveOneDem(page);
  await openApp(page);
  await expect(page.getByRole('banner')).toContainText('Gore Range');
  await expect(demButton(page)).toHaveCount(0);
  // Plain text, not something that looks like a control.
  expect(await page.locator('.titlebar__dem').evaluate((e) => getComputedStyle(e).fontWeight)).toBe('400');
```

`e2e/screen.spec.ts`, "switches DEMs from the picker": replace its body with:

```ts
  await serveTwoDems(page);
  await openApp(page);
  await expect(demButton(page)).toHaveText('Gore Range');

  await chooseDem(page, 'Second');
  await expect(demButton(page)).toHaveText('Second');
  await expect(terrainImage(page)).toHaveJSProperty('width', SECOND.width);
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  expect(await inkedPixels(netCloud(page))).toBeGreaterThan(0);
```

`e2e/screen.spec.ts`, "the selected DEM tab shows a focus ring": rename it `'the DEM button shows a focus ring'` and replace its last comment and assertion with:

```ts
  // The ring is a 3px spread with no offset or blur. The shadow animates to
  // the ring, so wait for it to arrive.
  await expect.poll(async () => (await focused()).shadow).toMatch(/0px 0px 0px 3px/);
```

`e2e/polish.spec.ts`, "four DEMs with two-word names stay inside a phone screen": replace the lines from `const tabs = …` through the closing `}` of the `for` loop with:

```ts
  const button = (await demButton(page).boundingBox())!;
  expect(button.x).toBeGreaterThanOrEqual(0);
  expect(button.x + button.width).toBeLessThanOrEqual(width);
  if (testInfo.project.name === 'phone') expect(Math.round(button.height)).toBeGreaterThanOrEqual(44);
```

`e2e/polish.spec.ts`, "touch targets are at least 44px": replace the `for (const tab of …) { … }` loop with:

```ts
  expect(Math.round((await demButton(page).boundingBox())!.height)).toBeGreaterThanOrEqual(44);
```

`e2e/polish.spec.ts`, "every control can be reached by keyboard, in reading order, and shows a focus ring": the two tabs become one stop, read by its label. Replace the `expected` list with:

```ts
  const expected =
    testInfo.project.name === 'phone'
      ? ['DEM: Gore Range', shareName, helpName, 'Density', sunName, terrainName]
      : ['DEM: Gore Range', shareName, helpName, terrainName, 'Density', sunName];
```

- [ ] **Step 10: Check nothing still names the old control**

Run: `grep -rn "getByRole('tab\|tablist\|segmented" e2e src --include=*.ts --include=*.tsx --include=*.css | grep -v "src/styles/tokens.css"`
Expected: no output.

- [ ] **Step 11: Run every test**

Run: `npx vitest run && npx playwright test`
Expected: PASS. A failure in a test that pressed a tab means a step of Step 9 was missed in that test; fix the test, not the app.

- [ ] **Step 12: Commit**

```bash
git add src/components/DemPicker.tsx src/components/DemSheet.tsx src/components/TitleBar.tsx src/app.css e2e
git commit -m "Open a sheet of tiles from the DEM's name in place of the segmented control

Claude-Session: https://claude.ai/code/session_01HWQbiQgX3NUxBSmC3SRion"
```

---

### Task 3: The line in Help — dropped

Dropped on 2026-10-04 by the owner's decision. With the line, the Help sheet,
which cannot scroll, ran off a 320 × 480 screen with two DEMs: 4px over on a
touch screen and 23px over with a mouse. Help is left as it was. Nothing from
this task was committed.

---

### Task 4: Massanutten, the thumbnails, and the list held to its files

**Files:**
- Create: `scripts/make-thumbs.mjs`, `src/state/manifest.test.ts`, `public/dems/massanutten.tif`, `public/dems/gore.png`, `public/dems/massanutten.png`
- Modify: `public/dems/dems.json`, `package.json`, `.gitignore`, `e2e/picker.spec.ts`, `e2e/offline.spec.ts`
- Add to git: `data/MASS/`

**Interfaces:**
- Consumes: the picker from Task 2 and `serveOneDem` from `e2e/helpers.ts`.
- Produces: `npm run thumbs`; a list of two DEMs with ids `gore` and `massanutten`.

- [ ] **Step 1: Write the failing test of the list**

Create `src/state/manifest.test.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseDem } from '../terrain/dem';
import type { DemEntry } from './useDems';

const FOLDER = 'public/dems/';
const entries: DemEntry[] = JSON.parse(readFileSync(`${FOLDER}dems.json`, 'utf8'));

// The picker states a DEM's pixel size from the list, not from the file, so
// the list is held to the files here. Unit tests gate the deploy.
describe('public/dems/dems.json', () => {
  // A new visitor opens on the first DEM in the list.
  it('ships Gore Range first, and Massanutten with it', () => {
    const ids = entries.map((entry) => entry.id);
    expect(ids[0]).toBe('gore');
    expect(ids).toContain('massanutten');
  });

  it('gives every DEM its own id', () => {
    const ids = entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const entry of entries) {
    // The three are optional in the list; one that is given must be true.
    it(`${entry.id}: any dimensions and pixel size it states are its file's`, async () => {
      const file = readFileSync(`${FOLDER}${entry.file}`);
      const dem = await parseDem(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
      const actual = { width: dem.width, height: dem.height, cell: Number(dem.cellSize.toFixed(2)) };
      for (const key of ['width', 'height', 'cell'] as const) {
        if (entry[key] !== undefined) expect(entry[key], key).toBe(actual[key]);
      }
    });

    it(`${entry.id}: has a thumbnail; run \`npm run thumbs\` after adding a DEM`, () => {
      expect(existsSync(`${FOLDER}${entry.id}.png`)).toBe(true);
    });
  }
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/state/manifest.test.ts`
Expected: FAIL: the list has no `massanutten`, and there is no `gore.png`.

- [ ] **Step 3: Add the DEM and its entry**

```bash
cp data/MASS/MASS_DEM_100m.tif public/dems/massanutten.tif
```

Replace the contents of `public/dems/dems.json` with:

```json
[
  {
    "id": "gore",
    "name": "Gore Range",
    "place": "Gore Range, Colorado",
    "region": "Colorado",
    "file": "gore.tif",
    "width": 288,
    "height": 294,
    "cell": 5
  },
  {
    "id": "massanutten",
    "name": "Massanutten",
    "place": "Massanutten Mountain, Virginia",
    "region": "Virginia",
    "file": "massanutten.tif",
    "width": 390,
    "height": 390,
    "cell": 100
  }
]
```

In `.gitignore`, replace the line `data/GORE.zip` with `data/*.zip`.

- [ ] **Step 4: Write the thumbnail script**

Create `scripts/make-thumbs.mjs`:

```js
// Draws each DEM's thumbnail for the picker: public/dems/<id>.png, the
// hillshade at the default sun with its shorter side 360px. Run with
// `npm run thumbs` after adding a DEM. It builds the app and reads the
// terrain's own canvas, so the picture is the app's shading and nothing else;
// like the browser tests, it needs Playwright's Chromium.
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { build, preview } from 'vite';

const SHORT_SIDE = 360; // twice the largest tile
const FOLDER = 'public/dems/';
const entries = JSON.parse(readFileSync(`${FOLDER}dems.json`, 'utf8'));

await build({ logLevel: 'warn' });
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
```

In `package.json`, add to `"scripts"` after the `"preview-image"` line:

```json
    "thumbs": "node scripts/make-thumbs.mjs",
```

- [ ] **Step 5: Make the thumbnails and look at them**

Run: `npm run thumbs`
Expected: prints `public/dems/gore.png` and `public/dems/massanutten.png`.

Open both files with the Read tool. Gore must show the cirque and the round lake; Massanutten must show the long ridge running from the lower left to the upper right. Each must be 360px on its shorter side and have no ring, loupe or rounded corners. A picture that is faint or half-drawn means the canvas was read while it was still fading in; if so, add `await page.waitForTimeout(500);` after the `waitForFunction` call and run again.

- [ ] **Step 6: Run the test of the list**

Run: `npx vitest run src/state/manifest.test.ts`
Expected: PASS.

- [ ] **Step 7: Test the real list in the browser**

In `e2e/picker.spec.ts`, add at the end:

```ts
test('the app ships two DEMs, each with its thumbnail and its facts', async ({ page }) => {
  await openApp(page);
  await expect(demButton(page)).toHaveText('Gore Range');
  await demButton(page).click();
  await expect(demTile(page, 'Gore Range')).toHaveText('Gore RangeColorado · 5 m');
  await expect(demTile(page, 'Massanutten')).toHaveText('MassanuttenVirginia · 100 m');
  for (const name of ['Gore Range', 'Massanutten']) {
    const picture = demTile(page, name).locator('img');
    await expect(picture).toBeVisible();
    await expect.poll(() => picture.evaluate((img: HTMLImageElement) => Math.min(img.naturalWidth, img.naturalHeight))).toBe(360);
  }

  await demTile(page, 'Massanutten').click();
  await expect(stage(page)).toHaveAttribute('data-dem', 'massanutten');
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(terrainImage(page)).toHaveJSProperty('width', 390);
  await expect(terrainImage(page)).toHaveJSProperty('height', 390);
  await expect(demButton(page)).toHaveText('Massanutten');
  // The address names the DEM, so the view can be shared and reopened.
  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain('dem=massanutten');
});
```

In `e2e/offline.spec.ts`, change the type of `entries` to `Array<{ id: string; file: string }>`, and add inside the `for (const entry of entries)` loop:

```ts
    await expect.poll(() => page.evaluate(isCached, `dems/${entry.id}.png`), `${entry.id}.png is stored`).toBe(true);
```

Run: `npx playwright test e2e/picker.spec.ts e2e/offline.spec.ts`
Expected: PASS.

- [ ] **Step 8: Run every browser test and pin the ones that assumed one DEM**

Run: `npx playwright test`

The app now opens with a DEM button in the title bar where the bundled list used to give plain text. A test that fails here assumed one DEM: it counts Tab stops from the title bar, or reads the title bar's text or layout. For each such test, add `await serveOneDem(page);` as its first line (and `serveOneDem` to the file's import from `./helpers`), so the test keeps testing what it was written for. Do not change the app to make these pass. If a failure is not of this kind, stop and investigate it as a bug.

Run `npx playwright test` again.
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add data/MASS public/dems scripts/make-thumbs.mjs package.json .gitignore src/state/manifest.test.ts e2e
git status --short
```

Check that `data/MASS.zip`, `__MACOSX` and `Zone.Identifier` files are not staged. Then:

```bash
git commit -m "Add Massanutten Mountain as a second DEM, with a thumbnail for each

Claude-Session: https://claude.ai/code/session_01HWQbiQgX3NUxBSmC3SRion"
```

---

### Task 5: The records

**Files:**
- Modify: `src/help/news.json`, `CHANGELOG.md` (by script), `README.md`, `PRODUCT.md`, `docs/superpowers/specs/2026-10-04-second-dem-and-picker-design.md` (status line)
- Modify: `screenshots/09-phone-two-dems.png`; create `screenshots/21-phone-dem-sheet.png`, `22-phone-sideways-dem-sheet.png`, `23-desktop-dem-sheet.png`

**Interfaces:**
- Consumes: the finished app from Tasks 1–4.

- [ ] **Step 1: The news entry and the changelog**

In `src/help/news.json`, add after the entry with `"id": 6` (with a comma after its closing brace):

```json
  {
    "id": 7,
    "date": "2026-10-04",
    "text": "A second landscape, Massanutten Mountain in Virginia. Press the DEM's name to switch."
  }
```

Run: `npm run changelog && npx vitest run src/help`
Expected: `CHANGELOG.md` gains the line under 4 October 2026, and the tests PASS.

- [ ] **Step 2: The README**

In `README.md`, under "Add a DEM", replace step 3's JSON block and the paragraph after it with:

````markdown
   ```json
   {
     "id": "short-id",
     "name": "Name in the picker",
     "place": "Place shown under the terrain",
     "region": "Short place name on the picker's tile",
     "file": "your.tif",
     "width": 288,
     "height": 294,
     "cell": 5
   }
   ```

   `width` and `height` are the DEM's pixel dimensions and `cell` is its pixel
   size in meters. With the dimensions the screen does not shift when the DEM
   finishes loading; `region` and `cell` make the line under the DEM's name in
   the picker. `npm test` fails if any of the three differs from the file.

4. Make its thumbnail for the picker:

   ```bash
   npm run thumbs
   ```

   This writes `public/dems/short-id.png` for every DEM in the list. It needs
   Playwright's Chromium, as the browser tests do.
````

and replace the sentence `Limits: the picker shows the first four DEMs in the list.` with `Limits: the picker shows the first four DEMs in the list, as tiles in a sheet that does not scroll.`

- [ ] **Step 3: PRODUCT.md**

Make these replacements in `PRODUCT.md`. Keep its line wrapping at about 78 characters.

Under "Operating Context", replace the sentence beginning `DEMs are bundled, not uploaded.` through `288 × 294 pixels at 5 m.` with:

```markdown
- DEMs are bundled, not uploaded. Adding one is a GeoTIFF in `public/dems/`
  plus an entry in `public/dems/dems.json` and a thumbnail from
  `npm run thumbs`, usually after a `gdalwarp` step (README, "Add a DEM"). The
  app ships with two: Gore Range, Colorado, 288 × 294 pixels at 5 m, and
  Massanutten Mountain, Virginia, 390 × 390 pixels at 100 m.
```

Under "Capabilities and Constraints", replace the "DEM picker" bullet with:

```markdown
- DEM picker: with two to four DEMs, the DEM's name in the title bar is a
  button with a small arrow. It opens a sheet of tiles, two across: a
  hillshade thumbnail, the name, then the region and the pixel size. The
  current DEM has a ring in the accent color. The sheet is the one Help uses
  and never scrolls. One DEM is plain text. More than four is unsupported
  (`docs/superpowers/specs/2026-10-04-second-dem-and-picker-design.md`).
```

Under "Technical constraints", delete the whole bullet that begins `Known limit: with two to four DEMs the picker and the app name truncate`.

Under "Terminology", replace `picker;` with `picker (the DEM's name in the title bar and the sheet it opens); tile;`.

Under "Undecided", delete the bullet `The second sample DEM.`

Under "Evidence on Hand", add after the `data/GORE/GORE_stereonet.png` bullet:

```markdown
- `data/MASS/MASS_DEM_100m.tif`, the source of the second DEM;
  `public/dems/massanutten.tif` is a copy of it. Beside it are the same four
  reference figures as Gore's. `MASS_hillshade.png` is titled "Gore Range 05m"
  by mistake; its data is Massanutten's.
```

and replace `twenty captures of the current build at phone and desktop sizes, the last four with the density layer on (retaken and first tracked 2026-10-04)` with `twenty-three captures at phone and desktop sizes. Numbers 09 and 21–23 show the picker and were taken 2026-10-04 after it was built; the rest were taken earlier that day and show the title bar with one DEM, before its name became a button`.

- [ ] **Step 4: The spec's status line**

In `docs/superpowers/specs/2026-10-04-second-dem-and-picker-design.md`, replace the `Status:` line with:

```markdown
Status: approved 2026-10-04. The implementation plan is
`docs/superpowers/plans/2026-10-04-second-dem-and-picker.md`
```

- [ ] **Step 5: The screenshots**

Write this to a file in the scratchpad directory, not in the repository, as `shots.mjs`, and run it from the repository root with `node <scratchpad>/shots.mjs`:

```js
import { chromium, devices } from '@playwright/test';
import { build, preview } from 'vite';

await build({ logLevel: 'warn' });
const server = await preview({ logLevel: 'warn', preview: { port: 4177, strictPort: true } });
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch();

async function shot(name, options, fragment, openSheet) {
  const context = await browser.newContext({ ...options, serviceWorkers: 'block' });
  const page = await context.newPage();
  await page.goto(`${url}#${fragment}`);
  await page.locator('main[data-status="ready"]').waitFor();
  await page.evaluate(() => document.fonts.ready);
  if (openSheet) {
    await page.getByTestId('dem-button').click();
    await page.getByTestId('dem-sheet').waitFor();
  }
  // Let the cloud fade in and the sheet finish moving.
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `screenshots/${name}.png` });
  console.log(`screenshots/${name}.png`);
  await context.close();
}

try {
  const phone = devices['Pixel 7'];
  const sideways = { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true };
  const desktop = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 };
  await shot('09-phone-two-dems', phone, 'dem=massanutten', false);
  await shot('21-phone-dem-sheet', phone, 'dem=gore', true);
  await shot('22-phone-sideways-dem-sheet', sideways, 'dem=gore', true);
  await shot('23-desktop-dem-sheet', desktop, 'dem=gore', true);
} finally {
  await browser.close();
  await server.close();
}
```

Open all four with the Read tool and check each against the spec:

- 09: the title bar reads "Pixel Net", then "Massanutten" with its arrow, share and help, with nothing cut. The terrain shows the ridge.
- 21: the sheet stands on the bottom edge; two tiles across; Gore has the rust ring; "Virginia · 100 m" is under Massanutten.
- 22: a card in the middle, one row of two tiles, all of it on screen.
- 23: a 420px card in the middle of the window, two tiles across.

Then compare the net in 09 with `data/MASS/MASS_stereonet.png` (open both): the cloud's shape and where it is densest must agree. The reference may be drawn with another style, so compare the shape, not the look. A net that disagrees is a bug in the DEM's handling, not in the picker; stop and report it.

- [ ] **Step 6: Run everything once more**

Run: `npx tsc --noEmit && npx vitest run && npx playwright test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/help/news.json CHANGELOG.md README.md PRODUCT.md screenshots docs/superpowers/specs/2026-10-04-second-dem-and-picker-design.md docs/superpowers/plans/2026-10-04-second-dem-and-picker.md
git commit -m "Record the second DEM and the new picker in the docs, the news and the screenshots

Claude-Session: https://claude.ai/code/session_01HWQbiQgX3NUxBSmC3SRion"
```
