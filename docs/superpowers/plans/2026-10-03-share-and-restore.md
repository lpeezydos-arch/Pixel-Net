# Share and Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The app reopens on the DEM, pixel and sun it was left on, and one share button sends a picture of the view with a link that restores it.

**Architecture:** The view is one short string (`dem=gore&px=150,210&sun=120,35`) made by a pure codec. A hook keeps that string in the address bar's fragment and in `localStorage`, and applies a string it reads to the app's existing motion values. The share button draws a fixed-size figure on a canvas inside the press, and hands it, with the link, to the share sheet; where there is no share sheet it copies the link.

**Tech Stack:** Vite 8, React 19, TypeScript 7 (strict), `motion` motion values, Radix Tooltip, lucide-react, Vitest (node environment), Playwright (Chromium, `phone` and `desktop` projects), vite-plugin-pwa.

**Spec:** `docs/superpowers/specs/2026-10-03-share-and-restore-design.md`. It extends `docs/superpowers/specs/2026-10-01-pixel-net-design.md` ("the first spec"). Read both.

## Global Constraints

- Work only in this worktree: `/home/lprivette/pixel_app/.claude/worktrees/share-and-restore`, branch `worktree-share-and-restore`. Never `cd` to `/home/lprivette/pixel_app`. Never push.
- No new dependencies. `@radix-ui/react-tooltip`, `lucide-react` and `motion` are already installed.
- Exact words: button name and tooltip "Share this view"; "Link copied"; "Could not copy the link".
- Exact values: storage key `pixel-net:view`; write delay 400 ms; notice 1.6 s; picture sizes 720 (net side), 1440 (terrain limit), 48 (around), 40 (between), 28 (above the caption), caption lines 40 and 28 high.
- The view string is `dem=<id>&px=<column>,<row>&sun=<azimuth>,<height>` in that order, with literal commas.
- Styles come from `src/styles/tokens.css`. Do not edit `tokens.css`. The accent (`--accent`, rust) appears only on the selection: on screen that is unchanged; in the picture it is the ring and the point only. The share button is not accent-colored.
- TypeScript is strict with `noUnusedLocals` and `noUnusedParameters`; `npm run build` runs `tsc --noEmit` first and must pass after every task.
- Comments are plain sentences that say why, in the voice of the surrounding code. No emoji. One icon family: lucide.
- Unit tests: `npm test` (Vitest, node environment, files `src/**/*.test.ts`; there is no DOM in them).
- Browser tests need Chromium's libraries on this machine. Always run them as:
  `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test <files>`
  Each run builds the app and serves it on port 4173. If the port is taken (another session may be running tests), wait a minute and run again.
- Browser tests block service workers (see `playwright.config.ts`); only `e2e/offline.spec.ts` allows them.
- Commits: a sentence-style subject as in `git log` ("Select a pixel and show it on the net"), a body that says why, and this last line exactly:
  `Claude-Session: https://claude.ai/code/session_0188RNZHUPogarCPaaFF2sKe`

## Review Focus

Inputs and conditions the spec implies that are most likely to bite a person. Each has a test in the task that owns the code.

1. A sun left where a drag put it, at a fraction of a degree: the address holds whole degrees and the app reopens with the sun's label reading what it read before. (Task 3)
2. A second press on the share button while the share sheet is still open: one share, and no "Link copied" behind the sheet. (Task 5)
3. An address that already carries a query string (`?ref=mail#dem=…`): the view is restored and the query is kept when the address is rewritten. (Task 3)
4. A link to another DEM that loads slowly, and the user picks a different DEM in the picker before it arrives: the link's pixel must not land on the DEM the user chose. (Task 2)
5. A place name too long for the picture's caption: the line is set smaller and stays inside the picture. (Task 6)

## File Structure

| File | Responsibility |
|---|---|
| `src/state/view.ts` (new) | The view and its string: `encodeView`, `decodeView`, `pixelInside`. Pure. |
| `src/state/view.test.ts` (new) | Unit tests for the above. |
| `src/state/viewStore.ts` (new) | The string in the address bar and in `localStorage`: `readFragment`, `readSaved`, `writeView`, `linkTo`. |
| `src/state/useViewPersistence.ts` (new) | The hook: applies a view to the app; writes the view when it settles; listens for `hashchange`. |
| `src/state/useDems.ts` (modify) | Takes the DEM to open on; a loaded DEM carries its `id`. |
| `src/terrain/format.ts` (modify) | Exports `NO_DATA`; adds `pixelSize` and `demFacts`. |
| `src/share/cardLayout.ts` (new) | Where everything goes in the picture. Pure, no imports. |
| `src/share/text.ts` (new) | Share text, caption lines, site name, file name. Pure. |
| `src/share/drawCard.ts` (new) | Draws the picture on a canvas and turns it into a PNG file. |
| `src/share/share.ts` (new) | Share sheet or copy. |
| `src/components/ShareButton.tsx` (new) | The button, its tooltip, check mark and announcement. |
| `src/components/TitleBar.tsx` (modify) | Groups the DEM's name or picker with the share button. |
| `src/App.tsx` (modify) | Reads the starting view; wires the hook and the share button. |
| `src/app.css` (modify) | `.titlebar__end`, `.icon-btn`. |
| `index.html`, `.env`, `vite.config.ts`, `package.json` (modify) | Link-preview tags, `VITE_SITE_URL`, cache exclusion, `preview-image` script. |
| `scripts/make-preview.mjs`, `public/preview.png` (new) | The link-preview image and the script that draws it. |
| `e2e/helpers.ts` (modify), `e2e/restore.spec.ts`, `e2e/share.spec.ts`, `e2e/preview.spec.ts` (new) | Browser tests. |
| `e2e/polish.spec.ts`, `e2e/offline.spec.ts` (modify) | Tab order, touch targets, four DEMs; the preview image is not cached. |
| The first spec, `PRODUCT.md`, `README.md`, `docs/polish-pass.md` (modify) | Records. |

---

### Task 1: The view and its string

**Files:**
- Create: `src/state/view.ts`
- Test: `src/state/view.test.ts`

**Interfaces:**
- Consumes: `DEFAULT_SUN`, `MIN_SUN_ALTITUDE` from `src/terrain/net.ts`; `Pixel` (`{ col, row }`) and `Sun` (`{ azimuth, altitude }`) from `src/terrain/types.ts`.
- Produces:
  - `interface View { dem: string | null; pixel: Pixel | null; sun: Sun }`
  - `const DEFAULT_VIEW: View`
  - `encodeView(view: View, firstDem: string): string`
  - `decodeView(text: string): View`
  - `pixelInside(pixel: Pixel, width: number, height: number): boolean`

- [ ] **Step 1: Write the failing tests**

Create `src/state/view.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_SUN } from '../terrain/net';
import { DEFAULT_VIEW, type View, decodeView, encodeView, pixelInside } from './view';

const WEST = { col: 150, row: 210 };
const LOW_SOUTHEAST = { azimuth: 120, altitude: 35 };

describe('encodeView', () => {
  it('writes the default view as nothing', () => {
    expect(encodeView(DEFAULT_VIEW, 'gore')).toBe('');
    expect(encodeView({ dem: 'gore', pixel: null, sun: DEFAULT_SUN }, 'gore')).toBe('');
  });

  it('names the DEM, then the pixel, then the sun', () => {
    expect(encodeView({ dem: 'gore', pixel: WEST, sun: DEFAULT_SUN }, 'gore')).toBe('dem=gore&px=150,210');
    expect(encodeView({ dem: 'gore', pixel: WEST, sun: LOW_SOUTHEAST }, 'gore')).toBe(
      'dem=gore&px=150,210&sun=120,35',
    );
    expect(encodeView({ dem: 'gore', pixel: null, sun: LOW_SOUTHEAST }, 'gore')).toBe('dem=gore&sun=120,35');
    expect(encodeView({ dem: 'second', pixel: null, sun: DEFAULT_SUN }, 'gore')).toBe('dem=second');
  });

  it('takes a view with no DEM to mean the first', () => {
    expect(encodeView({ dem: null, pixel: WEST, sun: DEFAULT_SUN }, 'gore')).toBe('dem=gore&px=150,210');
  });

  it('rounds the sun to whole degrees and writes 360 as 0', () => {
    const sun = { azimuth: 359.6, altitude: 34.5 };
    expect(encodeView({ dem: 'gore', pixel: null, sun }, 'gore')).toBe('dem=gore&sun=0,35');
  });

  it('leaves out a sun that rounds to the default', () => {
    const sun = { azimuth: 315.2, altitude: 44.8 };
    expect(encodeView({ dem: 'gore', pixel: null, sun }, 'gore')).toBe('');
  });

  it('escapes a DEM id that is not plain', () => {
    expect(encodeView({ dem: 'big bend & more', pixel: null, sun: DEFAULT_SUN }, 'gore')).toBe(
      'dem=big%20bend%20%26%20more',
    );
  });
});

describe('decodeView', () => {
  it('reads back everything encodeView writes', () => {
    const views: View[] = [
      { dem: 'gore', pixel: WEST, sun: DEFAULT_SUN },
      { dem: 'gore', pixel: WEST, sun: LOW_SOUTHEAST },
      { dem: 'gore', pixel: null, sun: LOW_SOUTHEAST },
      { dem: 'second', pixel: null, sun: DEFAULT_SUN },
      { dem: 'second', pixel: { col: 0, row: 0 }, sun: { azimuth: 0, altitude: 90 } },
      { dem: 'big bend & more', pixel: null, sun: DEFAULT_SUN },
    ];
    for (const view of views) expect(decodeView(encodeView(view, 'gore'))).toEqual(view);
  });

  it('reads nothing as the default view', () => {
    expect(decodeView('')).toEqual(DEFAULT_VIEW);
  });

  it('reads an escaped id and an escaped comma', () => {
    expect(decodeView('dem=big%20bend%20%26%20more&px=150%2C210')).toEqual({
      dem: 'big bend & more',
      pixel: WEST,
      sun: DEFAULT_SUN,
    });
  });

  it('drops a pixel that is not two whole numbers', () => {
    for (const px of ['', '150', '150,', ',210', '1.5,2', '-1,2', 'a,b', '1,2,3']) {
      expect(decodeView(`dem=gore&px=${px}`).pixel, `px=${px}`).toBeNull();
    }
  });

  it('falls back to the default sun when the sun is not two numbers', () => {
    for (const sun of ['', '120', '120,', ',35', 'a,b', '1,2,3']) {
      expect(decodeView(`sun=${sun}`).sun, `sun=${sun}`).toEqual(DEFAULT_SUN);
    }
  });

  it('wraps the azimuth, limits the height and rounds both', () => {
    expect(decodeView('sun=480,35').sun).toEqual({ azimuth: 120, altitude: 35 });
    expect(decodeView('sun=-45,35').sun).toEqual({ azimuth: 315, altitude: 35 });
    expect(decodeView('sun=120,2').sun).toEqual({ azimuth: 120, altitude: 10 });
    expect(decodeView('sun=120,400').sun).toEqual({ azimuth: 120, altitude: 90 });
    expect(decodeView('sun=120.4,34.6').sun).toEqual({ azimuth: 120, altitude: 35 });
  });

  it('ignores parts it does not know', () => {
    expect(decodeView('utm_source=x&dem=gore&zoom=3')).toEqual({ dem: 'gore', pixel: null, sun: DEFAULT_SUN });
  });
});

describe('pixelInside', () => {
  it('accepts every pixel of the DEM and nothing beyond it', () => {
    expect(pixelInside({ col: 0, row: 0 }, 288, 294)).toBe(true);
    expect(pixelInside({ col: 287, row: 293 }, 288, 294)).toBe(true);
    expect(pixelInside({ col: 150, row: 210 }, 288, 294)).toBe(true);
    expect(pixelInside({ col: 288, row: 0 }, 288, 294)).toBe(false);
    expect(pixelInside({ col: 0, row: 294 }, 288, 294)).toBe(false);
    expect(pixelInside({ col: -1, row: 0 }, 288, 294)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/state/view.test.ts`
Expected: FAIL, because `./view` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/state/view.ts`:

```ts
import { DEFAULT_SUN, MIN_SUN_ALTITUDE } from '../terrain/net';
import type { Pixel, Sun } from '../terrain/types';

/** What the screen shows: which DEM, which pixel is selected, and where the sun is. */
export interface View {
  /** The DEM's `id` in the list, or null for the first DEM. */
  dem: string | null;
  /** The selected pixel, or null when nothing is selected. */
  pixel: Pixel | null;
  /** In whole degrees, the precision the sun's label shows. */
  sun: Sun;
}

export const DEFAULT_VIEW: View = { dem: null, pixel: null, sun: DEFAULT_SUN };

/** The sun in whole degrees: azimuth 0 to 359, height within the limits a drag has. */
function wholeSun(sun: Sun): Sun {
  return {
    azimuth: ((Math.round(sun.azimuth) % 360) + 360) % 360,
    altitude: Math.min(90, Math.max(MIN_SUN_ALTITUDE, Math.round(sun.altitude))),
  };
}

/**
 * The view as text, such as `dem=gore&px=150,210&sun=120,35`. A part at its
 * default is left out, and the default view is the empty string. Any other
 * view names its DEM, so a link keeps its meaning if the list is reordered.
 */
export function encodeView(view: View, firstDem: string): string {
  const dem = view.dem ?? firstDem;
  const sun = wholeSun(view.sun);
  const defaultSun = sun.azimuth === DEFAULT_SUN.azimuth && sun.altitude === DEFAULT_SUN.altitude;
  if (dem === firstDem && !view.pixel && defaultSun) return '';
  const parts = [`dem=${encodeURIComponent(dem)}`];
  if (view.pixel) parts.push(`px=${view.pixel.col},${view.pixel.row}`);
  if (!defaultSun) parts.push(`sun=${sun.azimuth},${sun.altitude}`);
  return parts.join('&');
}

const WHOLE_PAIR = /^(\d{1,6}),(\d{1,6})$/;

function decodePixel(text: string | null): Pixel | null {
  const match = text?.match(WHOLE_PAIR);
  return match ? { col: Number(match[1]), row: Number(match[2]) } : null;
}

function decodeSun(text: string | null): Sun {
  const parts = text?.split(',') ?? [];
  if (parts.length !== 2 || parts.some((part) => part.trim() === '')) return DEFAULT_SUN;
  const [azimuth, altitude] = parts.map(Number);
  if (!Number.isFinite(azimuth) || !Number.isFinite(altitude)) return DEFAULT_SUN;
  return wholeSun({ azimuth, altitude });
}

/**
 * Reads what `encodeView` writes. It reads leniently: a part that cannot be
 * used is dropped and the rest still applies. Whether the DEM is in the list
 * and the pixel inside it is for the caller to check, once both are known.
 */
export function decodeView(text: string): View {
  const params = new URLSearchParams(text);
  return {
    dem: params.get('dem') || null,
    pixel: decodePixel(params.get('px')),
    sun: decodeSun(params.get('sun')),
  };
}

export function pixelInside(pixel: Pixel, width: number, height: number): boolean {
  return pixel.col >= 0 && pixel.row >= 0 && pixel.col < width && pixel.row < height;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/state/view.test.ts`
Expected: PASS, 14 tests.

Run: `npm test`
Expected: PASS, every file.

- [ ] **Step 5: Commit**

```bash
git add src/state/view.ts src/state/view.test.ts
git commit -m "Write the view as a short string" -m "The DEM, the selected pixel and the sun as text, such as dem=gore&px=150,210&sun=120,35, with defaults left out. The address bar and the saved view will both hold this string." -m "Claude-Session: https://claude.ai/code/session_0188RNZHUPogarCPaaFF2sKe"
```

---

### Task 2: Open on the view in the link, or the one saved

**Files:**
- Create: `src/state/viewStore.ts`
- Create: `src/state/useViewPersistence.ts`
- Modify: `src/state/useDems.ts`
- Modify: `src/App.tsx`
- Modify: `e2e/helpers.ts`
- Test: `e2e/restore.spec.ts` (new)

**Interfaces:**
- Consumes: `View`, `decodeView`, `pixelInside` from Task 1; `toIndex(pixel, width)` from `src/terrain/pick.ts`.
- Produces:
  - `viewStore.ts`: `VIEW_KEY = 'pixel-net:view'`, `readFragment(): string`, `readSaved(): string`.
  - `useDems(firstId: string | null = null)`; `LoadedDem` gains `id: string`, so `state.id` exists when `state.status === 'ready'`.
  - `useViewPersistence(options): void` with `options = { start: View; entries: DemEntry[]; activeId: string | null; loaded: LoadedView | null; selection: MotionValue<number>; onRestore: (selected: boolean) => void }` and `interface LoadedView { id: string; width: number; height: number }`. Task 3 adds options and a return value.
  - `e2e/helpers.ts`: `openLink(page, fragment)` and `clickPixel(page, col, row, dem?)`.

- [ ] **Step 1: Add two helpers the new browser tests share**

In `e2e/helpers.ts`, after `openApp`, add:

```ts
/**
 * Opens the app at a link and waits until the DEM is drawn. It must be the
 * page's first navigation, or follow `page.goto('about:blank')`: going from
 * one fragment to another does not load the page again.
 */
export async function openLink(page: Page, fragment: string): Promise<void> {
  await page.goto(`/#${fragment}`);
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(terrainImage(page)).toBeVisible();
}

/** Clicks the center of a DEM pixel on the terrain: a press and a release. */
export async function clickPixel(page: Page, col: number, row: number, dem = GORE): Promise<void> {
  const box = (await page.getByTestId('terrain-area').boundingBox())!;
  await page.mouse.click(
    box.x + ((col + 0.5) / dem.width) * box.width,
    box.y + ((row + 0.5) / dem.height) * box.height,
  );
}
```

- [ ] **Step 2: Write the failing browser tests**

Create `e2e/restore.spec.ts`:

```ts
import { type Page, expect, test } from '@playwright/test';
import {
  GORE,
  SECOND,
  caption,
  clickPixel,
  fingerprint,
  firstFacts,
  openApp,
  openLink,
  serveTwoDems,
  stage,
  terrainImage,
} from './helpers';

// Values of the bundled Gore Range DEM, by Horn's method.
const WEST_SLOPE = { col: 150, row: 210, slope: '36.0°', aspect: '259° W', elevation: '3,874 m' };
const SAVED = 'pixel-net:view';

const ring = (page: Page) => page.getByTestId('selection-ring');
const marker = (page: Page) => page.getByTestId('net-marker');
const slope = (page: Page) => page.getByTestId('slope');
const aspect = (page: Page) => page.getByTestId('aspect');
const elevation = (page: Page) => page.getByTestId('elevation');
const sunLabel = (page: Page) => page.getByTestId('sun-label');

test('a link opens its pixel and its sun', async ({ page }, testInfo) => {
  await openApp(page);
  const underDefaultSun = await fingerprint(terrainImage(page));

  await page.goto('about:blank');
  await openLink(page, 'dem=gore&px=150,210&sun=120,35');
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
  await expect(aspect(page)).toHaveText(WEST_SLOPE.aspect);
  await expect(elevation(page)).toHaveText(WEST_SLOPE.elevation);
  await expect(ring(page)).toHaveAttribute('data-visible', 'true');
  await expect(marker(page)).toHaveAttribute('data-visible', 'true');
  // The point arrives as on any first selection.
  await expect(marker(page)).toHaveAttribute('data-pulse', 'true');
  await expect(sunLabel(page)).toHaveText('120° SE · 35° high');
  expect(await fingerprint(terrainImage(page))).not.toBe(underDefaultSun);
  await expect(caption(page)).toHaveText(firstFacts(testInfo.project.name));
  // No one asked for it to be spoken.
  await expect(page.getByTestId('announcement')).toHaveText('');
});

test('the saved view is opened when the address has none', async ({ page }) => {
  await page.addInitScript(
    ([key, view]) => window.localStorage.setItem(key, view),
    [SAVED, 'dem=gore&px=150,210&sun=120,35'],
  );
  await openApp(page);
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
  await expect(ring(page)).toHaveAttribute('data-visible', 'true');
  await expect(sunLabel(page)).toHaveText('120° SE · 35° high');
});

test('a link wins over the saved view', async ({ page }) => {
  await page.addInitScript(([key, view]) => window.localStorage.setItem(key, view), [SAVED, 'dem=gore&px=200,230']);
  await openLink(page, 'dem=gore&px=150,210');
  await expect(aspect(page)).toHaveText(WEST_SLOPE.aspect);
});

test('a link to another DEM opens it with its pixel', async ({ page }) => {
  await serveTwoDems(page);
  await openLink(page, 'dem=second&px=30,20');
  await expect(terrainImage(page)).toHaveJSProperty('width', SECOND.width);
  await expect(page.getByRole('tab', { name: 'Second' })).toHaveAttribute('aria-selected', 'true');
  // The second DEM is a uniform slope facing northwest.
  await expect(slope(page)).toHaveText('35.8°');
  await expect(aspect(page)).toHaveText('304° NW');
});

test('a link to a DEM that is not in the list opens the first DEM with no pixel', async ({ page }) => {
  await openLink(page, 'dem=ghost&px=10,10&sun=120,35');
  await expect(terrainImage(page)).toHaveJSProperty('width', GORE.width);
  await expect(slope(page)).toHaveText('–');
  await expect(ring(page)).toHaveAttribute('data-visible', 'false');
  // The rest of the link still applies.
  await expect(sunLabel(page)).toHaveText('120° SE · 35° high');
});

test('a pixel outside the DEM is ignored', async ({ page }) => {
  await openLink(page, 'dem=gore&px=999,999');
  await expect(slope(page)).toHaveText('–');
  await expect(ring(page)).toHaveAttribute('data-visible', 'false');
  await expect(marker(page)).toHaveAttribute('data-visible', 'false');
});

test('a pixel waiting for its DEM is dropped when another DEM is chosen first', async ({ page }) => {
  await serveTwoDems(page, 600);
  await page.goto('/#dem=second&px=30,20');
  // The second DEM is still on its way; the picker is already there.
  await page.getByRole('tab', { name: 'Gore Range' }).click();
  await expect(terrainImage(page)).toHaveJSProperty('width', GORE.width);
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  // Long enough for the abandoned DEM to have arrived, had it been waited for.
  await page.waitForTimeout(800);
  await expect(slope(page)).toHaveText('–');
  await expect(ring(page)).toHaveAttribute('data-visible', 'false');
});

test('storage that refuses to be used does not stop the app', async ({ page }) => {
  await page.addInitScript(() => {
    const refuse = () => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    };
    Storage.prototype.getItem = refuse;
    Storage.prototype.setItem = refuse;
    Storage.prototype.removeItem = refuse;
  });
  await openApp(page);
  await clickPixel(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test e2e/restore.spec.ts`
Expected: FAIL. The link and saved-view tests fail on the readout still showing "–" or the sun label still reading "315° NW · 45° high". "a pixel outside the DEM is ignored" and "storage that refuses…" may already pass; that is fine.

- [ ] **Step 4: Create the store's read side**

Create `src/state/viewStore.ts`:

```ts
/**
 * Where the view's string is kept: after `#` in the address, and on the
 * device. The github.io origin is shared with other sites, hence the prefix.
 */
export const VIEW_KEY = 'pixel-net:view';

/** The view written after `#` in the address, or '' when there is none. */
export function readFragment(): string {
  return window.location.hash.replace(/^#/, '');
}

/** The view saved on this device, or '' when there is none or storage is closed to us. */
export function readSaved(): string {
  try {
    return window.localStorage.getItem(VIEW_KEY) ?? '';
  } catch {
    return '';
  }
}
```

- [ ] **Step 5: Let `useDems` open on a given DEM, and say which DEM it loaded**

In `src/state/useDems.ts`, replace the `LoadedDem` interface:

```ts
export interface LoadedDem {
  /** The `id` of the entry this DEM was loaded from. */
  id: string;
  dem: Dem;
  surface: Surface;
}
```

Replace the hook's doc comment, signature and the `activeId` state:

```ts
/**
 * Loads the DEM list and the selected DEM, and reloads when the selection
 * changes. `firstId` is the DEM to open on; null, or an id that is not in
 * the list, opens the first.
 */
export function useDems(firstId: string | null = null) {
  const [entries, setEntries] = useState<DemEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(firstId);
```

Inside the effect, replace the `previous:` expression so the id is carried along:

```ts
      previous:
        current.status === 'ready'
          ? { id: current.id, dem: current.dem, surface: current.surface }
          : current.status === 'loading'
            ? current.previous
            : undefined,
```

and replace the line that sets the ready state:

```ts
        if (!cancelled) setState({ status: 'ready', id: entry.id, dem, surface });
```

- [ ] **Step 6: Write the hook that applies a view**

Create `src/state/useViewPersistence.ts`:

```ts
import type { MotionValue } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';
import { toIndex } from '../terrain/pick';
import type { DemEntry } from './useDems';
import { type View, pixelInside } from './view';

/** The DEM on screen, once it has loaded. */
export interface LoadedView {
  id: string;
  width: number;
  height: number;
}

interface ViewPersistenceOptions {
  /** The view to open on. */
  start: View;
  /** The DEMs in the list; empty until the list has loaded. */
  entries: DemEntry[];
  /** The DEM being shown or loaded, or null before the list has loaded. */
  activeId: string | null;
  /** The DEM on screen, or null while one loads or after a failure. */
  loaded: LoadedView | null;
  /** Index of the selected pixel, or −1. */
  selection: MotionValue<number>;
  /** A view was applied; `selected` says whether it selected a pixel. */
  onRestore: (selected: boolean) => void;
}

/**
 * Opens the app on a view: selects the view's pixel once the DEM it belongs
 * to has loaded. The sun and the DEM are given their starting values by the
 * caller, before the first paint.
 */
export function useViewPersistence(options: ViewPersistenceOptions): void {
  const { start, selection, loaded, activeId } = options;
  // What `settle` reads, kept current without rebuilding it.
  const latest = useRef(options);
  latest.current = options;
  // The view still to be applied, while its DEM is on the way.
  const waiting = useRef<View | null>(start);

  const settle = useCallback(() => {
    const view = waiting.current;
    const { entries, activeId, loaded, onRestore } = latest.current;
    // Nothing to apply, or the DEM on screen is not yet the one being opened.
    if (!view || !loaded || loaded.id !== activeId) return;
    waiting.current = null;
    // A pixel belongs to the DEM its view names; with no name, to the first.
    // If the user has chosen another DEM since, the pixel is not theirs.
    const pixel = (view.dem ?? entries[0]?.id) === loaded.id ? view.pixel : null;
    if (pixel && pixelInside(pixel, loaded.width, loaded.height)) {
      selection.set(toIndex(pixel, loaded.width));
      onRestore(true);
    } else {
      if (selection.get() >= 0) selection.set(-1);
      onRestore(false);
    }
  }, [selection]);

  useEffect(settle, [settle, loaded, activeId]);
}
```

- [ ] **Step 7: Wire it into `App`**

In `src/App.tsx`:

Change the React import and add three imports; remove the `DEFAULT_SUN` import, which is no longer used:

```tsx
import { type CSSProperties, useCallback, useMemo, useRef, useState } from 'react';
```

```tsx
import { useDems } from './state/useDems';
import { useViewPersistence } from './state/useViewPersistence';
import { decodeView } from './state/view';
import { readFragment, readSaved } from './state/viewStore';
import { describeReadout, readoutFor } from './terrain/format';
```

Delete this line:

```tsx
import { DEFAULT_SUN } from './terrain/net';
```

Replace the first lines of `App()`, down to the two sun motion values:

```tsx
export function App() {
  // The view to open on: the one in the link, or else the one saved on this device.
  const [start] = useState(() => decodeView(readFragment() || readSaved()));
  const { entries, active, state, select, retry } = useDems(start.dem);
  const stageRef = useRef<HTMLElement>(null);
  const stage = useElementSize(stageRef);
  const coarse = useCoarsePointer();
  const selection = useMotionValue(-1); // index of the selected pixel, or −1
  const sunAzimuth = useMotionValue(start.sun.azimuth);
  const sunAltitude = useMotionValue(start.sun.altitude);
```

After `handleClear` and before `const netCard`, add:

```tsx
  // A pixel from a link, or from the saved view, is selected once its DEM has loaded.
  const loaded = useMemo(
    () => (state.status === 'ready' ? { id: state.id, width: state.dem.width, height: state.dem.height } : null),
    [state],
  );
  useViewPersistence({
    start,
    entries,
    activeId: active?.id ?? null,
    loaded,
    selection,
    onRestore: setHasSelection,
  });
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test e2e/restore.spec.ts`
Expected: PASS, 8 tests in each of the two projects.

Run: `npm test`
Expected: PASS.

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test`
Expected: PASS for the whole suite (141 passed and 7 skipped before this task, plus the new tests). `npm run build` runs as part of it, so the types check too.

- [ ] **Step 9: Commit**

```bash
git add src/state/viewStore.ts src/state/useViewPersistence.ts src/state/useDems.ts src/App.tsx e2e/helpers.ts e2e/restore.spec.ts
git commit -m "Open on the view in the link, or the one saved on the device" -m "The address's fragment, or else the saved string, gives the DEM, the pixel and the sun to open on. The sun and the DEM start there before the first paint; the pixel is selected once its DEM has loaded, and is dropped if it lies outside the DEM, if its DEM is not in the list, or if the user has chosen another DEM in the meantime." -m "Claude-Session: https://claude.ai/code/session_0188RNZHUPogarCPaaFF2sKe"
```

---

### Task 3: Keep the address and the saved view up to date

**Files:**
- Modify: `src/state/viewStore.ts`
- Modify: `src/state/useViewPersistence.ts` (replace the whole file)
- Modify: `src/App.tsx`
- Test: `e2e/restore.spec.ts` (append)

**Interfaces:**
- Consumes: `encodeView`, `decodeView`, `pixelInside`, `View` from Task 1; `readFragment`, `VIEW_KEY` from Task 2; `toIndex`, `toPixel` from `src/terrain/pick.ts`.
- Produces:
  - `viewStore.ts`: `linkTo(view: string): string` (the page's address with the view as its fragment) and `writeView(view: string): void`.
  - `useViewPersistence(options): () => string | null`. New options: `sunAzimuth: MotionValue<number>`, `sunAltitude: MotionValue<number>`, `onSelectDem: (id: string) => void`. The returned function gives the current view as text, or null before the list of DEMs has loaded. Task 5 uses it.

- [ ] **Step 1: Write the failing browser tests**

In `e2e/restore.spec.ts`, add `hint` to the import from `./helpers`, and append:

```ts
const fragment = (page: Page) => page.evaluate(() => window.location.hash);
const saved = (page: Page) => page.evaluate((key) => window.localStorage.getItem(key), SAVED);

test('the app reopens where it was left', async ({ page }) => {
  await openApp(page);
  await clickPixel(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await page.getByTestId('sun').focus();
  // Three steps of 5° take the sun from 315° to 330°.
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  await expect.poll(() => saved(page)).toBe('dem=gore&px=150,210&sun=330,45');

  await page.reload();
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
  await expect(ring(page)).toHaveAttribute('data-visible', 'true');
  await expect(sunLabel(page)).toHaveText('330° NW · 45° high');

  // The installed app opens at the bare address: the saved view alone restores it.
  await page.goto('about:blank');
  await openApp(page);
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
  await expect(sunLabel(page)).toHaveText('330° NW · 45° high');
});

test('the address follows the view, and is bare again at the default view', async ({ page }) => {
  await openApp(page);
  expect(await fragment(page)).toBe('');
  const entries = await page.evaluate(() => window.history.length);

  await clickPixel(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await expect.poll(() => fragment(page)).toBe('#dem=gore&px=150,210');

  await page.getByTestId('terrain-area').focus();
  await page.keyboard.press('Escape');
  await expect.poll(() => fragment(page)).toBe('');
  expect(await saved(page)).toBeNull();
  // The address is replaced in place, so Back still leaves the app.
  expect(await page.evaluate(() => window.history.length)).toBe(entries);
});

test('the view is saved at once when the page is hidden', async ({ page }) => {
  await openApp(page);
  // One synchronous step: select the center pixel with a key, then hide the
  // page, so the 400 ms timer has had no chance to run.
  const savedAtOnce = await page.getByTestId('terrain-area').evaluate((area, key) => {
    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    return window.localStorage.getItem(key);
  }, SAVED);
  expect(savedAtOnce).toBe('dem=gore&px=144,147');
});

test('a link pasted into the open tab is applied', async ({ page }, testInfo) => {
  await openApp(page);
  await page.evaluate(() => {
    window.location.hash = 'dem=gore&px=150,210&sun=120,35';
  });
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
  await expect(ring(page)).toHaveAttribute('data-visible', 'true');
  await expect(sunLabel(page)).toHaveText('120° SE · 35° high');

  // A link describes the whole view: one with no pixel clears the selection.
  await page.evaluate(() => {
    window.location.hash = 'dem=gore&sun=200,60';
  });
  await expect(slope(page)).toHaveText('–');
  await expect(ring(page)).toHaveAttribute('data-visible', 'false');
  await expect(sunLabel(page)).toHaveText('200° S · 60° high');
  await expect(caption(page)).toHaveText(hint(testInfo.project.name));
});

test('a pasted link to another DEM switches to it', async ({ page }) => {
  await serveTwoDems(page);
  await openApp(page);
  await page.evaluate(() => {
    window.location.hash = 'dem=second&px=30,20';
  });
  await expect(terrainImage(page)).toHaveJSProperty('width', SECOND.width);
  await expect(slope(page)).toHaveText('35.8°');
  await expect.poll(() => saved(page)).toBe('dem=second&px=30,20');
});

test('an address emptied by hand is left alone and filled in at the next change', async ({ page }) => {
  await openLink(page, 'dem=gore&px=150,210');
  await page.evaluate(() => {
    window.location.hash = '';
  });
  await page.waitForTimeout(600); // longer than the write delay
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);

  await clickPixel(page, 200, 230);
  await expect.poll(() => fragment(page)).toBe('#dem=gore&px=200,230');
});

test('a link with a part that cannot be used is corrected in the address', async ({ page }) => {
  await openLink(page, 'dem=ghost&px=10,10&sun=120,35');
  await expect.poll(() => fragment(page)).toBe('#dem=gore&sun=120,35');

  await page.goto('about:blank');
  await openLink(page, 'dem=gore&px=999,999');
  await expect.poll(() => fragment(page)).toBe('');
  await expect.poll(() => saved(page)).toBeNull();
});

test('opening a link makes it the saved view', async ({ page }) => {
  await openLink(page, 'dem=gore&px=150,210');
  await expect.poll(() => saved(page)).toBe('dem=gore&px=150,210');
});

test('a dragged sun is written in whole degrees and reopens where its label said', async ({ page }) => {
  await openApp(page);
  const box = (await page.getByTestId('sun').boundingBox())!;
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 37.3, from.y + 21.7, { steps: 5 });
  await page.mouse.up();
  const label = await sunLabel(page).textContent();
  expect(label).not.toBe('315° NW · 45° high');
  await expect.poll(() => fragment(page)).toMatch(/^#dem=gore&sun=\d+,\d+$/);

  await page.reload();
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(sunLabel(page)).toHaveText(label!);
});

test('an address that already has a query keeps it', async ({ page }) => {
  await page.goto('/?ref=mail#dem=gore&px=150,210');
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);

  await clickPixel(page, 200, 230);
  await expect
    .poll(() => page.evaluate(() => window.location.search + window.location.hash))
    .toBe('?ref=mail#dem=gore&px=200,230');
});
```

Also extend the last test of Task 2, "storage that refuses to be used does not stop the app", with one more line at its end, so that it covers writing too:

```ts
  // The address still follows the view; only the saving is lost.
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('#dem=gore&px=150,210');
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test e2e/restore.spec.ts`
Expected: the Task 2 tests still pass except the extended storage test; every new test FAILS (nothing is written, and a changed fragment is not applied).

- [ ] **Step 3: Add the store's write side**

Append to `src/state/viewStore.ts`:

```ts
/** The page's address with `view` as its fragment: the link that reopens the view. */
export function linkTo(view: string): string {
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}${view ? `#${view}` : ''}`;
}

/**
 * Puts the view in the address bar, in place, and saves it on this device.
 * Either can be refused (a private window, Safari's limit on address
 * changes); the app carries on without it.
 */
export function writeView(view: string): void {
  try {
    if (readFragment() !== view) window.history.replaceState(window.history.state, '', linkTo(view));
  } catch {
    // The address stays as it was.
  }
  try {
    if (view) window.localStorage.setItem(VIEW_KEY, view);
    else window.localStorage.removeItem(VIEW_KEY);
  } catch {
    // Nothing is saved.
  }
}
```

- [ ] **Step 4: Replace the hook with the full one**

Replace the whole of `src/state/useViewPersistence.ts` with:

```ts
import type { MotionValue } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';
import { toIndex, toPixel } from '../terrain/pick';
import type { DemEntry } from './useDems';
import { type View, decodeView, encodeView, pixelInside } from './view';
import { readFragment, writeView } from './viewStore';

const WRITE_AFTER_MS = 400; // quiet time after the last change before the view is written

/** The DEM on screen, once it has loaded. */
export interface LoadedView {
  id: string;
  width: number;
  height: number;
}

interface ViewPersistenceOptions {
  /** The view to open on. */
  start: View;
  /** The DEMs in the list; empty until the list has loaded. */
  entries: DemEntry[];
  /** The DEM being shown or loaded, or null before the list has loaded. */
  activeId: string | null;
  /** The DEM on screen, or null while one loads or after a failure. */
  loaded: LoadedView | null;
  /** Index of the selected pixel, or −1. */
  selection: MotionValue<number>;
  sunAzimuth: MotionValue<number>;
  sunAltitude: MotionValue<number>;
  /** Switches to another DEM, as the picker does. */
  onSelectDem: (id: string) => void;
  /** A view was applied; `selected` says whether it selected a pixel. */
  onRestore: (selected: boolean) => void;
}

/**
 * Keeps the view (which DEM, which pixel, where the sun is) in step with the
 * address bar and with what is saved on the device.
 *
 * Reading: the view to open on has its pixel selected once its DEM has
 * loaded, and a link pasted into the open tab is applied the same way.
 * Writing: 400 ms after the last change, so never during a drag, and at once
 * when the page is hidden.
 *
 * Returns a function that gives the view as text, or null before the list
 * of DEMs has loaded.
 */
export function useViewPersistence(options: ViewPersistenceOptions): () => string | null {
  const { start, selection, sunAzimuth, sunAltitude, loaded, activeId } = options;
  // What the callbacks below read, kept current without rebuilding them.
  const latest = useRef(options);
  latest.current = options;
  // The view still to be applied, while its DEM is on the way.
  const waiting = useRef<View | null>(start);
  const timer = useRef<number | undefined>(undefined);

  const viewText = useCallback((): string | null => {
    const { entries, activeId, loaded } = latest.current;
    if (!activeId || entries.length === 0) return null;
    const index = selection.get();
    // While another DEM loads there is no pixel to name: the switch cleared it.
    const pixel = index >= 0 && loaded?.id === activeId ? toPixel(index, loaded.width) : null;
    return encodeView(
      { dem: activeId, pixel, sun: { azimuth: sunAzimuth.get(), altitude: sunAltitude.get() } },
      entries[0].id,
    );
  }, [selection, sunAzimuth, sunAltitude]);

  const write = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    // A view still waiting for its DEM must not be overwritten by what is on screen.
    if (waiting.current) return;
    const text = viewText();
    if (text !== null) writeView(text);
  }, [viewText]);

  const schedule = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(write, WRITE_AFTER_MS);
  }, [write]);

  const settle = useCallback(() => {
    const view = waiting.current;
    const { entries, activeId, loaded, onRestore } = latest.current;
    // Nothing to apply, or the DEM on screen is not yet the one being opened.
    if (!view || !loaded || loaded.id !== activeId) return;
    waiting.current = null;
    // A pixel belongs to the DEM its view names; with no name, to the first.
    // If the user has chosen another DEM since, the pixel is not theirs.
    const pixel = (view.dem ?? entries[0]?.id) === loaded.id ? view.pixel : null;
    if (pixel && pixelInside(pixel, loaded.width, loaded.height)) {
      selection.set(toIndex(pixel, loaded.width));
      onRestore(true);
    } else {
      if (selection.get() >= 0) selection.set(-1);
      onRestore(false);
    }
    // The address and the saved view now say what is shown, which corrects
    // a link with a part that could not be used.
    write();
  }, [selection, write]);

  /** Applies a view read from the address while the app is open. */
  const apply = useCallback(
    (view: View) => {
      const { entries, activeId, onSelectDem } = latest.current;
      sunAzimuth.set(view.sun.azimuth);
      sunAltitude.set(view.sun.altitude);
      waiting.current = view;
      // A DEM that is not in the list means the first, as it does on opening.
      const wanted = entries.find((entry) => entry.id === view.dem)?.id ?? entries[0]?.id;
      if (wanted && wanted !== activeId) onSelectDem(wanted); // the pixel waits for its DEM
      else settle();
    },
    [sunAzimuth, sunAltitude, settle],
  );

  // The waiting view is applied when its DEM arrives.
  useEffect(settle, [settle, loaded, activeId]);

  // Whatever changes the view starts the timer: a drag, a key, a reset.
  useEffect(() => {
    const stops = [
      selection.on('change', schedule),
      sunAzimuth.on('change', schedule),
      sunAltitude.on('change', schedule),
    ];
    return () => {
      for (const stop of stops) stop();
      window.clearTimeout(timer.current);
    };
  }, [selection, sunAzimuth, sunAltitude, schedule]);

  // So does a switch of DEM.
  useEffect(() => {
    if (activeId) schedule();
  }, [activeId, schedule]);

  // A page that is hidden or closed may never run its timer: write now.
  useEffect(() => {
    const flush = () => {
      if (timer.current !== undefined) write();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [write]);

  // Another link pasted into the open tab, or the address edited by hand.
  // Our own writes replace the address in place and do not fire this.
  useEffect(() => {
    const onHashChange = () => {
      const text = readFragment();
      // An emptied address is left alone; the next change fills it in again.
      if (text) apply(decodeView(text));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [apply]);

  return viewText;
}
```

- [ ] **Step 5: Pass the hook the sun and the DEM switch**

In `src/App.tsx`, replace the `useViewPersistence({ … })` call added in Task 2 with the following. The returned function is not used until Task 5, so it is not assigned yet (an unused local fails the build):

```tsx
  useViewPersistence({
    start,
    entries,
    activeId: active?.id ?? null,
    loaded,
    selection,
    sunAzimuth,
    sunAltitude,
    onSelectDem: selectDem,
    onRestore: setHasSelection,
  });
```

`selectDem` is already defined above this call; it clears the selection, empties the announcement and switches the DEM, which is what a link to another DEM needs.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test e2e/restore.spec.ts`
Expected: PASS, 18 tests in each project.

Run: `npm test`
Expected: PASS.

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test`
Expected: PASS for the whole suite.

- [ ] **Step 7: Commit**

```bash
git add src/state/viewStore.ts src/state/useViewPersistence.ts src/App.tsx e2e/restore.spec.ts
git commit -m "Keep the address and the saved view in step with the screen" -m "The view is written to the address's fragment and to the device 400 ms after the last change, so never during a drag, and at once when the page is hidden, so a killed tab keeps its place. The address is replaced in place and gains no history entries. A link pasted into the open tab is applied, switching DEMs if it must." -m "Claude-Session: https://claude.ai/code/session_0188RNZHUPogarCPaaFF2sKe"
```

---

### Task 4: Where the picture's parts go, and what it says

**Files:**
- Create: `src/share/cardLayout.ts`
- Create: `src/share/text.ts`
- Modify: `src/terrain/format.ts`
- Modify: `src/App.tsx` (two lines)
- Test: `src/share/cardLayout.test.ts`, `src/share/text.test.ts` (new), `src/terrain/format.test.ts` (append)

**Interfaces:**
- Consumes: `ReadoutText`, `EMPTY_READOUT`, `describeReadout` from `src/terrain/format.ts`; `formatSun` from `src/terrain/net.ts`; `Dem`, `Sun` from `src/terrain/types.ts`.
- Produces:
  - `format.ts`: `NO_DATA` becomes exported; `pixelSize(dem: Dem): string`; `demFacts(place: string, dem: Dem): string`.
  - `cardLayout.ts`: `interface Box { x; y; width; height }`, `interface CardLayout { width: number; height: number; terrain: Box; net: Box; caption: { x: number; width: number; lines: Array<{ y: number; height: number }> } }`, `cardLayout({ mode, aspect, lines }: { mode: 'portrait' | 'wide'; aspect: number; lines: number[] }): CardLayout`. `lines` are the caption's line heights, top to bottom. This file imports nothing, so the browser tests can import it too.
  - `text.ts`: `interface CaptionLine { text: string; size: number; height: number; weight: 400 | 600; ink: 'ink-900' | 'ink-500' }`, `shareText(place: string, readout: ReadoutText): string`, `captionLines({ place, dem, readout, sun, site }): CaptionLine[]`, `siteName(host: string, pathname: string): string`, `fileName(appName: string, demId: string): string`.

- [ ] **Step 1: Write the failing tests**

Create `src/share/cardLayout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { type Box, cardLayout } from './cardLayout';

const GORE = 288 / 294;
const WITH_READOUT = [40, 28, 28];
const WITHOUT_READOUT = [28, 28];

describe('cardLayout', () => {
  it('puts the terrain left of the net when the cards sit side by side', () => {
    expect(cardLayout({ mode: 'wide', aspect: GORE, lines: WITH_READOUT })).toEqual({
      width: 1561,
      height: 940,
      terrain: { x: 48, y: 48, width: 705, height: 720 },
      net: { x: 793, y: 48, width: 720, height: 720 },
      caption: {
        x: 48,
        width: 1465,
        lines: [
          { y: 796, height: 40 },
          { y: 836, height: 28 },
          { y: 864, height: 28 },
        ],
      },
    });
  });

  it('puts the net above the terrain when the cards are stacked', () => {
    expect(cardLayout({ mode: 'portrait', aspect: GORE, lines: WITH_READOUT })).toEqual({
      width: 816,
      height: 1715,
      terrain: { x: 48, y: 808, width: 720, height: 735 },
      net: { x: 48, y: 48, width: 720, height: 720 },
      caption: {
        x: 48,
        width: 720,
        lines: [
          { y: 1571, height: 40 },
          { y: 1611, height: 28 },
          { y: 1639, height: 28 },
        ],
      },
    });
  });

  it('is shorter by the readout line when nothing is selected', () => {
    expect(cardLayout({ mode: 'wide', aspect: GORE, lines: WITHOUT_READOUT }).height).toBe(900);
    expect(cardLayout({ mode: 'portrait', aspect: GORE, lines: WITHOUT_READOUT }).height).toBe(1675);
  });

  it('lets a wide terrain reach the limit and no further, centered beside the net', () => {
    const twice = cardLayout({ mode: 'wide', aspect: 2, lines: WITHOUT_READOUT });
    expect(twice.terrain).toEqual({ x: 48, y: 48, width: 1440, height: 720 });
    const thrice = cardLayout({ mode: 'wide', aspect: 3, lines: WITHOUT_READOUT });
    expect(thrice.terrain).toEqual({ x: 48, y: 168, width: 1440, height: 480 });
    expect(thrice.net.x).toBe(1528);
    expect(thrice.width).toBe(2296);
  });

  it('lets a tall terrain reach the limit and no further, centered under the net', () => {
    const twice = cardLayout({ mode: 'portrait', aspect: 0.5, lines: WITHOUT_READOUT });
    expect(twice.terrain).toEqual({ x: 48, y: 808, width: 720, height: 1440 });
    const thrice = cardLayout({ mode: 'portrait', aspect: 1 / 3, lines: WITHOUT_READOUT });
    expect(thrice.terrain).toEqual({ x: 168, y: 808, width: 480, height: 1440 });
    expect(thrice.height).toBe(2380);
  });

  it('keeps everything inside the picture and apart, whatever the shape of the DEM', () => {
    const overlap = (a: Box, b: Box) =>
      a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    for (const mode of ['wide', 'portrait'] as const) {
      for (const aspect of [0.2, 1 / 3, 0.5, GORE, 1, 2, 3, 5]) {
        const card = cardLayout({ mode, aspect, lines: WITH_READOUT });
        const lines = card.caption.lines.map((line) => ({
          x: card.caption.x,
          y: line.y,
          width: card.caption.width,
          height: line.height,
        }));
        const boxes = [card.terrain, card.net, ...lines];
        for (const box of boxes) {
          expect(box.width).toBeGreaterThan(0);
          expect(box.height).toBeGreaterThan(0);
          expect(box.x).toBeGreaterThanOrEqual(48);
          expect(box.y).toBeGreaterThanOrEqual(48);
          expect(box.x + box.width).toBeLessThanOrEqual(card.width - 48);
          expect(box.y + box.height).toBeLessThanOrEqual(card.height - 48);
        }
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            expect(overlap(boxes[i], boxes[j]), `${mode} at ${aspect}: boxes ${i} and ${j}`).toBe(false);
          }
        }
      }
    }
  });

  it('treats a shape that is not a positive number as square', () => {
    const square = { x: 48, y: 48, width: 720, height: 720 };
    expect(cardLayout({ mode: 'wide', aspect: 0, lines: WITHOUT_READOUT }).terrain).toEqual(square);
    expect(cardLayout({ mode: 'wide', aspect: Number.NaN, lines: WITHOUT_READOUT }).terrain).toEqual(square);
  });
});
```

Create `src/share/text.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { EMPTY_READOUT, NO_DATA, type ReadoutText } from '../terrain/format';
import { DEFAULT_SUN } from '../terrain/net';
import type { Dem } from '../terrain/types';
import { captionLines, fileName, shareText, siteName } from './text';

const PLACE = 'Gore Range, Colorado';
const SITE = 'lpeezydos-arch.github.io/Pixel-Net';
const WEST: ReadoutText = { slope: '36.0°', aspect: '259° W', elevation: '3,874 m' };
// Only the DEM's size is read here.
const DEM: Dem = { width: 288, height: 294, cellSize: 5, elevation: new Float32Array(0), nodata: new Uint8Array(0) };

describe('shareText', () => {
  it('gives the place and what was read there', () => {
    expect(shareText(PLACE, WEST)).toBe('Gore Range, Colorado: slope 36.0°, aspect 259° W, elevation 3,874 m');
  });

  it('says so when the pixel has no data', () => {
    expect(shareText(PLACE, NO_DATA)).toBe('Gore Range, Colorado: no data at this pixel');
  });

  it('is the place alone when nothing is selected', () => {
    expect(shareText(PLACE, EMPTY_READOUT)).toBe('Gore Range, Colorado');
  });
});

describe('captionLines', () => {
  it('writes the readout, the facts and the source', () => {
    expect(captionLines({ place: PLACE, dem: DEM, readout: WEST, sun: DEFAULT_SUN, site: SITE })).toEqual([
      {
        text: 'Slope 36.0° · Aspect 259° W · Elevation 3,874 m',
        size: 30,
        height: 40,
        weight: 600,
        ink: 'ink-900',
      },
      { text: 'Gore Range, Colorado · 5 m pixels · 288 × 294', size: 20, height: 28, weight: 400, ink: 'ink-500' },
      {
        text: 'Sun 315° NW · 45° high · lpeezydos-arch.github.io/Pixel-Net',
        size: 20,
        height: 28,
        weight: 400,
        ink: 'ink-500',
      },
    ]);
  });

  it('has no readout line when nothing is selected', () => {
    const lines = captionLines({ place: PLACE, dem: DEM, readout: EMPTY_READOUT, sun: DEFAULT_SUN, site: SITE });
    expect(lines.map((line) => line.height)).toEqual([28, 28]);
    expect(lines[0].text).toBe('Gore Range, Colorado · 5 m pixels · 288 × 294');
  });

  it('says so when the pixel has no data', () => {
    const lines = captionLines({ place: PLACE, dem: DEM, readout: NO_DATA, sun: DEFAULT_SUN, site: SITE });
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatchObject({ text: 'No data at this pixel', size: 30, weight: 600 });
  });

  it('writes a sun at the top of the sky as overhead', () => {
    const sun = { azimuth: 120, altitude: 90 };
    const lines = captionLines({ place: PLACE, dem: DEM, readout: EMPTY_READOUT, sun, site: SITE });
    expect(lines[1].text).toBe('Sun overhead · lpeezydos-arch.github.io/Pixel-Net');
  });
});

describe('siteName', () => {
  it('is the host and the path with no trailing slash', () => {
    expect(siteName('lpeezydos-arch.github.io', '/Pixel-Net/')).toBe('lpeezydos-arch.github.io/Pixel-Net');
    expect(siteName('localhost:4173', '/')).toBe('localhost:4173');
    expect(siteName('example.org', '/app/index.html')).toBe('example.org/app');
  });
});

describe('fileName', () => {
  it('is made of the app name and the DEM id, in plain lowercase', () => {
    expect(fileName('Pixel Net', 'gore')).toBe('pixel-net-gore.png');
    expect(fileName('Pixel Net', 'Big Bend #2')).toBe('pixel-net-big-bend-2.png');
    expect(fileName('', '')).toBe('view.png');
  });
});
```

In `src/terrain/format.test.ts`, add `demFacts` and `pixelSize` to the import from `./format`, and append:

```ts
describe('demFacts', () => {
  it('writes the place, the pixel size and the dimensions', () => {
    const dem = demFrom(288, 294, 5, () => 0);
    expect(pixelSize(dem)).toBe('5 m pixels');
    expect(demFacts('Gore Range, Colorado', dem)).toBe('Gore Range, Colorado · 5 m pixels · 288 × 294');
  });

  it('keeps two decimals of an uneven pixel size and drops trailing zeros', () => {
    expect(pixelSize(demFrom(2, 2, 4.99712, () => 0))).toBe('5 m pixels');
    expect(pixelSize(demFrom(2, 2, 0.5, () => 0))).toBe('0.5 m pixels');
    expect(pixelSize(demFrom(2, 2, 9.144, () => 0))).toBe('9.14 m pixels');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/share src/terrain/format.test.ts`
Expected: FAIL. `./cardLayout` and `./text` do not exist, and `format.ts` exports neither `NO_DATA`, `demFacts` nor `pixelSize`.

- [ ] **Step 3: Export what the caption needs from `format.ts`**

In `src/terrain/format.ts`, add `export` to the `NO_DATA` constant:

```ts
export const NO_DATA: ReadoutText = { slope: 'No data', aspect: 'No data', elevation: 'No data' };
```

and add after `describeSun`:

```ts
/** The DEM's pixel size, as the caption writes it. */
export function pixelSize(dem: Dem): string {
  return `${Number(dem.cellSize.toFixed(2))} m pixels`;
}

/** The DEM's facts, as the caption writes them. */
export function demFacts(place: string, dem: Dem): string {
  return `${place} · ${pixelSize(dem)} · ${dem.width} × ${dem.height}`;
}
```

In `src/App.tsx`, use them, so the screen's caption and the picture's cannot drift apart. Change the import:

```tsx
import { demFacts, describeReadout, pixelSize, readoutFor } from './terrain/format';
```

and replace the `cell` and `facts` lines:

```tsx
  const cell = ready ? pixelSize(ready.dem) : '';
  const facts = ready ? demFacts(ready.place, ready.dem) : '';
```

- [ ] **Step 4: Write the layout**

Create `src/share/cardLayout.ts`:

```ts
/**
 * Where everything goes in the picture that is shared. Sizes are in image
 * pixels and do not depend on the screen. This file imports nothing, so the
 * browser tests can use it to know what size to expect.
 */

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CardLayout {
  width: number;
  height: number;
  terrain: Box;
  /** The square the net is drawn in. */
  net: Box;
  /** The caption: its left edge, the width a line may take, and each line's box. */
  caption: { x: number; width: number; lines: Array<{ y: number; height: number }> };
}

interface CardOptions {
  /** The screen's arrangement, which the picture follows. */
  mode: 'portrait' | 'wide';
  /** The DEM's width divided by its height. */
  aspect: number;
  /** Heights of the caption's lines, top to bottom. */
  lines: number[];
}

const CARD_SIDE = 720; // the net's side; the terrain's height side by side, its width stacked
const CARD_LIMIT = 1440; // the longest a terrain side may be
const CARD_PAD = 48; // space around
const CARD_GAP = 40; // space between the terrain and the net
const CAPTION_GAP = 28; // space above the caption

export function cardLayout({ mode, aspect, lines }: CardOptions): CardLayout {
  const wide = mode === 'wide';
  const shape = aspect > 0 ? aspect : 1;

  // One side of the terrain matches the net; the other follows the DEM's
  // shape, up to the limit. A terrain at the limit is scaled to fit.
  let terrainWidth = wide ? Math.round(CARD_SIDE * shape) : CARD_SIDE;
  let terrainHeight = wide ? CARD_SIDE : Math.round(CARD_SIDE / shape);
  if (terrainWidth > CARD_LIMIT) {
    terrainWidth = CARD_LIMIT;
    terrainHeight = Math.round(CARD_LIMIT / shape);
  }
  if (terrainHeight > CARD_LIMIT) {
    terrainHeight = CARD_LIMIT;
    terrainWidth = Math.round(CARD_LIMIT * shape);
  }
  terrainWidth = Math.max(1, terrainWidth);
  terrainHeight = Math.max(1, terrainHeight);

  const contentWidth = wide ? terrainWidth + CARD_GAP + CARD_SIDE : CARD_SIDE;
  const contentHeight = wide ? CARD_SIDE : CARD_SIDE + CARD_GAP + terrainHeight;

  // A terrain smaller than its place is centered beside, or under, the net.
  const terrain: Box = wide
    ? {
        x: CARD_PAD,
        y: CARD_PAD + Math.round((CARD_SIDE - terrainHeight) / 2),
        width: terrainWidth,
        height: terrainHeight,
      }
    : {
        x: CARD_PAD + Math.round((CARD_SIDE - terrainWidth) / 2),
        y: CARD_PAD + CARD_SIDE + CARD_GAP,
        width: terrainWidth,
        height: terrainHeight,
      };
  const net: Box = {
    x: wide ? CARD_PAD + terrainWidth + CARD_GAP : CARD_PAD,
    y: CARD_PAD,
    width: CARD_SIDE,
    height: CARD_SIDE,
  };

  let y = CARD_PAD + contentHeight + CAPTION_GAP;
  const captionLines = lines.map((height) => {
    const line = { y, height };
    y += height;
    return line;
  });

  return {
    width: 2 * CARD_PAD + contentWidth,
    height: y + CARD_PAD,
    terrain,
    net,
    caption: { x: CARD_PAD, width: contentWidth, lines: captionLines },
  };
}
```

- [ ] **Step 5: Write the words**

Create `src/share/text.ts`:

```ts
import { EMPTY_READOUT, NO_DATA, type ReadoutText, demFacts, describeReadout } from '../terrain/format';
import { formatSun } from '../terrain/net';
import type { Dem, Sun } from '../terrain/types';

/** One line of the picture's caption. Sizes are in image pixels. */
export interface CaptionLine {
  text: string;
  /** Font size. */
  size: number;
  /** Height of the line's box. */
  height: number;
  weight: 400 | 600;
  ink: 'ink-900' | 'ink-500';
}

const READOUT_LINE = { size: 30, height: 40, weight: 600, ink: 'ink-900' } as const;
const SMALL_LINE = { size: 20, height: 28, weight: 400, ink: 'ink-500' } as const;

/** One line for the share sheet: the place, and what was read there. */
export function shareText(place: string, readout: ReadoutText): string {
  const said = describeReadout(readout);
  return said ? `${place}: ${said[0].toLowerCase()}${said.slice(1)}` : place;
}

interface CaptionInput {
  place: string;
  dem: Dem;
  readout: ReadoutText;
  sun: Sun;
  /** The page's host and path, from `siteName`. */
  site: string;
}

/**
 * The picture's caption: the readout if a pixel is selected, the DEM's
 * facts, then the sun and where the picture came from, so a picture pasted
 * into a report still says what it is.
 */
export function captionLines({ place, dem, readout, sun, site }: CaptionInput): CaptionLine[] {
  const lines: CaptionLine[] = [];
  if (readout === NO_DATA) {
    lines.push({ ...READOUT_LINE, text: 'No data at this pixel' });
  } else if (readout !== EMPTY_READOUT) {
    lines.push({
      ...READOUT_LINE,
      text: `Slope ${readout.slope} · Aspect ${readout.aspect} · Elevation ${readout.elevation}`,
    });
  }
  lines.push({ ...SMALL_LINE, text: demFacts(place, dem) });
  const light = formatSun(sun);
  lines.push({ ...SMALL_LINE, text: `${light === 'Overhead' ? 'Sun overhead' : `Sun ${light}`} · ${site}` });
  return lines;
}

/** The page's host and path with no trailing slash: where a picture says it came from. */
export function siteName(host: string, pathname: string): string {
  return `${host}${pathname}`.replace(/\/(index\.html)?$/, '');
}

/** A file name for the picture, from the app's name and the DEM's id. */
export function fileName(appName: string, demId: string): string {
  const plain = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  return `${[plain(appName), plain(demId)].filter(Boolean).join('-') || 'view'}.png`;
}
```

`readoutFor` in `format.ts` returns the `EMPTY_READOUT` and `NO_DATA` objects themselves, which is why they are compared by identity here, as `describeReadout` already does.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/share src/terrain/format.test.ts`
Expected: PASS.

Run: `npm test && npm run build`
Expected: both PASS. The build checks that `App.tsx` still compiles with the two helpers.

- [ ] **Step 7: Commit**

```bash
git add src/share/cardLayout.ts src/share/cardLayout.test.ts src/share/text.ts src/share/text.test.ts src/terrain/format.ts src/terrain/format.test.ts src/App.tsx
git commit -m "Lay out the shared picture and write its words" -m "The picture is a fixed-size figure that follows the screen's arrangement: the net is a 720 square, the terrain keeps the DEM's shape up to 1440, and a caption of two or three lines sits beneath. The DEM's facts are now written by one function, used by the screen's caption and the picture's alike." -m "Claude-Session: https://claude.ai/code/session_0188RNZHUPogarCPaaFF2sKe"
```

---

### Task 5: The share button

**Files:**
- Create: `src/share/share.ts`
- Create: `src/components/ShareButton.tsx`
- Modify: `src/components/TitleBar.tsx` (replace the whole file)
- Modify: `src/App.tsx`
- Modify: `src/app.css`
- Modify: `e2e/polish.spec.ts`
- Test: `e2e/share.spec.ts` (new)

**Interfaces:**
- Consumes: `useViewPersistence(...) → () => string | null` and `linkTo(view: string): string` from Task 3; `shareText(place, readout)` from Task 4; `readoutFor(dem, surface, index)` from `src/terrain/format.ts`; `announce(region, text)` from `src/components/announce.ts`.
- Produces:
  - `share.ts`: `type ShareOutcome = 'shared' | 'cancelled' | 'copied' | 'failed'`, `interface ShareWords { title: string; text: string; url: string }`, `shareView(words: ShareWords, file: File | null): Promise<ShareOutcome>`.
  - `ShareButton({ disabled, onShare })` with `onShare: () => Promise<ShareOutcome>`; it renders a button with `data-testid="share"` and `data-done`, and a live region with `data-testid="share-announcement"`.
  - `TitleBar` gains props `shareDisabled: boolean` and `onShare: () => Promise<ShareOutcome>`.
  - In this task the picture is always `null`; Task 6 supplies it.

- [ ] **Step 1: Write the failing browser tests**

Create `e2e/share.spec.ts`:

```ts
import { type Page, expect, test } from '@playwright/test';
import { APP_NAME, clickPixel, openApp, stage } from './helpers';

// A pixel of the bundled Gore Range DEM, and what the share sheet is told about it.
const WEST_SLOPE = { col: 150, row: 210 };
const WEST_TEXT = 'Gore Range, Colorado: slope 36.0°, aspect 259° W, elevation 3,874 m';
const WEST_FRAGMENT = '#dem=gore&px=150,210';

const share = (page: Page) => page.getByTestId('share');
const notice = (page: Page) => page.getByTestId('share-announcement');
const origin = (page: Page) => new URL(page.url()).origin;
const clipboard = (page: Page) => page.evaluate(() => navigator.clipboard.readText());

/** Takes the share sheet away, as on Firefox on a desktop. */
async function withoutShareSheet(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
  });
}

/**
 * Stands in for a share sheet that takes no files. What it is handed is kept
 * in `window.__shared`. It can take the share, be closed by the user, fail,
 * or stay open for a while.
 */
async function withShareSheet(page: Page, behavior: 'takes' | 'closed' | 'fails' | 'slow' = 'takes') {
  await page.addInitScript((how) => {
    const shared: unknown[] = [];
    Object.assign(window, { __shared: shared });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        shared.push({ title: data.title, text: data.text, url: data.url, files: data.files?.length ?? 0 });
        if (how === 'closed') throw new DOMException('Share canceled', 'AbortError');
        if (how === 'fails') throw new DOMException('Permission denied', 'NotAllowedError');
        if (how === 'slow') await new Promise((resolve) => setTimeout(resolve, 400));
      },
    });
  }, behavior);
}

const shared = (page: Page) => page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared);

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
});

test('the share button is disabled while the DEM loads', async ({ page }) => {
  await page.route('**/dems/gore.tif', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.goto('/');
  await expect(stage(page)).toHaveAttribute('data-status', 'loading');
  await expect(share(page)).toBeDisabled();
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(share(page)).toBeEnabled();
});

test('the share button is disabled when the DEM cannot be loaded', async ({ page }) => {
  await page.route('**/dems/gore.tif', (route) => route.fulfill({ status: 404, body: 'missing' }));
  await page.goto('/');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(share(page)).toBeDisabled();
});

test('with no share sheet, a press copies the link and says so', async ({ page }) => {
  await withoutShareSheet(page);
  await openApp(page);
  await clickPixel(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await share(page).click();

  await expect(share(page)).toHaveAttribute('data-done', 'true');
  await expect(page.locator('.tooltip')).toHaveText('Link copied');
  await expect(notice(page)).toHaveText('Link copied');
  expect(await clipboard(page)).toBe(`${origin(page)}/${WEST_FRAGMENT}`);

  // The check mark and the words go back by themselves.
  await expect(share(page)).toHaveAttribute('data-done', 'false', { timeout: 3000 });
  await expect(page.locator('.tooltip')).toHaveCount(0);
});

test('with a share sheet that takes no files, a press shares the link, the title and the text', async ({ page }) => {
  await withShareSheet(page);
  await openApp(page);
  await clickPixel(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await share(page).click();
  await expect
    .poll(() => shared(page))
    .toEqual([{ title: APP_NAME, text: WEST_TEXT, url: `${origin(page)}/${WEST_FRAGMENT}`, files: 0 }]);
  // The share sheet has said so itself; the button adds nothing.
  await expect(share(page)).toHaveAttribute('data-done', 'false');
  await expect(notice(page)).toHaveText('');
});

test('with nothing selected, the link is the bare address and the text is the place', async ({ page }) => {
  await withShareSheet(page);
  await openApp(page);
  await share(page).click();
  await expect
    .poll(() => shared(page))
    .toEqual([{ title: APP_NAME, text: 'Gore Range, Colorado', url: `${origin(page)}/`, files: 0 }]);
});

test('closing the share sheet changes nothing', async ({ page }) => {
  await withShareSheet(page, 'closed');
  await openApp(page);
  await page.evaluate(() => navigator.clipboard.writeText('untouched'));
  await share(page).click();
  await expect.poll(async () => (await shared(page)).length).toBe(1);
  await page.waitForTimeout(200);
  await expect(share(page)).toHaveAttribute('data-done', 'false');
  await expect(notice(page)).toHaveText('');
  expect(await clipboard(page)).toBe('untouched');
});

test('a share sheet that fails falls back to copying the link', async ({ page }) => {
  await withShareSheet(page, 'fails');
  await openApp(page);
  await clickPixel(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await share(page).click();
  await expect(notice(page)).toHaveText('Link copied');
  await expect(share(page)).toHaveAttribute('data-done', 'true');
  expect(await clipboard(page)).toBe(`${origin(page)}/${WEST_FRAGMENT}`);
});

test('a refused copy says so', async ({ page }) => {
  await withoutShareSheet(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('refused')) },
    });
  });
  await openApp(page);
  await share(page).click();
  await expect(page.locator('.tooltip')).toHaveText('Could not copy the link');
  await expect(notice(page)).toHaveText('Could not copy the link');
  // No check mark: nothing was copied.
  await expect(share(page)).toHaveAttribute('data-done', 'false');
});

test('a second press while the share sheet is open is ignored', async ({ page }) => {
  await withShareSheet(page, 'slow');
  await openApp(page);
  await share(page).click();
  await share(page).click();
  await page.waitForTimeout(700); // longer than the stand-in sheet stays open
  expect(await shared(page)).toHaveLength(1);
  await expect(notice(page)).toHaveText('');
});

test('names the button and explains it from its tooltip', async ({ page }) => {
  await openApp(page);
  await expect(page.getByRole('button', { name: 'Share this view' })).toBeVisible();
  await share(page).focus();
  await expect(page.locator('.tooltip')).toHaveText('Share this view');
});
```

In `e2e/polish.spec.ts`, make three changes.

In `'four DEMs with two-word names stay inside a phone screen'`, after the loop over the tabs, add:

```ts
  const shareBox = (await page.getByTestId('share').boundingBox())!;
  expect(shareBox.x).toBeGreaterThanOrEqual(0);
  expect(shareBox.x + shareBox.width).toBeLessThanOrEqual(width);
```

In `'touch targets are at least 44px'`, after the two assertions on the sun, add:

```ts
  const shareBox = (await page.getByTestId('share').boundingBox())!;
  expect(Math.round(shareBox.width)).toBeGreaterThanOrEqual(44);
  expect(Math.round(shareBox.height)).toBeGreaterThanOrEqual(44);
```

In `'every control can be reached by keyboard, in reading order, and shows a focus ring'`, replace the comment and the `expected` constant with:

```ts
  const shareName = 'Share this view';
  // Tab follows the eye: the title bar first, then the net above the terrain
  // on a phone and to the right of it on a desktop. The info dot is help,
  // not a stop.
  const expected =
    testInfo.project.name === 'phone'
      ? ['Gore Range', 'Second', shareName, sunName, terrainName]
      : ['Gore Range', 'Second', shareName, terrainName, sunName];
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test e2e/share.spec.ts e2e/polish.spec.ts`
Expected: every test in `share.spec.ts` FAILS (there is no element with test id `share`), and the three changed tests in `polish.spec.ts` FAIL.

- [ ] **Step 3: Write the choice between the share sheet and the clipboard**

Create `src/share/share.ts`:

```ts
export type ShareOutcome = 'shared' | 'cancelled' | 'copied' | 'failed';

/** What goes with a share: the app's name, one line of text and the link. */
export interface ShareWords {
  title: string;
  text: string;
  url: string;
}

async function copy(url: string): Promise<ShareOutcome> {
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/**
 * Hands the view to the share sheet, with the picture if the sheet takes
 * files. Where there is no share sheet, or it fails, the link is copied.
 * Call this inside a press: browsers refuse a share that starts later.
 */
export async function shareView(words: ShareWords, file: File | null): Promise<ShareOutcome> {
  if (typeof navigator.share !== 'function') return copy(words.url);
  // The picture goes along only if this share sheet says it takes it.
  const files =
    file !== null && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
      ? [file]
      : null;
  try {
    await navigator.share(files ? { ...words, files } : words);
    return 'shared';
  } catch (error) {
    // The user closed the sheet: there is nothing to make up for.
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    return copy(words.url);
  }
}
```

- [ ] **Step 4: Write the button**

Create `src/components/ShareButton.tsx`:

```tsx
import * as Tooltip from '@radix-ui/react-tooltip';
import { Check, Share } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ShareOutcome } from '../share/share';
import { announce } from './announce';

const LABEL = 'Share this view';
const COPIED = 'Link copied';
const REFUSED = 'Could not copy the link';
const NOTICE_MS = 1600; // how long the outcome stays beside the button

interface ShareButtonProps {
  /** True until a DEM is ready to be shared. */
  disabled: boolean;
  /** Shares the view. It is called inside the press, as browsers require. */
  onShare: () => Promise<ShareOutcome>;
}

/**
 * The one share button. A share sheet reports its own outcome, so the button
 * says something only when the link was copied instead, or could not be: the
 * tooltip carries the words for a moment, and a live region speaks them.
 */
export function ShareButton({ disabled, onShare }: ShareButtonProps) {
  const [tipOpen, setTipOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const announceRef = useRef<HTMLSpanElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A share sheet is open. A second press must not start another share.
  const busy = useRef(false);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const onClick = async () => {
    if (busy.current) return;
    busy.current = true;
    let outcome: ShareOutcome;
    try {
      outcome = await onShare();
    } finally {
      busy.current = false;
    }
    if (outcome !== 'copied' && outcome !== 'failed') return;
    const words = outcome === 'copied' ? COPIED : REFUSED;
    setNotice(words);
    announce(announceRef.current, words);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_MS);
  };

  const copied = notice === COPIED;
  return (
    <>
      {/* The outcome holds the tooltip open, whether or not the pointer is there. */}
      <Tooltip.Root open={notice !== null || tipOpen} onOpenChange={setTipOpen}>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className="icon-btn"
            aria-label={LABEL}
            data-testid="share"
            data-done={copied}
            disabled={disabled}
            onClick={onClick}
          >
            {copied ? <Check size={20} aria-hidden="true" /> : <Share size={20} aria-hidden="true" />}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="tooltip" side="bottom" align="end" sideOffset={6} collisionPadding={8}>
            {notice ?? LABEL}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      <span
        ref={announceRef}
        className="visually-hidden"
        aria-live="polite"
        data-testid="share-announcement"
      />
    </>
  );
}
```

- [ ] **Step 5: Put the button in the title bar**

Replace the whole of `src/components/TitleBar.tsx` with:

```tsx
import type { ShareOutcome } from '../share/share';
import type { DemEntry } from '../state/useDems';
import { ShareButton } from './ShareButton';

interface TitleBarProps {
  entries: DemEntry[];
  activeId: string | null;
  onSelect: (id: string) => void;
  /** True until a DEM is ready to be shared. */
  shareDisabled: boolean;
  /** Shares the view. It is called inside the press on the share button. */
  onShare: () => Promise<ShareOutcome>;
}

export function TitleBar({ entries, activeId, onSelect, shareDisabled, onShare }: TitleBarProps) {
  return (
    <header className="titlebar">
      <h1 className="titlebar__name">{import.meta.env.VITE_APP_NAME}</h1>
      <div className="titlebar__end">
        {entries.length > 1 ? (
          <div className="segmented" role="tablist" aria-label="DEM">
            {entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                className="segmented__seg"
                aria-selected={entry.id === activeId}
                onClick={() => onSelect(entry.id)}
              >
                {entry.name}
              </button>
            ))}
          </div>
        ) : entries.length === 1 ? (
          <span className="titlebar__dem">{entries[0].name}</span>
        ) : null}
        <ShareButton disabled={shareDisabled} onShare={onShare} />
      </div>
    </header>
  );
}
```

- [ ] **Step 6: Style the group and the button**

In `src/app.css`, after the `.titlebar__dem` rule, add:

```css
/* The DEM's name or the picker, then the share button. */
.titlebar__end {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
}
```

After the `.btn--tonal:hover` rule, add:

```css
/* An icon alone, on the ground it sits on. Not accent-colored: rust is for
   the selection. */
.icon-btn {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: var(--r-pill);
  background: transparent;
  color: var(--ink-700);
  cursor: pointer;
  transition:
    background var(--t-fast) var(--ease-out),
    box-shadow var(--t-fast) var(--ease-out);
}

.icon-btn:hover {
  background: var(--sunken);
}

.icon-btn:disabled {
  background: transparent;
  color: var(--ink-400);
  cursor: default;
}
```

Inside the existing `@media (pointer: coarse)` block headed `/* Touch layouts: 44px targets. */`, add:

```css
  .icon-btn {
    width: var(--touch);
    height: var(--touch);
  }
```

The focus ring needs no rule: `tokens.css` gives every `:focus-visible` element the ring as a `box-shadow`, and this button does not override it.

- [ ] **Step 7: Wire the press in `App`**

In `src/App.tsx`, add imports:

```tsx
import { type ShareOutcome, shareView } from './share/share';
import { shareText } from './share/text';
```

and add `linkTo` to the import from `./state/viewStore`:

```tsx
import { linkTo, readFragment, readSaved } from './state/viewStore';
```

Assign the hook's return value, which Task 3 left unused:

```tsx
  const viewText = useViewPersistence({
```

After that call, add:

```tsx
  // Called inside the press on the share button: browsers refuse a share that starts later.
  const handleShare = useCallback((): Promise<ShareOutcome> => {
    if (state.status !== 'ready' || !active) return Promise.resolve<ShareOutcome>('failed');
    const readout = readoutFor(state.dem, state.surface, selection.get());
    const words = {
      title: import.meta.env.VITE_APP_NAME,
      text: shareText(active.place, readout),
      url: linkTo(viewText() ?? ''),
    };
    return shareView(words, null);
  }, [state, active, selection, viewText]);
```

and pass the two new props to the title bar:

```tsx
        <TitleBar
          entries={entries}
          activeId={active?.id ?? null}
          onSelect={selectDem}
          shareDisabled={state.status !== 'ready'}
          onShare={handleShare}
        />
```

The link is made from the view as it is at the press, not from the address bar, so it is right even inside the 400 ms before the address is written.

- [ ] **Step 8: Run the tests to verify they pass**

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test e2e/share.spec.ts e2e/polish.spec.ts`
Expected: PASS.

Run: `npm test`
Expected: PASS (`src/styles/contrast.test.ts` and `layoutTokens.test.ts` read `app.css`; they must still pass).

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test`
Expected: PASS for the whole suite. If "fits a … without scrolling or overlap" or "nothing moves when the DEM arrives" fails, the title bar's height has changed: the button must not make the bar taller than `--header-h` (56px).

- [ ] **Step 9: Commit**

```bash
git add src/share/share.ts src/components/ShareButton.tsx src/components/TitleBar.tsx src/App.tsx src/app.css e2e/share.spec.ts e2e/polish.spec.ts
git commit -m "Share the view's link from one button in the title bar" -m "A press opens the share sheet with the link, the app's name and one line of text. Where there is no share sheet, or it fails, the link is copied; the button shows a check mark and says \"Link copied\" for a moment. A second press while the sheet is open is ignored. The picture comes next." -m "Claude-Session: https://claude.ai/code/session_0188RNZHUPogarCPaaFF2sKe"
```

---

### Task 6: The picture

**Files:**
- Create: `src/share/drawCard.ts`
- Modify: `src/share/share.ts`
- Modify: `src/App.tsx`
- Test: `e2e/share.spec.ts` (append)

**Interfaces:**
- Consumes: `cardLayout`, `Box`, `CardLayout` and `captionLines`, `CaptionLine`, `fileName`, `siteName` from Task 4; `shareView` from Task 5; `cloudAlpha(surface, size)` and `NET_RIM` from `src/terrain/cloud.ts`; `shade(surface, sun, out)` from `src/terrain/hillshade.ts`; `toNet`, `sunToNet` from `src/terrain/net.ts`; `toPixel` from `src/terrain/pick.ts`; `readoutFor` from `src/terrain/format.ts`.
- Produces:
  - `drawCard.ts`: `drawCard(input: CardInput): HTMLCanvasElement`, `cardFile(canvas: HTMLCanvasElement, name: string): File`, `readPalette(): CardPalette`, and `pictureFile(input: PictureInput): File | null` with `PictureInput = { mode: 'portrait' | 'wide'; appName: string; demId: string; place: string; dem: Dem; surface: Surface; sun: Sun; selection: number }`.
  - `share.ts`: `canShareFiles(): boolean`.

The screen's sizes that the picture enlarges one and a half times (`K = 1.5`), from `src/app.css` and `src/components/NetFrame.tsx`:

| Piece | On screen | In the picture |
|---|---|---|
| Rim stroke; ring and cross strokes | 1.5px; 1px | 2.25; 1.5 |
| Net letters: size, paper edge | 12px, 4px | 18, 6 |
| Letter positions | N 16 below the rim's top; S 7 above its bottom; E and W 10 in from the rim, 4 below the center line; ring labels 3 right of the ring, 14 below the center line | the same, times 1.5 |
| Sun disc radius; icon size | 15px; 18px | 22.5; 27 |
| Net point: dot radius, paper edge to, halo band | 5; 7; 9 to 12 | 7.5; 10.5; 13.5 to 18 |
| Flat point: accent ring | 3 to 5 | 4.5 to 7.5 |
| Terrain ring: paper, accent, paper | 3.5 to 5; 5 to 8; 8 to 9.5 | 5.25 to 7.5; 7.5 to 12; 12 to 14.25 |
| Terrain corner radius | 12px | 18 |

- [ ] **Step 1: Write the failing browser tests**

In `e2e/share.spec.ts`, replace the first two import lines with:

```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { type Page, type TestInfo, expect, test } from '@playwright/test';
import { type Box, cardLayout } from '../src/share/cardLayout';
import { fileName } from '../src/share/text';
import { APP_NAME, GORE, clickPixel, openApp, stage } from './helpers';
```

and append:

```ts
// More pixels of the Gore Range DEM. `net` is where the point plots, in rim radii.
const NORTHEAST_SLOPE = { col: 200, row: 230, net: { x: 0.288, y: 0.409 } };
const LAKE = { col: 230, row: 70 };
const NET_RIM = 0.9375;
const PAPER = [255, 255, 255, 255];
const RUST = [184, 74, 0, 255];
const GORE_SHAPE = GORE.width / GORE.height;

/** The picture follows the screen: stacked on the phone, side by side on the desktop. */
const modeOf = (testInfo: TestInfo) => (testInfo.project.name === 'phone' ? 'portrait' : 'wide');

/**
 * Stands in for a share sheet that takes PNG files. What it is handed is kept
 * in `window.__shared`, and the picture, decoded, in `window.__picture`.
 */
async function withFileShareSheet(page: Page) {
  await page.addInitScript(() => {
    const shared: unknown[] = [];
    Object.assign(window, { __shared: shared });
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: (data: ShareData) => (data.files ?? []).every((file) => file.type === 'image/png'),
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        const file = data.files?.[0];
        let picture = null;
        if (file) {
          const bitmap = await createImageBitmap(file);
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
          Object.assign(window, { __picture: canvas });
          picture = { name: file.name, type: file.type, width: bitmap.width, height: bitmap.height };
        }
        shared.push({ title: data.title, text: data.text, url: data.url, picture });
      },
    });
  });
}

/** The color of one pixel of the shared picture: red, green, blue, alpha. */
const colorAt = (page: Page, x: number, y: number) =>
  page.evaluate(
    ([px, py]) => {
      const canvas = (window as unknown as { __picture: HTMLCanvasElement }).__picture;
      return [...canvas.getContext('2d')!.getImageData(px, py, 1, 1).data];
    },
    [Math.round(x), Math.round(y)],
  );

/** How many pixels in a box of the shared picture are not white. */
const inkIn = (page: Page, box: Box) =>
  page.evaluate((b) => {
    const canvas = (window as unknown as { __picture: HTMLCanvasElement }).__picture;
    const data = canvas.getContext('2d')!.getImageData(b.x, b.y, b.width, b.height).data;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) count++;
    }
    return count;
  }, box);

test('with a share sheet that takes files, a press shares a picture of the view', async ({ page }, testInfo) => {
  await withFileShareSheet(page);
  await openApp(page);
  await clickPixel(page, NORTHEAST_SLOPE.col, NORTHEAST_SLOPE.row);
  await share(page).click();
  await expect.poll(async () => (await shared(page)).length).toBe(1);

  const layout = cardLayout({ mode: modeOf(testInfo), aspect: GORE_SHAPE, lines: [40, 28, 28] });
  expect(await shared(page)).toEqual([
    {
      title: APP_NAME,
      text: 'Gore Range, Colorado: slope 41.5°, aspect 35° NE, elevation 3,878 m',
      url: `${origin(page)}/#dem=gore&px=200,230`,
      picture: { name: fileName(APP_NAME, 'gore'), type: 'image/png', width: layout.width, height: layout.height },
    },
  ]);

  // Keep the picture beside the test's results, to be looked at by eye.
  const png = await page.evaluate(() =>
    (window as unknown as { __picture: HTMLCanvasElement }).__picture.toDataURL('image/png').split(',')[1],
  );
  const path = testInfo.outputPath('share-picture.png');
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.from(png, 'base64'));

  // White at the corner.
  expect(await colorAt(page, 2, 2)).toEqual(PAPER);
  // Rust at the selected pixel's point on the net.
  const rim = (layout.net.width / 2) * NET_RIM;
  const pointX = layout.net.x + layout.net.width / 2 + NORTHEAST_SLOPE.net.x * rim;
  const pointY = layout.net.y + layout.net.height / 2 - NORTHEAST_SLOPE.net.y * rim;
  expect(await colorAt(page, pointX, pointY)).toEqual(RUST);
  // Rust in the ring around the selected pixel on the terrain: its accent
  // band runs from 7.5 to 12 out from the pixel's center.
  const ringX = layout.terrain.x + ((NORTHEAST_SLOPE.col + 0.5) / GORE.width) * layout.terrain.width;
  const ringY = layout.terrain.y + ((NORTHEAST_SLOPE.row + 0.5) / GORE.height) * layout.terrain.height;
  expect(await colorAt(page, ringX + 9.75, ringY)).toEqual(RUST);
  // A gray of the hillshade in the middle of the terrain.
  const [red, green, blue, alpha] = await colorAt(
    page,
    layout.terrain.x + layout.terrain.width / 2,
    layout.terrain.y + layout.terrain.height / 2,
  );
  expect(green).toBe(red);
  expect(blue).toBe(red);
  expect(alpha).toBe(255);
});

test('the picture has no readout line when nothing is selected', async ({ page }, testInfo) => {
  await withFileShareSheet(page);
  await openApp(page);
  await share(page).click();
  await expect.poll(async () => (await shared(page)).length).toBe(1);
  const layout = cardLayout({ mode: modeOf(testInfo), aspect: GORE_SHAPE, lines: [28, 28] });
  const [sent] = (await shared(page)) as Array<{ picture: { width: number; height: number } }>;
  expect(sent.picture.width).toBe(layout.width);
  expect(sent.picture.height).toBe(layout.height);
});

test('a flat pixel is drawn hollow at the center of the net', async ({ page }, testInfo) => {
  await withFileShareSheet(page);
  await openApp(page);
  await clickPixel(page, LAKE.col, LAKE.row);
  await expect(page.getByTestId('aspect')).toHaveText('Flat');
  await share(page).click();
  await expect.poll(async () => (await shared(page)).length).toBe(1);

  const layout = cardLayout({ mode: modeOf(testInfo), aspect: GORE_SHAPE, lines: [40, 28, 28] });
  const centerX = layout.net.x + layout.net.width / 2;
  const centerY = layout.net.y + layout.net.height / 2;
  expect(await colorAt(page, centerX, centerY)).toEqual(PAPER);
  // The accent ring of a hollow point runs from 4.5 to 7.5 out from the center.
  expect(await colorAt(page, centerX + 6, centerY)).toEqual(RUST);
});

test('a place name too long for the picture is set smaller and stays inside it', async ({ page }, testInfo) => {
  const place = 'The cirque above the upper lake on the east side of the Gore Range, Eagle County, Colorado';
  await page.route('**/dems/dems.json', (route) =>
    route.fulfill({ json: [{ id: 'gore', name: 'Gore Range', place, file: 'gore.tif', width: 288, height: 294 }] }),
  );
  await withFileShareSheet(page);
  await openApp(page);
  await share(page).click();
  await expect.poll(async () => (await shared(page)).length).toBe(1);

  const layout = cardLayout({ mode: modeOf(testInfo), aspect: GORE_SHAPE, lines: [28, 28] });
  const first = layout.caption.lines[0];
  const last = layout.caption.lines[layout.caption.lines.length - 1];
  const captionHeight = last.y + last.height - first.y;
  // The caption is there...
  const captionBox = { x: layout.caption.x, y: first.y, width: layout.caption.width, height: captionHeight };
  expect(await inkIn(page, captionBox)).toBeGreaterThan(0);
  // ...and nothing runs into the space to its right.
  const margin = { x: layout.width - 48, y: first.y, width: 48, height: captionHeight };
  expect(await inkIn(page, margin)).toBe(0);
});

test('when the picture cannot be made, the link is shared without it', async ({ page }) => {
  await withFileShareSheet(page);
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.toDataURL = () => {
      throw new Error('This canvas cannot be read.');
    };
  });
  await openApp(page);
  await clickPixel(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await share(page).click();
  await expect
    .poll(() => shared(page))
    .toEqual([{ title: APP_NAME, text: WEST_TEXT, url: `${origin(page)}/${WEST_FRAGMENT}`, picture: null }]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test e2e/share.spec.ts`
Expected: the Task 5 tests still pass. The first four new tests FAIL with `picture: null` or a missing `__picture`; "when the picture cannot be made…" already passes.

- [ ] **Step 3: Draw the picture**

Create `src/share/drawCard.ts`:

```ts
import { NET_RIM, cloudAlpha } from '../terrain/cloud';
import { readoutFor } from '../terrain/format';
import { shade } from '../terrain/hillshade';
import { sunToNet, toNet } from '../terrain/net';
import { toPixel } from '../terrain/pick';
import type { Dem, Sun, Surface } from '../terrain/types';
import { type Box, type CardLayout, cardLayout } from './cardLayout';
import { type CaptionLine, captionLines, fileName, siteName } from './text';

/** The picture's lines, dots and letters are the screen's, this much larger. */
const K = 1.5;
const TURN = 2 * Math.PI;
const RING_30 = toNet(30, 0).y;
const RING_60 = toNet(60, 0).y;
const SMALLEST_TYPE = 12; // a caption line is not set smaller than this
/** The rays of lucide's sun, in its 24-unit box. The disc is drawn as a circle. */
const SUN_RAYS =
  'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41';

/** The token colors the picture is drawn in. */
export interface CardPalette {
  paper: string;
  ink900: string;
  ink500: string;
  line: string;
  lineStrong: string;
  accent: string;
}

export interface CardInput {
  layout: CardLayout;
  surface: Surface;
  sun: Sun;
  /** Index of the selected pixel, or −1. */
  selection: number;
  caption: CaptionLine[];
  palette: CardPalette;
  /** The page's font stack, as CSS writes it. */
  fontFamily: string;
}

type Context = CanvasRenderingContext2D;

/** The picture's colors, read from the page's own tokens. */
export function readPalette(): CardPalette {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim();
  return {
    paper: token('--paper'),
    ink900: token('--ink-900'),
    ink500: token('--ink-500'),
    line: token('--line'),
    lineStrong: token('--line-strong'),
    accent: token('--accent'),
  };
}

function disc(context: Context, x: number, y: number, radius: number, color: string): void {
  context.beginPath();
  context.arc(x, y, radius, 0, TURN);
  context.fillStyle = color;
  context.fill();
}

/** A circle's outline, `width` thick, centered on `radius`. */
function band(context: Context, x: number, y: number, radius: number, width: number, color: string): void {
  context.beginPath();
  context.arc(x, y, radius, 0, TURN);
  context.lineWidth = width;
  context.strokeStyle = color;
  context.stroke();
}

/** A canvas of its own, for the picture or for an image drawn onto it. */
function scratch(width: number, height: number): [HTMLCanvasElement, Context] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser gave no 2D canvas.');
  return [canvas, context];
}

function drawTerrain(context: Context, box: Box, { surface, sun, selection, palette }: CardInput): void {
  // One image pixel per DEM pixel, as on screen, then scaled up smoothly.
  const [source, sourceContext] = scratch(surface.width, surface.height);
  const image = sourceContext.createImageData(surface.width, surface.height);
  shade(surface, sun, image.data);
  sourceContext.putImageData(image, 0, 0);

  context.save();
  context.beginPath();
  context.roundRect(box.x, box.y, box.width, box.height, 12 * K);
  context.clip();
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, box.x, box.y, box.width, box.height);
  context.restore();

  if (selection < 0) return;
  const { col, row } = toPixel(selection, surface.width);
  const x = box.x + ((col + 0.5) / surface.width) * box.width;
  const y = box.y + ((row + 0.5) / surface.height) * box.height;
  // The screen's ring: a 3px accent band from 5px to 8px out, edged in paper on both sides.
  band(context, x, y, 6.5 * K, 6 * K, palette.paper);
  band(context, x, y, 6.5 * K, 3 * K, palette.accent);
}

function drawNet(context: Context, box: Box, { surface, sun, selection, palette, fontFamily }: CardInput): void {
  const size = box.width;
  const cx = box.x + size / 2;
  const cy = box.y + size / 2;
  const rim = (size / 2) * NET_RIM;

  // The frame, under the cloud: rim, slope rings and compass cross.
  disc(context, cx, cy, rim, palette.paper);
  band(context, cx, cy, rim, 1.5 * K, palette.lineStrong);
  band(context, cx, cy, rim * RING_30, K, palette.line);
  band(context, cx, cy, rim * RING_60, K, palette.line);
  context.beginPath();
  context.moveTo(cx, cy - rim);
  context.lineTo(cx, cy + rim);
  context.moveTo(cx - rim, cy);
  context.lineTo(cx + rim, cy);
  context.lineWidth = K;
  context.strokeStyle = palette.line;
  context.stroke();

  // The cloud: its darkness as alpha, then inked.
  const alpha = cloudAlpha(surface, size);
  const [cloud, cloudContext] = scratch(size, size);
  const image = cloudContext.createImageData(size, size);
  for (let cell = 0, o = 3; cell < alpha.length; cell++, o += 4) image.data[o] = alpha[cell];
  cloudContext.putImageData(image, 0, 0);
  cloudContext.globalCompositeOperation = 'source-in';
  cloudContext.fillStyle = palette.ink900;
  cloudContext.fillRect(0, 0, size, size);
  context.drawImage(cloud, box.x, box.y);

  // Compass letters and ring labels, over the cloud. A paper edge keeps a
  // letter readable there, as on screen.
  const label = (text: string, x: number, y: number, weight: 400 | 600, align: CanvasTextAlign) => {
    context.font = `${weight} ${12 * K}px ${fontFamily}`;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.lineJoin = 'round';
    context.lineWidth = 4 * K;
    context.strokeStyle = palette.paper;
    context.strokeText(text, x, y);
    context.fillStyle = palette.ink500;
    context.fillText(text, x, y);
  };
  label('N', cx, cy - rim + 16 * K, 600, 'center');
  label('S', cx, cy + rim - 7 * K, 600, 'center');
  label('E', cx + rim - 10 * K, cy + 4 * K, 600, 'center');
  label('W', cx - rim + 10 * K, cy + 4 * K, 600, 'center');
  label('30°', cx + rim * RING_30 + 3 * K, cy + 14 * K, 400, 'left');
  label('60°', cx + rim * RING_60 + 3 * K, cy + 14 * K, 400, 'left');

  // The sun: a paper disc with a soft shadow, standing in for --shadow-1,
  // and lucide's sun on it.
  const sunAt = sunToNet(sun);
  const sunX = cx + sunAt.x * rim;
  const sunY = cy - sunAt.y * rim;
  context.save();
  context.shadowColor = 'rgba(28, 26, 23, 0.2)';
  context.shadowBlur = 6 * K;
  context.shadowOffsetY = K;
  disc(context, sunX, sunY, 15 * K, palette.paper);
  context.restore();
  context.save();
  const unit = (18 * K) / 24; // lucide draws in a 24-unit box; the screen's icon is 18px
  context.translate(sunX - 12 * unit, sunY - 12 * unit);
  context.scale(unit, unit);
  context.strokeStyle = palette.ink900;
  context.lineWidth = 2;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  context.arc(12, 12, 4, 0, TURN);
  context.stroke();
  context.stroke(new Path2D(SUN_RAYS));
  context.restore();

  // The selected pixel's point, over the sun. Flat ground has no direction:
  // its point sits at the center, hollow. A pixel with no data has no point.
  if (selection < 0 || surface.nodata[selection]) return;
  const flat = surface.flat[selection] === 1;
  const at = flat ? { x: 0, y: 0 } : toNet(surface.slope[selection], surface.aspect[selection]);
  const pointX = cx + at.x * rim;
  const pointY = cy - at.y * rim;
  disc(context, pointX, pointY, 7 * K, palette.paper);
  if (flat) band(context, pointX, pointY, 4 * K, 2 * K, palette.accent);
  else disc(context, pointX, pointY, 5 * K, palette.accent);
  band(context, pointX, pointY, 10.5 * K, 3 * K, palette.accent); // the halo
}

function drawCaption(context: Context, { layout, caption, palette, fontFamily }: CardInput): void {
  const { x, width, lines } = layout.caption;
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  caption.forEach((line, i) => {
    const slot = lines[i];
    if (!slot) return;
    // A line too long for the picture is set smaller until it fits.
    let size = line.size;
    context.font = `${line.weight} ${size}px ${fontFamily}`;
    while (size > SMALLEST_TYPE && context.measureText(line.text).width > width) {
      size -= 1;
      context.font = `${line.weight} ${size}px ${fontFamily}`;
    }
    context.fillStyle = line.ink === 'ink-900' ? palette.ink900 : palette.ink500;
    // The last resort for a line still too long at the smallest size: the
    // canvas squeezes it into the width.
    context.fillText(line.text, x, slot.y + slot.height / 2, width);
  });
}

/** Draws the picture of a view: the terrain, the net and a caption, on paper. */
export function drawCard(input: CardInput): HTMLCanvasElement {
  const { layout, palette } = input;
  const [canvas, context] = scratch(layout.width, layout.height);
  context.fillStyle = palette.paper;
  context.fillRect(0, 0, layout.width, layout.height);
  drawTerrain(context, layout.terrain, input);
  drawNet(context, layout.net, input);
  drawCaption(context, input);
  return canvas;
}

/**
 * The picture as a PNG file. It is made without waiting, by way of a data
 * URL, so that it can be shared inside the press that asked for it.
 */
export function cardFile(canvas: HTMLCanvasElement, name: string): File {
  const binary = atob(canvas.toDataURL('image/png').split(',')[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type: 'image/png' });
}

export interface PictureInput {
  /** The screen's arrangement, which the picture follows. */
  mode: 'portrait' | 'wide';
  appName: string;
  demId: string;
  place: string;
  dem: Dem;
  surface: Surface;
  sun: Sun;
  /** Index of the selected pixel, or −1. */
  selection: number;
}

/** The picture of a view as a PNG file, or null if this browser cannot make one. */
export function pictureFile({ mode, appName, demId, place, dem, surface, sun, selection }: PictureInput): File | null {
  try {
    const caption = captionLines({
      place,
      dem,
      readout: readoutFor(dem, surface, selection),
      sun,
      site: siteName(window.location.host, window.location.pathname),
    });
    const layout = cardLayout({ mode, aspect: dem.width / dem.height, lines: caption.map((line) => line.height) });
    const canvas = drawCard({
      layout,
      surface,
      sun,
      selection,
      caption,
      palette: readPalette(),
      fontFamily: getComputedStyle(document.body).fontFamily,
    });
    return cardFile(canvas, fileName(appName, demId));
  } catch {
    // The link is shared without the picture.
    return null;
  }
}
```

- [ ] **Step 4: Draw it only where it can be used**

In `src/share/share.ts`, add after the `ShareWords` interface:

```ts
/** True where there is a share sheet that can say whether it takes files. */
export function canShareFiles(): boolean {
  return typeof navigator.share === 'function' && typeof navigator.canShare === 'function';
}
```

In `src/App.tsx`, change two imports and add one:

```tsx
import { pictureFile } from './share/drawCard';
import { type ShareOutcome, canShareFiles, shareView } from './share/share';
```

and replace `handleShare` with:

```tsx
  // Called inside the press on the share button: browsers refuse a share that starts later.
  const handleShare = useCallback((): Promise<ShareOutcome> => {
    if (state.status !== 'ready' || !active) return Promise.resolve<ShareOutcome>('failed');
    const index = selection.get();
    const words = {
      title: import.meta.env.VITE_APP_NAME,
      text: shareText(active.place, readoutFor(state.dem, state.surface, index)),
      url: linkTo(viewText() ?? ''),
    };
    // The picture takes a moment to draw, so it is made only where a share sheet could take it.
    const file = canShareFiles()
      ? pictureFile({
          mode: layout.mode,
          appName: import.meta.env.VITE_APP_NAME,
          demId: state.id,
          place: active.place,
          dem: state.dem,
          surface: state.surface,
          sun: { azimuth: sunAzimuth.get(), altitude: sunAltitude.get() },
          selection: index,
        })
      : null;
    return shareView(words, file);
  }, [state, active, selection, sunAzimuth, sunAltitude, viewText, layout.mode]);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test e2e/share.spec.ts`
Expected: PASS. Two pictures are left under `test-results/`, one per project, each named `share-picture.png`.

Run: `npm test`
Expected: PASS.

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test`
Expected: PASS for the whole suite.

- [ ] **Step 6: Look at the two pictures**

Run: `find test-results -name share-picture.png`
Open both files and check them against the spec's section 5: white ground; the terrain with rounded corners and a rust ring; the net with its rim, rings, cross, letters, cloud, sun disc and a rust point with its halo; three caption lines, the first larger and darker; nothing cut off or overlapping. Report the two paths, and anything that looks wrong, in your hand-back. Do not adjust sizes or colors by taste: the table at the top of this task is the reference.

- [ ] **Step 7: Commit**

```bash
git add src/share/drawCard.ts src/share/share.ts src/App.tsx e2e/share.spec.ts
git commit -m "Share a picture of the view with the link" -m "Where the share sheet takes files, a press draws a figure of the view (the hillshade with its ring, the net with its cloud, sun and point, and a caption that says what it is and where it came from) and shares it with the link. The figure is drawn and encoded inside the press, because Safari can refuse a share that starts later; if it cannot be made, the link goes without it." -m "Claude-Session: https://claude.ai/code/session_0188RNZHUPogarCPaaFF2sKe"
```

---

### Task 7: The link-preview card

**Files:**
- Modify: `.env`, `index.html`, `vite.config.ts`, `package.json`
- Create: `scripts/make-preview.mjs`, `public/preview.png` (made by the script)
- Modify: `e2e/helpers.ts`, `e2e/offline.spec.ts`
- Test: `e2e/preview.spec.ts` (new)

**Interfaces:**
- Consumes: a link with a pixel opens that view (Task 2), which is how the script gets a picture with a selection.
- Produces: `VITE_SITE_URL` in `.env` (the site's whole address, ending in `/`); `SITE_URL` in `e2e/helpers.ts`; `npm run preview-image`; `public/preview.png`, 1200 × 630.

- [ ] **Step 1: Name the site's address, and write the failing tests**

Every browser test file imports `e2e/helpers.ts`, so the `.env` line must exist before the helper reads it. Add to `.env`:

```
VITE_SITE_URL=https://lpeezydos-arch.github.io/Pixel-Net/
```

In `e2e/helpers.ts`, after `APP_NAME`, add:

```ts
/** The site's whole address, from the `VITE_SITE_URL` line of `.env`. Link-preview tags need it. */
export const SITE_URL = readFileSync('.env', 'utf8').match(/^VITE_SITE_URL=(.*)$/m)![1].trim();
```

Create `e2e/preview.spec.ts`:

```ts
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
```

In `e2e/offline.spec.ts`, in `'opens and works with no network after one visit'`, after the line that polls for `.woff2`, add:

```ts
  // The link-preview image is for other sites to read; the app never shows it.
  expect(await page.evaluate(isCached, 'preview.png')).toBe(false);
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test e2e/preview.spec.ts e2e/offline.spec.ts`
Expected: both tests in `preview.spec.ts` FAIL (no `og:` tags; `/preview.png` is not served as a PNG). `offline.spec.ts` still passes, because there is no image yet.

- [ ] **Step 3: Add the tags**

In `index.html`, after the `description` meta tag, add:

```html
    <!-- What a link to the app shows when it is pasted into a message. Other
         sites read these without running the page, so every link shows the
         same card, and the addresses must be whole. -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="%VITE_APP_NAME%" />
    <meta property="og:description" content="A hillshade and a Schmidt net of every pixel in a DEM." />
    <meta property="og:url" content="%VITE_SITE_URL%" />
    <meta property="og:image" content="%VITE_SITE_URL%preview.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="A hillshade of the Gore Range beside a Schmidt net of its slopes." />
    <meta name="twitter:card" content="summary_large_image" />
```

Vite replaces `%VITE_SITE_URL%` at build time, as it already does `%VITE_APP_NAME%`.

- [ ] **Step 4: Keep the image out of the offline cache**

In `vite.config.ts`, inside `workbox`, after `globPatterns`, add:

```ts
          // The link-preview image is read by other sites, never by the app.
          globIgnores: ['**/preview.png'],
```

- [ ] **Step 5: Write the script that draws the image**

In `package.json`, add to `scripts`, after `icons`:

```json
    "preview-image": "node scripts/make-preview.mjs"
```

(Add a comma after the `icons` line.)

Create `scripts/make-preview.mjs`:

```js
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
  await page.locator('[data-testid="net-marker"][data-visible="true"]').waitFor();
  await page.evaluate(() => document.fonts.ready);
  // Let the cloud fade in and the point finish its pulse.
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'public/preview.png' });
  console.log('public/preview.png');
} finally {
  await browser.close();
  await server.close();
}
```

- [ ] **Step 6: Draw the image**

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npm run preview-image`
Expected: prints `public/preview.png`. Open the file: the title bar, the terrain with a rust ring on the left, the net with a rust point and the readout on the right. If port 4179 is taken, wait and run again.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test e2e/preview.spec.ts e2e/offline.spec.ts`
Expected: PASS. The offline test now proves the image is not cached; without Step 4 it would fail.

Run: `npm test`
Expected: PASS.

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test`
Expected: PASS for the whole suite.

- [ ] **Step 8: Commit**

```bash
git add .env index.html vite.config.ts package.json scripts/make-preview.mjs public/preview.png e2e/helpers.ts e2e/preview.spec.ts e2e/offline.spec.ts
git commit -m "Show a preview card when a link to the app is pasted" -m "Static Open Graph and Twitter tags, and one 1200 by 630 image of the app, redrawn with npm run preview-image. The tags need whole addresses, so the site's address is set in .env beside the app's name. The image is left out of the offline cache: other sites read it, the app never does." -m "Claude-Session: https://claude.ai/code/session_0188RNZHUPogarCPaaFF2sKe"
```

---

### Task 8: Records

**Files:**
- Modify: `docs/superpowers/specs/2026-10-01-pixel-net-design.md` (append to section 12)
- Modify: `PRODUCT.md`
- Modify: `README.md`
- Modify: `docs/polish-pass.md`

**Interfaces:**
- Consumes: everything built in Tasks 1 to 7. Read the code before writing about it; a record that disagrees with the code is worse than none.
- Produces: nothing other tasks use.

- [ ] **Step 1: Amend the first spec**

Append to the end of `docs/superpowers/specs/2026-10-01-pixel-net-design.md`:

```markdown

Made on 2026-10-03 for sharing and restoring, designed in
`2026-10-03-share-and-restore-design.md`, which is the record for both.

- Section 2: shareable links to a view are in scope, with one share button.
  The rest of the out-of-scope list stands.
- Section 3, sun: the sun no longer returns to its default each time the app
  opens. The app reopens on the DEM, the pixel and the sun it was left on,
  from the link in the address or else from the view saved on the device.
- Section 3, title bar: a share button sits at the right end, after the
  DEM's name or the picker, and comes before the terrain in the Tab order.
  Known limit: with three or four DEMs on a phone the names are cut shorter
  by its width.
- Section 6: the icons are lucide `sun`, `info`, `share` and `check`.
- Section 8: `preview.png`, the link-preview image, is left out of the
  offline cache.
- Section 10: polish-pass item 4, a copy-link button for linkable state, now
  applies and is met.
```

- [ ] **Step 2: Update `PRODUCT.md`**

In "Product Purpose", replace

```markdown
re-lights the terrain. The app installs to a phone's home screen and works
with no signal after the first visit.
```

with

```markdown
re-lights the terrain. The app installs to a phone's home screen and works
with no signal after the first visit. It reopens on the DEM, pixel and sun it
was left on, and one button shares a picture of the view with a link that
restores it.
```

In "Capabilities and Constraints", replace

```markdown
- Sun: a draggable marker on the net. Default azimuth 315°, height 45°; height
  limited to 10°–90°; double-tap resets; keyboard adjustable. Persists across a
  DEM switch, resets when the app opens.
```

with

```markdown
- Sun: a draggable marker on the net. Default azimuth 315°, height 45°; height
  limited to 10°–90°; double-tap resets; keyboard adjustable. Persists across a
  DEM switch and is restored when the app reopens.
```

After the "Offline:" bullet, add:

```markdown
- View: the DEM, the selected pixel and the sun are written into the address
  (`#dem=gore&px=150,210&sun=120,35`) and saved on the device; the app reopens
  on them, and a link wins over the saved view
  (`docs/superpowers/specs/2026-10-03-share-and-restore-design.md`).
- Share: one button in the title bar opens the share sheet with a picture of
  the view and its link; where there is no share sheet it copies the link.
```

Replace the out-of-scope paragraph with:

```markdown
Out of scope by decision (spec §2); do not reintroduce without a new decision:
density net, aspect rose, patch or area selection; user-supplied or fetched
DEMs; zoom or pan; cast shadows or a sun set by date and time; dark theme;
agency identity chrome; native app-store builds. Shareable links left this list on
2026-10-03. Out of scope for sharing (share and restore spec §2): saving the
picture where there is no share sheet; short links, QR codes and embeds; a
preview card that shows the linked view.
```

- [ ] **Step 3: Update `README.md`**

Replace the opening paragraph and the line under it that points to the design:

```markdown
A one-screen web app that shows a hillshade of a DEM beside a Schmidt net of
every pixel in it. Press or drag on the terrain and that pixel's point is
highlighted on the net, with its slope, aspect and elevation. Drag the sun on
the net to change the lighting. It installs to a phone's home screen and works
with no signal after the first visit.

The design is in `docs/superpowers/specs/2026-10-01-pixel-net-design.md`.
```

with

```markdown
A one-screen web app that shows a hillshade of a DEM beside a Schmidt net of
every pixel in it. Press or drag on the terrain and that pixel's point is
highlighted on the net, with its slope, aspect and elevation. Drag the sun on
the net to change the lighting. It installs to a phone's home screen and works
with no signal after the first visit. It reopens where it was left, and the
share button sends a picture of the view with a link that restores it.

The design is in `docs/superpowers/specs/2026-10-01-pixel-net-design.md`;
sharing and restoring are in
`docs/superpowers/specs/2026-10-03-share-and-restore-design.md`.
```

Add a row to the commands table, after `npm run icons`:

```markdown
| `npm run preview-image` | Redraw the link-preview image, `public/preview.png`. Builds the app and needs Chromium, as the browser tests do |
```

After the "Rename the app" section, add:

```markdown
## Links, sharing and the saved view

The address always holds the view, for example
`#dem=gore&px=150,210&sun=120,35`: the DEM's `id`, the selected pixel's column
and row, and the sun's azimuth and height. Opening such a link opens that
view. The same string is saved on the device under `pixel-net:view`, so the
app reopens where it was left; a link wins over the saved view.

The share button sends a picture of the view with its link. Where the browser
has no share sheet, it copies the link.

A link pasted into a message shows a preview card. Its tags are in
`index.html` and need the site's whole address, which is `VITE_SITE_URL` in
`.env`.
```

In "Deploy", after the paragraph about `BASE_PATH`, add:

```markdown
For another host, also change `VITE_SITE_URL` in `.env` to the new address,
ending in a slash, so the link-preview tags point at it.
```

- [ ] **Step 4: Update `docs/polish-pass.md`**

Replace the row for item 4 with:

```markdown
| 4 | Copy-link button for linkable state | Met | The view is linkable: the address holds it. The share button shares the link where there is a share sheet and copies it where there is none. Tests: "the address follows the view, and is bare again at the default view", "a link opens its pixel and its sun", "with no share sheet, a press copies the link and says so" |
```

Replace the row for item 7 with:

```markdown
| 7 | 44px hit targets; selection visible | Met | Test: "touch targets are at least 44px", which covers the share button too. The selected point has a 3px halo. A finger can let go of it: "a double-tap on the terrain clears the selection, and the caption says so once". |
```

Replace item 13's evidence, ``lucide-react `Sun` and `Info` only``, with ``lucide-react `Sun`, `Info`, `Share` and `Check` only``.

At the end of the "Checked by hand on a phone" list, add:

```markdown
- [ ] The share button opens the share sheet with the picture and the link.
- [ ] The installed app reopens on the pixel and the sun it was left on.
- [ ] A link sent to another phone opens the same view there.
```

- [ ] **Step 5: Check the records against the code, and run everything once more**

Read each sentence added above and confirm it against the code: the storage key in `src/state/viewStore.ts`, the string's form in `src/state/view.ts`, the test names quoted in `docs/polish-pass.md` against `e2e/restore.spec.ts` and `e2e/share.spec.ts` (they must match exactly), the script name in `package.json`.

Run: `npm test`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test`
Expected: PASS for the whole suite. Report the counts in your hand-back.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-10-01-pixel-net-design.md PRODUCT.md README.md docs/polish-pass.md
git commit -m "Record sharing and restoring in the spec, the product context and the README" -m "The first spec gains an amendment that brings shareable links into scope and retires the sun's reset on open. PRODUCT.md, the README and the polish pass say what the app now does, how the link is written, and what is still checked by hand." -m "Claude-Session: https://claude.ai/code/session_0188RNZHUPogarCPaaFF2sKe"
```
