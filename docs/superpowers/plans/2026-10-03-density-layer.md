# Density Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One button on the net turns a translucent blue layer on and off that shows where the cloud is densest, and whether it is on travels with the view: the address, the saved view, shared links and the shared picture.

**Architecture:** A pure module, `src/terrain/density.ts`, counts the density on a 200 × 200 grid, picks the levels, renders the layer as an alpha image at any size, and writes the three pieces of text that describe it. The screen draws that image on a canvas over the cloud and fades it with CSS; the shared picture draws the same image. Whether the layer is on is one boolean in `App`, carried by `View` as `density=1`.

**Tech Stack:** Vite 8, React 19, TypeScript 7 (strict), Radix Tooltip, lucide-react, motion, Vitest (node environment), Playwright (Chromium, `phone` and `desktop` projects), Node 22.12 or later.

**Spec:** `docs/superpowers/specs/2026-10-03-density-layer-design.md`. It extends `docs/superpowers/specs/2026-10-01-pixel-net-design.md` and follows `docs/superpowers/specs/2026-10-03-share-and-restore-design.md`. Read the first of these in full.

## Global Constraints

- Work on the branch `density-layer`, which already holds the spec and this plan. Never push.
- No new dependency.
- Exact words: the button's name and tooltip are "Density". The key reads `2× to 6× even`, `2× even` or `Below 2× even`. The caption line reads `Density: lines from 2× to 6× an even spread` or `Density: a line at 2× an even spread`. The tooltip's method sentence is "Blue shading shows where pixels crowd together, counted in circles covering 1% of the net." The `×` is U+00D7, not the letter x.
- Exact values: the counting circle covers 1% of the net; the grid is 200 × 200; steps are 1, 2, 5, 10 and 20; at most six levels; fills start at 8% opacity and rise by 7% a band; lines are at 85%; the view part is `density=1`.
- The layer's color is `--viz-1`, read from the tokens, never written as a hex value in the app. Do not edit `src/styles/tokens.css`. Rust (`--accent`) is not used anywhere in this work.
- The layer is drawn over the cloud. `NetCanvas` keeps drawing the cloud exactly as it does; its one change is the word `export` on `inkOf`.
- No legend, no readout of density at a pixel, no settings for the circle, the levels or the color.
- TypeScript is strict with `noUnusedLocals` and `noUnusedParameters`; `npm run build` runs `tsc --noEmit` first and must pass after every task.
- Comments are plain sentences that say why, in the voice of the surrounding code. No emoji. One icon family: lucide.
- Unit tests: `npm test` (Vitest, node environment, files `src/**/*.test.ts`; there is no DOM in them).
- Browser tests need Chromium's libraries on this machine. Always run them as:
  `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test <files>`
  Each run builds the app and serves it on port 4173. If the port is taken, wait a minute and run again.
- Commits: a sentence-style subject as in `git log` ("Select a pixel and show it on the net") and a body that says why.

## Review Focus

Conditions the spec implies that are most likely to bite a person. Each has a test in the task that owns the code.

1. A link pasted into the open tab while the layer is on: the layer must follow the link, and the address must not lose or regain `density=1` for a moment while the view is rewritten. (Task 2)
2. The layer turned on after the DEM changed while it was off: it must show the new DEM's layer and key, never the old one's. (Task 3)
3. A small net with the sun parked low in the northeast: the sun's 44px target reaches the button's corner, and the button must still be pressable. (Task 3)
4. The window resized or the phone turned with the layer on: the layer must be redrawn at the cloud's new size, not stretched. (Task 3)
5. A DEM whose layer is empty (no pixel that can be plotted, or a peak below 2×): no crash, an honest key, and no caption line in the picture. (Task 1 for the words, Task 4 for the caption)

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/terrain/density.ts` | Create | The count, the levels, the alpha image, the words. No DOM. |
| `src/terrain/density.test.ts` | Create | Unit tests for all of the above. |
| `src/state/view.ts` | Modify | `View.density`; `density=1` written and read. |
| `src/state/view.test.ts` | Modify | Existing literals gain `density: false`; new tests. |
| `src/state/useViewPersistence.ts` | Modify | Writes on a change of the layer; applies it from a pasted link. |
| `src/App.tsx` | Modify | Holds whether the layer is on; passes it to the hook, the net card and the picture. |
| `src/components/DensityCanvas.tsx` | Create | The layer's canvas over the cloud. |
| `src/components/DensityToggle.tsx` | Create | The button. |
| `src/components/NetCanvas.tsx` | Modify | Exports `inkOf`. |
| `src/components/NetCard.tsx` | Modify | Places the canvas, the button and the key; extends the tooltip. |
| `src/app.css` | Modify | Styles for the layer, the button and the key. |
| `src/styles/contrast.test.ts` | Modify | Contrast of the key and the button; the layer's color comes from the token. |
| `src/share/text.ts`, `text.test.ts` | Modify | The caption's density line. |
| `src/share/drawCard.ts` | Modify | Draws the layer in the picture. |
| `src/help/howTo.ts`, `howTo.test.ts`, `news.json`, `CHANGELOG.md` | Modify | One how-to line, one news entry. |
| `e2e/density.spec.ts` | Create | Browser tests for the layer. |
| `e2e/restore.spec.ts`, `share.spec.ts`, `polish.spec.ts`, `help.spec.ts` | Modify | Tests that the new part touches. |
| `PRODUCT.md`, `README.md`, `docs/polish-pass.md` | Modify | The records. |

---

### Task 1: The count, the levels, the image and the words

**Files:**
- Create: `src/terrain/density.ts`
- Test: `src/terrain/density.test.ts`

**Interfaces:**
- Consumes: `toNet`, `fromNet` from `src/terrain/net.ts`; `NET_RIM` from `src/terrain/cloud.ts`; `Surface` from `src/terrain/types.ts`.
- Produces:
  - `interface DensityField { values: Float32Array; size: number; peak: number; count: number }`
  - `densityField(surface: Surface): DensityField`
  - `densityOf(surface: Surface): DensityField` (counted once per surface, then remembered)
  - `knownDensity(surface: Surface): DensityField | null` (the remembered field, without counting)
  - `densityLevels(peak: number): number[]`
  - `densityAlpha(field: DensityField, levels: number[], size: number): Uint8ClampedArray` (alpha 0 to 255 per cell of a `size` × `size` image, laid out as `cloudAlpha` lays out the cloud)
  - `densityKey(field: DensityField): string`
  - `densityCaption(field: DensityField): string | null`
  - `densitySentence(field: DensityField): string`
  - `DENSITY_GRID = 200`, `COUNT_SHARE = 0.01`

- [ ] **Step 1: Write the failing tests**

Create `src/terrain/density.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NET_RIM } from './cloud';
import { parseDem } from './dem';
import {
  DENSITY_GRID,
  type DensityField,
  densityAlpha,
  densityCaption,
  densityField,
  densityKey,
  densityLevels,
  densityOf,
  densitySentence,
  knownDensity,
} from './density';
import { fromNet, toNet } from './net';
import { computeSurface } from './surface';
import type { Surface } from './types';

/** A surface with one pixel for each slope and aspect given. */
function surfaceOf(points: Array<{ slope: number; aspect: number }>): Surface {
  const n = points.length;
  return {
    width: n,
    height: 1,
    slope: Float32Array.from(points, (p) => p.slope),
    aspect: Float32Array.from(points, (p) => p.aspect),
    nx: new Float32Array(n),
    ny: new Float32Array(n),
    nz: new Float32Array(n).fill(1),
    flat: new Uint8Array(n),
    nodata: new Uint8Array(n),
  };
}

/** Pixels spread evenly over the whole net: one at each node of a fine lattice inside the rim. */
function evenSpread(): Surface {
  const points = [];
  const step = 0.004;
  for (let y = -1 + step / 2; y < 1; y += step) {
    for (let x = -1 + step / 2; x < 1; x += step) {
      if (x * x + y * y < 1) points.push(fromNet(x, y));
    }
  }
  return surfaceOf(points);
}

/** The value of the grid cell that holds a slope and aspect. */
function valueAt(field: DensityField, slope: number, aspect: number): number {
  const p = toNet(slope, aspect);
  const x = Math.floor(((p.x + 1) / 2) * field.size);
  const y = Math.floor(((1 - p.y) / 2) * field.size);
  return field.values[y * field.size + x];
}

/** A field with one round peak of the given height at the center of the net. */
function peakedField(peak: number): DensityField {
  const size = DENSITY_GRID;
  const values = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.hypot((x + 0.5) / size - 0.5, (y + 0.5) / size - 0.5) * 2;
      values[y * size + x] = Math.max(0, peak * (1 - r / 0.6));
    }
  }
  return { values, size, peak, count: 1000 };
}

async function gore(): Promise<Surface> {
  const file = readFileSync('public/dems/gore.tif');
  const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
  return computeSurface(await parseDem(buffer));
}

describe('densityField', () => {
  it('reads about 1 where pixels are spread evenly', () => {
    const field = densityField(evenSpread());
    for (const [slope, aspect] of [[0.5, 0], [20, 45], [40, 200], [55, 300]]) {
      expect(valueAt(field, slope, aspect), `slope ${slope}, aspect ${aspect}`).toBeCloseTo(1, 1);
    }
  });

  it('reads low at the rim, where part of the circle is outside the net', () => {
    const field = densityField(evenSpread());
    expect(valueAt(field, 89, 90)).toBeLessThan(0.8);
    expect(valueAt(field, 89, 90)).toBeGreaterThan(0.3);
  });

  it('reads about 100 where every pixel is', () => {
    const field = densityField(surfaceOf(Array.from({ length: 500 }, () => ({ slope: 30, aspect: 90 }))));
    expect(field.peak).toBeGreaterThan(98);
    expect(field.peak).toBeLessThan(101);
    expect(valueAt(field, 30, 90)).toBe(field.peak);
    expect(valueAt(field, 30, 270)).toBe(0);
    expect(field.count).toBe(500);
  });

  it('gives the same picture however many pixels there are', () => {
    const few = densityField(surfaceOf(Array.from({ length: 10 }, () => ({ slope: 30, aspect: 90 }))));
    const many = densityField(surfaceOf(Array.from({ length: 5000 }, () => ({ slope: 30, aspect: 90 }))));
    expect(few.peak).toBeCloseTo(many.peak, 5);
  });

  it('leaves out flat pixels and pixels with no data, as the cloud does', () => {
    const surface = surfaceOf([
      { slope: 30, aspect: 90 },
      { slope: 0, aspect: Number.NaN },
      { slope: 45, aspect: 180 },
    ]);
    surface.flat[1] = 1;
    surface.nodata[2] = 1;
    const field = densityField(surface);
    expect(field.count).toBe(1);
    expect(valueAt(field, 45, 180)).toBe(0);
    expect(valueAt(field, 0, 0)).toBe(0);
  });

  it('is all zero, with no peak, when no pixel can be plotted', () => {
    const surface = surfaceOf([{ slope: 0, aspect: Number.NaN }]);
    surface.flat[0] = 1;
    const field = densityField(surface);
    expect(field).toMatchObject({ peak: 0, count: 0, size: DENSITY_GRID });
    expect(field.values.every((value) => value === 0)).toBe(true);
  });

  it('counts a pixel on the rim, in the last cell and not past it', () => {
    const field = densityField(surfaceOf([{ slope: 90, aspect: 90 }, { slope: 90, aspect: 180 }]));
    expect(field.count).toBe(2);
    expect(Number.isFinite(field.peak)).toBe(true);
    expect(valueAt(field, 89.9, 90)).toBeGreaterThan(0);
  });

  it('finds the Gore Range densest on its southwest slopes, at about 6.5 times an even spread', async () => {
    const field = densityField(await gore());
    expect(field.peak).toBeGreaterThan(6.2);
    expect(field.peak).toBeLessThan(6.8);
    const at = field.values.indexOf(field.peak);
    const x = (((at % field.size) + 0.5) / field.size) * 2 - 1;
    const y = 1 - ((Math.floor(at / field.size) + 0.5) / field.size) * 2;
    const { slope, aspect } = fromNet(x, y);
    expect(slope).toBeGreaterThan(32);
    expect(slope).toBeLessThan(39);
    expect(aspect).toBeGreaterThan(228);
    expect(aspect).toBeLessThan(244);
    expect(densityLevels(field.peak)).toEqual([2, 3, 4, 5, 6]);
  });
});

describe('densityOf', () => {
  it('counts a surface once and remembers it', () => {
    const surface = surfaceOf([{ slope: 30, aspect: 90 }]);
    expect(knownDensity(surface)).toBeNull();
    const field = densityOf(surface);
    expect(densityOf(surface)).toBe(field);
    expect(knownDensity(surface)).toBe(field);
  });
});

describe('densityLevels', () => {
  it.each([
    [0, []],
    [1.99, []],
    [2, [2]],
    [6.5, [2, 3, 4, 5, 6]],
    [7.99, [2, 3, 4, 5, 6, 7]],
    [8, [2, 4, 6, 8]],
    [13.99, [2, 4, 6, 8, 10, 12]],
    [14, [5, 10]],
    [34.99, [5, 10, 15, 20, 25, 30]],
    [35, [10, 20, 30]],
    [69.99, [10, 20, 30, 40, 50, 60]],
    [70, [20, 40, 60]],
    [100, [20, 40, 60, 80, 100]],
  ])('for a peak of %s gives %j', (peak, levels) => {
    expect(densityLevels(peak)).toEqual(levels);
  });

  it('never gives more than six, whatever the peak', () => {
    for (let peak = 0; peak <= 100; peak += 0.25) {
      expect(densityLevels(peak).length, `peak ${peak}`).toBeLessThanOrEqual(6);
    }
    expect(densityLevels(1e6).length).toBeLessThanOrEqual(6);
  });

  it('gives none for a peak that is not a number', () => {
    expect(densityLevels(Number.NaN)).toEqual([]);
  });
});

describe('densityAlpha', () => {
  const SIZE = 400;
  const field = peakedField(6.5);
  const levels = densityLevels(field.peak);
  const alpha = densityAlpha(field, levels, SIZE);
  const along = (x: number) => alpha[(SIZE / 2) * SIZE + x];

  it('returns one alpha value per cell', () => {
    expect(alpha).toHaveLength(SIZE * SIZE);
  });

  it('is clear outside the outermost level', () => {
    // The peak falls to 2 at 0.6 × (1 − 2 / 6.5) of the way to the edge of the square.
    const edge = Math.ceil((SIZE / 2) * NET_RIM * 0.6 * (1 - 2 / 6.5));
    for (let x = SIZE / 2 + edge + 3; x < SIZE; x++) expect(along(x), `x ${x}`).toBe(0);
    expect(alpha[0]).toBe(0);
  });

  it('fills more strongly inward, with a line at each level', () => {
    const seen: number[] = [];
    for (let x = SIZE - 1; x >= SIZE / 2; x--) {
      const value = along(x);
      if (value > 0 && value !== seen[seen.length - 1]) seen.push(value);
    }
    const line = Math.round(255 * 0.85);
    const fills = seen.filter((value) => value !== line);
    expect(fills).toEqual([0.08, 0.15, 0.22, 0.29, 0.36].map((share) => Math.round(255 * share)));
    expect(seen.filter((value) => value === line)).toHaveLength(5);
    expect(seen[0]).toBe(line);
  });

  it('is empty when there are no levels', () => {
    expect(densityAlpha(field, [], SIZE).every((value) => value === 0)).toBe(true);
  });

  it('is empty at no size', () => {
    expect(densityAlpha(field, levels, 0)).toHaveLength(0);
  });
});

describe('the words', () => {
  const some = peakedField(6.5);
  const one = peakedField(2.4);
  const none = peakedField(1.5);
  const steep = peakedField(40);
  const nothing: DensityField = { values: new Float32Array(DENSITY_GRID * DENSITY_GRID), size: DENSITY_GRID, peak: 0, count: 0 };

  it('name the first level and the last in the key', () => {
    expect(densityKey(some)).toBe('2× to 6× even');
    expect(densityKey(steep)).toBe('10× to 40× even');
    expect(densityKey(one)).toBe('2× even');
    expect(densityKey(none)).toBe('Below 2× even');
    expect(densityKey(nothing)).toBe('');
  });

  it('say what the lines are in the caption, and nothing for an empty layer', () => {
    expect(densityCaption(some)).toBe('Density: lines from 2× to 6× an even spread');
    expect(densityCaption(one)).toBe('Density: a line at 2× an even spread');
    expect(densityCaption(none)).toBeNull();
    expect(densityCaption(nothing)).toBeNull();
  });

  it('explain the layer in the tooltip, with the DEM’s own levels', () => {
    const method = 'Blue shading shows where pixels crowd together, counted in circles covering 1% of the net.';
    expect(densitySentence(some)).toBe(
      `${method} The outer line is 2 times an even spread, and each line inward adds 1 more.`,
    );
    expect(densitySentence(steep)).toBe(
      `${method} The outer line is 10 times an even spread, and each line inward adds 10 more.`,
    );
    expect(densitySentence(one)).toBe(`${method} The line is 2 times an even spread.`);
    expect(densitySentence(none)).toBe(method);
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/terrain/density.test.ts`
Expected: FAIL, because `./density` cannot be found.

- [ ] **Step 3: Write the module**

Create `src/terrain/density.ts`:

```ts
import { NET_RIM } from './cloud';
import { toNet } from './net';
import type { Surface } from './types';

/** Cells along one side of the grid the density is counted on. */
export const DENSITY_GRID = 200;

/** Share of the net's area that one count covers: the classic Schmidt circle. */
export const COUNT_SHARE = 0.01;

/** The steps a DEM's levels may rise by, and the most levels there may be. */
const STEPS = [1, 2, 5, 10, 20];
const MAX_LEVELS = 6;

/** Opacity of the outermost band, what each band inward adds, and the lines. */
const FIRST_FILL = 0.08;
const FILL_STEP = 0.07;
const LINE = 0.85;

/** Image size up to which a line is one cell either side of a level. */
const LINE_REFERENCE = 1000;

export interface DensityField {
  /**
   * Times an even spread, for each cell of a `size` × `size` grid over the
   * square that bounds the rim, row by row from the north edge.
   */
  values: Float32Array;
  size: number;
  /** The highest value, or 0 when nothing was counted. */
  peak: number;
  /** How many pixels were counted: the ones the cloud plots. */
  count: number;
}

/**
 * How crowded each part of the net is. A cell's value is the share of the
 * plottable pixels within a circle covering 1% of the net, divided by the
 * share of the net the circle covers, so 1 is an even spread and 100 is
 * every pixel in one circle. Near the rim part of the circle lies outside
 * the net and the value reads low; it is not corrected.
 */
export function densityField(surface: Surface): DensityField {
  const size = DENSITY_GRID;
  const cell = 2 / size; // in units of the rim's radius
  const counts = new Uint32Array(size * size);
  let count = 0;
  for (let i = 0; i < surface.slope.length; i++) {
    if (surface.nodata[i] || surface.flat[i]) continue;
    const p = toNet(surface.slope[i], surface.aspect[i]);
    const x = Math.min(size - 1, Math.max(0, Math.floor((p.x + 1) / cell)));
    const y = Math.min(size - 1, Math.max(0, Math.floor((1 - p.y) / cell)));
    counts[y * size + x]++;
    count++;
  }

  const values = new Float32Array(size * size);
  if (count === 0) return { values, size, peak: 0, count };

  // The cells whose centers lie within the circle, as offsets from its center.
  const radius = Math.sqrt(COUNT_SHARE);
  const reach = Math.ceil(radius / cell);
  const offsets: number[] = [];
  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      if ((dx * dx + dy * dy) * cell * cell <= radius * radius) offsets.push(dx, dy);
    }
  }
  // The share of the net those cells cover; the net's area is π.
  const covered = ((offsets.length / 2) * cell * cell) / Math.PI;

  let peak = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0;
      for (let o = 0; o < offsets.length; o += 2) {
        const xx = x + offsets[o];
        const yy = y + offsets[o + 1];
        if (xx >= 0 && yy >= 0 && xx < size && yy < size) sum += counts[yy * size + xx];
      }
      const at = y * size + x;
      values[at] = sum / count / covered;
      // Read back, so the peak is exactly a value the grid holds.
      if (values[at] > peak) peak = values[at];
    }
  }
  return { values, size, peak, count };
}

const fields = new WeakMap<Surface, DensityField>();

/** The density of a surface, counted the first time it is asked for. */
export function densityOf(surface: Surface): DensityField {
  let field = fields.get(surface);
  if (!field) {
    field = densityField(surface);
    fields.set(surface, field);
  }
  return field;
}

/** The density of a surface if it has been counted already. */
export function knownDensity(surface: Surface): DensityField | null {
  return fields.get(surface) ?? null;
}

/**
 * The levels lines are drawn at: whole multiples of the smallest step that
 * gives no more than six. With a step of 1 the first level is 2, because 1
 * is only an even spread.
 */
export function densityLevels(peak: number): number[] {
  let levels: number[] = [];
  for (const step of STEPS) {
    levels = [];
    for (let level = step === 1 ? 2 : step; level <= peak; level += step) levels.push(level);
    if (levels.length <= MAX_LEVELS) return levels;
  }
  return levels.slice(0, MAX_LEVELS);
}

/** The density at a position on the net, read between the centers of the grid's cells. */
function densityAt(field: DensityField, x: number, y: number): number {
  const { values, size } = field;
  const fx = ((x + 1) / 2) * size - 0.5;
  const fy = ((1 - y) / 2) * size - 0.5;
  const x0 = Math.min(size - 2, Math.max(0, Math.floor(fx)));
  const y0 = Math.min(size - 2, Math.max(0, Math.floor(fy)));
  const tx = Math.min(1, Math.max(0, fx - x0));
  const ty = Math.min(1, Math.max(0, fy - y0));
  const at = y0 * size + x0;
  return (
    values[at] * (1 - tx) * (1 - ty) +
    values[at + 1] * tx * (1 - ty) +
    values[at + size] * (1 - tx) * ty +
    values[at + size + 1] * tx * ty
  );
}

/**
 * Alpha (0 to 255) for each cell of a `size` × `size` image of the layer,
 * laid out as `cloudAlpha` lays out the cloud. A band is the part of the net
 * at or above one level and below the next: bands are filled more strongly
 * inward, and a line runs wherever one band meets another or the open net.
 */
export function densityAlpha(field: DensityField, levels: number[], size: number): Uint8ClampedArray {
  const alpha = new Uint8ClampedArray(Math.max(0, size) * Math.max(0, size));
  if (size <= 0 || levels.length === 0) return alpha;
  const center = size / 2;
  const rim = center * NET_RIM;

  // Which band each cell is in: −1 outside every level and outside the rim.
  const band = new Int8Array(size * size).fill(-1);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5 - center) / rim;
      const ny = (center - y - 0.5) / rim;
      if (nx * nx + ny * ny > 1) continue;
      const value = densityAt(field, nx, ny);
      let index = -1;
      while (index + 1 < levels.length && value >= levels[index + 1]) index++;
      band[y * size + x] = index;
    }
  }

  const reach = Math.max(1, Math.round(size / LINE_REFERENCE));
  const bandAt = (x: number, y: number) => (x < 0 || y < 0 || x >= size || y >= size ? -1 : band[y * size + x]);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = band[y * size + x];
      const edge =
        bandAt(x - reach, y) !== index ||
        bandAt(x + reach, y) !== index ||
        bandAt(x, y - reach) !== index ||
        bandAt(x, y + reach) !== index;
      if (edge) alpha[y * size + x] = 255 * LINE;
      else if (index >= 0) alpha[y * size + x] = 255 * (FIRST_FILL + FILL_STEP * index);
    }
  }
  return alpha;
}

/** The key on the net: the first level and the last. Empty when nothing was counted. */
export function densityKey(field: DensityField): string {
  if (field.count === 0) return '';
  const levels = densityLevels(field.peak);
  if (levels.length === 0) return 'Below 2× even';
  if (levels.length === 1) return `${levels[0]}× even`;
  return `${levels[0]}× to ${levels[levels.length - 1]}× even`;
}

/** The picture's caption line, or null when the layer is empty. */
export function densityCaption(field: DensityField): string | null {
  const levels = densityLevels(field.peak);
  if (levels.length === 0) return null;
  if (levels.length === 1) return `Density: a line at ${levels[0]}× an even spread`;
  return `Density: lines from ${levels[0]}× to ${levels[levels.length - 1]}× an even spread`;
}

/** What the net's tooltip adds while the layer is on. */
export function densitySentence(field: DensityField): string {
  const method = 'Blue shading shows where pixels crowd together, counted in circles covering 1% of the net.';
  const levels = densityLevels(field.peak);
  if (levels.length === 0) return method;
  if (levels.length === 1) return `${method} The line is ${levels[0]} times an even spread.`;
  return `${method} The outer line is ${levels[0]} times an even spread, and each line inward adds ${levels[1] - levels[0]} more.`;
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/terrain/density.test.ts`
Expected: PASS, 32 tests.

Then run `npm test` and `npx tsc --noEmit`. Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add src/terrain/density.ts src/terrain/density.test.ts
git commit -m "Count how crowded each part of the net is" -m "The density layer needs the count, the levels its lines are drawn at, the image of its bands, and the words that say what they mean. They are in one module with no DOM, so the screen and the shared picture draw the same layer."
```

---

### Task 2: The layer's state in the view

After this task the app remembers whether the layer is on, in the address and on the device, although nothing yet shows the layer or turns it on. A link is the only way to set it.

**Files:**
- Modify: `src/state/view.ts`
- Modify: `src/state/view.test.ts`
- Modify: `src/state/useViewPersistence.ts`
- Modify: `src/App.tsx`
- Test: `e2e/restore.spec.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces:
  - `View` gains `density: boolean`; `DEFAULT_VIEW.density` is `false`.
  - `useViewPersistence` options gain `density: boolean` and `onDensity: (on: boolean) => void`.
  - In `App`: `const [density, setDensity] = useState(start.density);`. Tasks 3 and 4 use `density` and `setDensity`.

- [ ] **Step 1: Give the existing tests' views the new part**

Every `View` written out in `src/state/view.test.ts` needs `density: false`. Run this from the repository root:

```bash
sed -i \
  -e 's/sun: DEFAULT_SUN }/sun: DEFAULT_SUN, density: false }/g' \
  -e 's/sun: LOW_SOUTHEAST }/sun: LOW_SOUTHEAST, density: false }/g' \
  -e 's/sun: { azimuth: 0, altitude: 90 } }/sun: { azimuth: 0, altitude: 90 }, density: false }/' \
  -e 's/pixel: null, sun }/pixel: null, sun, density: false }/g' \
  -e 's/^      sun: DEFAULT_SUN,$/      sun: DEFAULT_SUN,\n      density: false,/' \
  src/state/view.test.ts
grep -c 'density: false' src/state/view.test.ts
```

Expected: `23`.

- [ ] **Step 2: Write the failing unit tests**

`encodeSharedView` and `namesView` are already imported. Append to `src/state/view.test.ts`:

```ts
describe('the density layer', () => {
  const ON: View = { dem: 'gore', pixel: WEST, sun: LOW_SOUTHEAST, density: true };

  it('is written last, as density=1', () => {
    expect(encodeView(ON, 'gore')).toBe('dem=gore&px=150,210&sun=120,35&density=1');
    expect(encodeView({ ...DEFAULT_VIEW, density: true }, 'gore')).toBe('dem=gore&density=1');
  });

  it('is left out when it is off', () => {
    expect(encodeView({ ...ON, density: false }, 'gore')).toBe('dem=gore&px=150,210&sun=120,35');
    expect(encodeView(DEFAULT_VIEW, 'gore')).toBe('');
  });

  it('is read back', () => {
    expect(decodeView(encodeView(ON, 'gore'))).toEqual(ON);
    expect(decodeView('density=1')).toEqual({ ...DEFAULT_VIEW, density: true });
  });

  it('reads as off in a link made before there was a layer', () => {
    expect(decodeView('dem=gore&px=150,210&sun=120,35').density).toBe(false);
  });

  it('reads as off for any value but 1', () => {
    for (const value of ['', '0', 'true', 'on', '2', '01', '1.0', ' 1']) {
      expect(decodeView(`density=${value}`).density, `density=${value}`).toBe(false);
    }
  });

  it('is shared like any other part', () => {
    expect(encodeSharedView({ ...DEFAULT_VIEW, density: true }, 'gore')).toBe('dem=gore&density=1');
  });

  it('makes a string name a view', () => {
    expect(namesView('density=1')).toBe(true);
    expect(namesView('density=0')).toBe(true);
  });
});
```

- [ ] **Step 3: Run the unit tests to see them fail**

Run: `npx vitest run src/state/view.test.ts`
Expected: FAIL. The new tests fail on `density`, and `npx tsc --noEmit` reports that `density` does not exist in type `View`.

- [ ] **Step 4: Write and read the part in `src/state/view.ts`**

```diff
--- a/src/state/view.ts
+++ b/src/state/view.ts
@@ -1,7 +1,7 @@
 import { DEFAULT_SUN, MIN_SUN_ALTITUDE } from '../terrain/net';
 import type { Pixel, Sun } from '../terrain/types';
 
-/** What the screen shows: which DEM, which pixel is selected, and where the sun is. */
+/** What the screen shows: which DEM, which pixel is selected, where the sun is, and whether the density layer is on. */
 export interface View {
   /** The DEM's `id` in the list, or null for the first DEM. */
   dem: string | null;
@@ -9,9 +9,11 @@ export interface View {
   pixel: Pixel | null;
   /** In whole degrees, the precision the sun's label shows. */
   sun: Sun;
+  /** Whether the density layer is on. */
+  density: boolean;
 }
 
-export const DEFAULT_VIEW: View = { dem: null, pixel: null, sun: DEFAULT_SUN };
+export const DEFAULT_VIEW: View = { dem: null, pixel: null, sun: DEFAULT_SUN, density: false };
 
 /** The sun in whole degrees: azimuth 0 to 359, height within the limits a drag has. */
 function wholeSun(sun: Sun): Sun {
@@ -27,7 +29,7 @@ function demPart(dem: string): string {
 }
 
 /**
- * The view as text, such as `dem=gore&px=150,210&sun=120,35`. A part at its
+ * The view as text, such as `dem=gore&px=150,210&sun=120,35&density=1`. A part at its
  * default is left out, and the default view is the empty string. Any other
  * view names its DEM, so a link keeps its meaning if the list is reordered.
  */
@@ -35,10 +37,11 @@ export function encodeView(view: View, firstDem: string): string {
   const dem = view.dem ?? firstDem;
   const sun = wholeSun(view.sun);
   const defaultSun = sun.azimuth === DEFAULT_SUN.azimuth && sun.altitude === DEFAULT_SUN.altitude;
-  if (dem === firstDem && !view.pixel && defaultSun) return '';
+  if (dem === firstDem && !view.pixel && defaultSun && !view.density) return '';
   const parts = [demPart(dem)];
   if (view.pixel) parts.push(`px=${view.pixel.col},${view.pixel.row}`);
   if (!defaultSun) parts.push(`sun=${sun.azimuth},${sun.altitude}`);
+  if (view.density) parts.push('density=1');
   return parts.join('&');
 }
 
@@ -77,13 +80,15 @@ export function decodeView(text: string): View {
     dem: params.get('dem') || null,
     pixel: decodePixel(params.get('px')),
     sun: decodeSun(params.get('sun')),
+    // Only `1` turns the layer on, so a link made before there was a layer reads as off.
+    density: params.get('density') === '1',
   };
 }
 
 /** True if `text` names any part of a view. A fragment that names none is not a link to a view. */
 export function namesView(text: string): boolean {
   const params = new URLSearchParams(text);
-  return params.has('dem') || params.has('px') || params.has('sun');
+  return params.has('dem') || params.has('px') || params.has('sun') || params.has('density');
 }
 
 export function pixelInside(pixel: Pixel, width: number, height: number): boolean {
```

- [ ] **Step 5: Run the unit tests to see them pass**

Run: `npx vitest run src/state/view.test.ts`
Expected: PASS, 27 tests. `npx tsc --noEmit` now fails only in `src/state/useViewPersistence.ts`, where a `View` is built without `density`. The next steps fix that.

- [ ] **Step 6: Write the failing browser tests**

In `e2e/restore.spec.ts`, append:

```ts
test('the density part of a link is kept as the view changes', async ({ page }) => {
  await openLink(page, 'dem=gore&px=150,210&density=1');
  await clickPixel(page, 200, 230);
  await expect.poll(() => fragment(page)).toBe('#dem=gore&px=200,230&density=1');
  await expect.poll(() => saved(page)).toBe('dem=gore&px=200,230&density=1');
});

test('a density part that is not 1 is dropped from the address', async ({ page }) => {
  await openLink(page, 'dem=gore&px=150,210&density=yes');
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
  await expect.poll(() => fragment(page)).toBe('#dem=gore&px=150,210');
});

test('a link pasted with a density part keeps it in the address from the first moment', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => {
    window.location.hash = 'dem=gore&px=150,210&density=1';
  });
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
  // The view is written as soon as the pixel is selected. It must be written with the layer the link asked for.
  expect(await fragment(page)).toBe('#dem=gore&px=150,210&density=1');
  await page.waitForTimeout(600); // past the 400 ms after which a change is written
  expect(await fragment(page)).toBe('#dem=gore&px=150,210&density=1');
  expect(await saved(page)).toBe('dem=gore&px=150,210&density=1');
});

test('a link pasted with no density part turns the layer off', async ({ page }) => {
  await openLink(page, 'dem=gore&px=150,210&density=1');
  await expect(slope(page)).toHaveText(WEST_SLOPE.slope);
  await page.evaluate(() => {
    window.location.hash = 'dem=gore&px=200,230';
  });
  await expect(slope(page)).toHaveText('41.5°');
  // A link describes the whole view. The next change is written without the layer.
  await clickPixel(page, WEST_SLOPE.col, WEST_SLOPE.row);
  await expect.poll(() => fragment(page)).toBe('#dem=gore&px=150,210');
  await page.waitForTimeout(600);
  expect(await fragment(page)).toBe('#dem=gore&px=150,210');
});
```

`fragment`, `saved`, `slope`, `WEST_SLOPE`, `openApp`, `openLink` and `clickPixel` are already defined or imported in that file.

- [ ] **Step 7: Carry the layer through `src/state/useViewPersistence.ts`**

```diff
--- a/src/state/useViewPersistence.ts
+++ b/src/state/useViewPersistence.ts
@@ -27,6 +27,10 @@ interface ViewPersistenceOptions {
   selection: MotionValue<number>;
   sunAzimuth: MotionValue<number>;
   sunAltitude: MotionValue<number>;
+  /** Whether the density layer is on. */
+  density: boolean;
+  /** Turns the density layer on or off, as its button does. */
+  onDensity: (on: boolean) => void;
   /** Switches to another DEM, as the picker does. */
   onSelectDem: (id: string) => void;
   /** A view was applied; `selected` says whether it selected a pixel. */
@@ -34,7 +38,8 @@ interface ViewPersistenceOptions {
 }
 
 /**
- * Keeps the view (which DEM, which pixel, where the sun is) in step with the
+ * Keeps the view (which DEM, which pixel, where the sun is, whether the
+ * density layer is on) in step with the
  * address bar and with what is saved on the device.
  *
  * Reading: the view to open on has its pixel selected once its DEM has
@@ -57,14 +62,14 @@ export function useViewPersistence(options: ViewPersistenceOptions): (shared?: b
 
   const viewText = useCallback(
     (shared = false): string | null => {
-      const { entries, activeId, loaded } = latest.current;
+      const { entries, activeId, loaded, density } = latest.current;
       if (!activeId || entries.length === 0) return null;
       const index = selection.get();
       // While another DEM loads there is no pixel to name: the switch cleared it.
       const pixel = index >= 0 && loaded?.id === activeId ? toPixel(index, loaded.width) : null;
       const encode = shared ? encodeSharedView : encodeView;
       return encode(
-        { dem: activeId, pixel, sun: { azimuth: sunAzimuth.get(), altitude: sunAltitude.get() } },
+        { dem: activeId, pixel, sun: { azimuth: sunAzimuth.get(), altitude: sunAltitude.get() }, density },
         entries[0].id,
       );
     },
@@ -109,9 +114,13 @@ export function useViewPersistence(options: ViewPersistenceOptions): (shared?: b
   /** Applies a view read from the address while the app is open. */
   const apply = useCallback(
     (view: View) => {
-      const { entries, activeId, onSelectDem } = latest.current;
+      const { entries, activeId, onSelectDem, onDensity } = latest.current;
       sunAzimuth.set(view.sun.azimuth);
       sunAltitude.set(view.sun.altitude);
+      onDensity(view.density);
+      // The view is written below, before the next render brings the new
+      // value: without this it would be written with the layer as it was.
+      latest.current = { ...latest.current, density: view.density };
       waiting.current = view;
       // A DEM that is not in the list means the first, as it does on opening.
       const wanted = entries.find((entry) => entry.id === view.dem)?.id ?? entries[0]?.id;
@@ -142,6 +151,11 @@ export function useViewPersistence(options: ViewPersistenceOptions): (shared?: b
     if (options.activeId) schedule();
   }, [options.activeId, schedule]);
 
+  // And so does the density layer turning on or off.
+  useEffect(() => {
+    schedule();
+  }, [options.density, schedule]);
+
   // A page that is hidden or closed may never run its timer: write now.
   useEffect(() => {
     const flush = () => {
```

- [ ] **Step 8: Hold the layer's state in `src/App.tsx`**

After the line `const sunAltitude = useMotionValue(start.sun.altitude);` add:

```ts
  const [density, setDensity] = useState(start.density);
```

In the call to `useViewPersistence`, after `sunAltitude,` add:

```ts
    density,
    onDensity: setDensity,
```

- [ ] **Step 9: Run everything**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test e2e/restore.spec.ts`
Expected: PASS in both projects, the four new tests included.

To see that the third test guards Review Focus 1, remove the line `latest.current = { ...latest.current, density: view.density };` for a moment and run it again. Expected: that test FAILS at its first `fragment` check. Put the line back.

- [ ] **Step 10: Commit**

```bash
git add src/state/view.ts src/state/view.test.ts src/state/useViewPersistence.ts src/App.tsx e2e/restore.spec.ts
git commit -m "Carry the density layer in the view" -m "Whether the layer is on is written as density=1 in the address, the saved view and shared links, and left out when it is off, so every link made before opens as it did. Nothing shows the layer yet."
```

---

### Task 3: The layer, the button and the key on the net

**Files:**
- Create: `src/components/DensityCanvas.tsx`
- Create: `src/components/DensityToggle.tsx`
- Modify: `src/components/NetCanvas.tsx` (export `inkOf`)
- Modify: `src/components/NetCard.tsx`
- Modify: `src/App.tsx`
- Modify: `src/app.css`
- Modify: `src/styles/contrast.test.ts`
- Create: `e2e/density.spec.ts`
- Modify: `e2e/polish.spec.ts`

**Interfaces:**
- Consumes: from Task 1, `densityOf`, `knownDensity`, `densityLevels`, `densityAlpha`, `densityKey`, `densitySentence`. From Task 2, `density` and `setDensity` in `App`.
- Produces:
  - `DensityCanvas({ surface, size, on })`
  - `DensityToggle({ on, onChange })`
  - `NetCard` props gain `density: boolean` and `onDensityChange: (on: boolean) => void`.
  - Test ids: `density-toggle` (the button), `density-layer` (the wrapper, with `data-on`), `net-density` (the canvas), `density-key`.

- [ ] **Step 1: Write the failing unit tests for the colors**

In `src/styles/contrast.test.ts`, add `['viz-1', 'paper'],` to the list under `'text in --%s on --%s reaches 4.5:1'`, and add `['viz-1', 'sunken'],` and `['ink-500', 'paper'],` to the list under `'a control in --%s on --%s reaches 3:1'`. Then append:

```ts
describe('density layer', () => {
  it.each([
    ['the layer', /\.net__density \{[^}]*color: var\(--viz-1\)/],
    ['the key', /\.net \.net__key \{[^}]*color: var\(--viz-1\)/],
    ['the pressed button', /\.net \.net__toggle\[aria-pressed='true'\] \{[^}]*color: var\(--viz-1\)/],
  ])('draws %s in --viz-1', (_, rule) => {
    expect(appCss).toMatch(rule);
  });

  it('writes no color of its own', () => {
    const block = appCss.slice(appCss.indexOf('/* ---------- Density layer ---------- */'));
    expect(block.slice(0, block.indexOf('/* ---------- Readout ---------- */'))).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
```

Run: `npx vitest run src/styles/contrast.test.ts`
Expected: the three contrast rows PASS (the tokens exist); the three "draws … in --viz-1" tests FAIL.

- [ ] **Step 2: Write the failing browser tests**

Create `e2e/density.spec.ts`:

```ts
import { type Page, expect, test } from '@playwright/test';
import { NET_HELP, fingerprint, inkedPixels, netCloud, openApp, openLink, serveTwoDems, stage } from './helpers';

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

  await page.getByRole('tab', { name: 'Second' }).click();
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

  await page.getByRole('tab', { name: 'Second' }).click();
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

test('the button and the key sit in the net’s corners, clear of the rim', async ({ page }) => {
  await openApp(page);
  await toggle(page).click();
  await expect(key(page)).toHaveCSS('opacity', '1');
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
});

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
```

- [ ] **Step 3: Update the two existing browser tests that the button changes**

In `e2e/polish.spec.ts`, in the test that walks the Tab order, the button is a new stop just before the sun. Replace the `expected` array with:

```ts
  const expected =
    testInfo.project.name === 'phone'
      ? ['Gore Range', 'Second', shareName, helpName, 'Density', sunName, terrainName]
      : ['Gore Range', 'Second', shareName, helpName, terrainName, 'Density', sunName];
```

and change the comment above it to end "The info dot is help, not a stop; the density button is a control, and is one."

In the same file, at the end of the test `'touch targets are at least 44px'`, after the loop over the info dot, add:

```ts
  // The density button is 28px with an invisible 44px target around it.
  const density = page.getByTestId('density-toggle');
  for (const [dx, dy] of [[21, 0], [-21, 0], [0, 21], [0, -21]]) {
    expect(await hitAt(density, dx, dy), `density button at ${dx},${dy}`).toBe(true);
  }
```

- [ ] **Step 4: Run the browser tests to see them fail**

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test e2e/density.spec.ts`
Expected: FAIL. Nothing has the test id `density-toggle`.

- [ ] **Step 5: Let the layer read its color the way the cloud does**

In `src/components/NetCanvas.tsx`, change `function inkOf(element: Element)` to `export function inkOf(element: Element)`. Nothing else in that file changes.

- [ ] **Step 6: Write the layer's canvas**

Create `src/components/DensityCanvas.tsx`:

```tsx
import { useLayoutEffect, useRef } from 'react';
import { densityAlpha, densityLevels, densityOf } from '../terrain/density';
import type { Surface } from '../terrain/types';
import { inkOf } from './NetCanvas';
import { fadeIn, leaveGhost } from './fade';

interface DensityCanvasProps {
  surface: Surface;
  /** Side of the net square in CSS pixels. */
  size: number;
  /** Whether the layer is shown. */
  on: boolean;
}

/**
 * The density layer: bands and lines over the cloud, where its pixels crowd
 * together. Drawn when the layer is on and the DEM or the size has changed;
 * turning it on and off is a fade of the whole layer, in CSS.
 */
export function DensityCanvas({ surface, size, on }: DensityCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ghostRef = useRef<HTMLCanvasElement>(null);
  const drawn = useRef<{ surface: Surface; pixels: number } | null>(null);
  const wasOn = useRef(false);

  // A layout effect, so a layer that is turned on never shows, even for a
  // frame, what it last drew for another DEM or another size.
  useLayoutEffect(() => {
    const stayedOn = wasOn.current && on;
    wasOn.current = on;
    const canvas = canvasRef.current;
    const ghost = ghostRef.current;
    if (!on || !canvas || !ghost || size <= 0) return;

    // The cloud's own rule: at least two image pixels per CSS pixel.
    const pixels = Math.round(size * Math.max(2, window.devicePixelRatio || 1));
    const previous = drawn.current;
    if (previous && previous.surface === surface && previous.pixels === pixels) return;

    // When the DEM changes under a layer that is on, it changes as the cloud does.
    const crossfade = stayedOn && previous !== null && previous.surface !== surface;
    if (crossfade) leaveGhost(canvas, ghost, '--t-base');

    canvas.width = pixels;
    canvas.height = pixels;
    const context = canvas.getContext('2d');
    if (!context) return;

    const field = densityOf(surface);
    const alpha = densityAlpha(field, densityLevels(field.peak), pixels);
    const image = context.createImageData(pixels, pixels);
    const [red, green, blue] = inkOf(canvas);
    for (let cell = 0, o = 0; cell < alpha.length; cell++, o += 4) {
      image.data[o] = red;
      image.data[o + 1] = green;
      image.data[o + 2] = blue;
      image.data[o + 3] = alpha[cell];
    }
    context.putImageData(image, 0, 0);

    if (crossfade) fadeIn(canvas, '--t-base');
    drawn.current = { surface, pixels };
  }, [surface, size, on]);

  return (
    <div className="net__density" data-on={on} data-testid="density-layer" aria-hidden="true">
      <canvas ref={ghostRef} />
      <canvas ref={canvasRef} data-testid="net-density" />
    </div>
  );
}
```

- [ ] **Step 7: Write the button**

Create `src/components/DensityToggle.tsx`:

```tsx
import * as Tooltip from '@radix-ui/react-tooltip';
import { Layers } from 'lucide-react';

const LABEL = 'Density';

interface DensityToggleProps {
  /** Whether the density layer is on. */
  on: boolean;
  onChange: (on: boolean) => void;
}

/**
 * Turns the density layer on and off. Unlike the `i` in the opposite corner
 * it is a control, so it is a stop for Tab and says whether it is pressed.
 */
export function DensityToggle({ on, onChange }: DensityToggleProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          className="net__toggle"
          aria-label={LABEL}
          aria-pressed={on}
          data-testid="density-toggle"
          onClick={() => onChange(!on)}
        >
          <Layers size={16} aria-hidden="true" />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="tooltip" side="bottom" align="end" sideOffset={6} collisionPadding={8}>
          {LABEL}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
```

- [ ] **Step 8: Place them in `src/components/NetCard.tsx`**

```diff
--- a/src/components/NetCard.tsx
+++ b/src/components/NetCard.tsx
@@ -1,7 +1,10 @@
 import type { MotionValue } from 'motion/react';
 import type { CSSProperties } from 'react';
 import type { Layout } from '../layout';
+import { densityKey, densityOf, densitySentence, knownDensity } from '../terrain/density';
 import type { Dem, Surface } from '../terrain/types';
+import { DensityCanvas } from './DensityCanvas';
+import { DensityToggle } from './DensityToggle';
 import { InfoTip } from './InfoTip';
 import { NetCanvas } from './NetCanvas';
 import { NetFrame, NetLabels } from './NetFrame';
@@ -23,6 +26,9 @@ interface NetCardProps {
   selection: MotionValue<number>;
   sunAzimuth: MotionValue<number>;
   sunAltitude: MotionValue<number>;
+  /** Whether the density layer is on. */
+  density: boolean;
+  onDensityChange: (on: boolean) => void;
 }
 
 export function NetCard({
@@ -33,7 +39,13 @@ export function NetCard({
   selection,
   sunAzimuth,
   sunAltitude,
+  density,
+  onDensityChange,
 }: NetCardProps) {
+  // The layer is counted the first time it is shown. Once counted it is kept,
+  // so the key still has its words while the layer fades out.
+  const field = surface ? (density ? densityOf(surface) : knownDensity(surface)) : null;
+  const help = density && field ? `${NET_HELP} ${densitySentence(field)}` : NET_HELP;
   const style = {
     width: layout.netCardWidth,
     height: layout.netCardHeight,
@@ -55,19 +67,29 @@ export function NetCard({
       >
         <NetFrame size={layout.netSize} />
         {surface ? (
-          <NetCanvas surface={surface} size={layout.netSize} />
+          <>
+            <NetCanvas surface={surface} size={layout.netSize} />
+            <DensityCanvas surface={surface} size={layout.netSize} on={density} />
+          </>
         ) : loading ? (
           <div className="skeleton net__skeleton" aria-busy="true" />
         ) : null}
         <NetLabels size={layout.netSize} />
         {/* Below, so it never covers the app name on a phone. */}
-        <InfoTip className="net__info" label="How to read the net" text={NET_HELP} side="bottom" />
+        <InfoTip className="net__info" label="How to read the net" text={help} side="bottom" />
+        {/* Before the sun, so Tab reaches it first; over the sun, so it can always be pressed. */}
+        {surface && <DensityToggle on={density} onChange={onDensityChange} />}
+        {field && (
+          <p className="net__key" data-testid="density-key" data-on={density} aria-hidden={!density}>
+            {densityKey(field)}
+          </p>
+        )}
         {surface && <SunHandle size={layout.netSize} azimuth={sunAzimuth} altitude={sunAltitude} />}
         {surface && <NetMarker surface={surface} size={layout.netSize} selection={selection} />}
       </div>
       <Readout dem={dem} surface={surface} selection={selection} />
       <p id="net-help" className="visually-hidden">
-        {NET_HELP}
+        {help}
       </p>
     </section>
   );
```

- [ ] **Step 9: Pass the state from `src/App.tsx`**

In the `<NetCard … />` element, after `sunAltitude={sunAltitude}` add:

```tsx
      density={density}
      onDensityChange={setDensity}
```

- [ ] **Step 10: Style the layer, the button and the key**

In `src/app.css`, directly before the line `/* ---------- Readout ---------- */`, add:

```css
/* ---------- Density layer ---------- */

/* Over the cloud; under the letters, the sun and the point. DensityCanvas
   reads this color and draws in it. Turning the layer on and off is this
   fade, which reduced motion makes instant by way of the token. */
.net__density {
  position: absolute;
  inset: 0;
  color: var(--viz-1);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--t-base) var(--ease-out);
}

.net__density[data-on='true'] {
  opacity: 1;
}

.net__density canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* The corner opposite the `i`. At 28px it is clear of the rim on the
   smallest net. It sits over the sun, whose 44px target reaches this corner
   when the sun is low in the northeast on a small net. */
.net .net__toggle {
  position: absolute;
  right: 0;
  top: 0;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: var(--r-pill);
  background: transparent;
  color: var(--ink-500);
  cursor: pointer;
  transition:
    background var(--t-fast) var(--ease-out),
    color var(--t-fast) var(--ease-out),
    box-shadow var(--t-fast) var(--ease-out);
}

/* Only where something can hover, so a tap leaves no shade behind. */
@media (hover: hover) {
  .net .net__toggle:hover {
    background: var(--sunken);
    color: var(--ink-700);
  }
}

.net .net__toggle[aria-pressed='true'] {
  background: var(--sunken);
  color: var(--viz-1);
}

.net .net__toggle:focus-visible {
  box-shadow: var(--ring);
}

@media (pointer: coarse) {
  /* A 44px touch target around the 28px button. */
  .net .net__toggle::after {
    content: '';
    position: absolute;
    inset: -8px;
  }
}

/* What the layer's lines stand for, in the corner below the rim. Its paper
   ground keeps it readable where a small net's rim comes close. */
.net .net__key {
  position: absolute;
  left: 0;
  bottom: 0;
  margin: 0;
  padding-right: var(--sp-1);
  background: var(--paper);
  font-size: var(--fs-xs);
  line-height: 16px;
  color: var(--viz-1);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--t-base) var(--ease-out);
}

.net .net__key[data-on='true'] {
  opacity: 1;
}

```

- [ ] **Step 11: Run everything**

Run: `npx tsc --noEmit && npm test`
Expected: PASS, the contrast tests from Step 1 included.

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test e2e/density.spec.ts e2e/polish.spec.ts e2e/selection.spec.ts e2e/sun.spec.ts e2e/screen.spec.ts e2e/restore.spec.ts`
Expected: PASS in both projects.

If "the button and the key sit in the net's corners" fails on the key's distance from the rim, do not move or shorten the key. Report the net's width and the key's box: the wording is fixed by the spec, and the choice is the owner's.

- [ ] **Step 12: Look at it**

Run `npm run dev`, open http://localhost:5173/#dem=gore&density=1 and compare with the mockup the design was chosen from: `.superpowers/brainstorm/1554748-1791080728/content/density-over.html`, card "J · Light". The three peaks (a long ridge in the southwest, one peak in the northeast, a smaller one in the northwest) must be distinct shapes with lines, and the dots must show through.

- [ ] **Step 13: Commit**

```bash
git add src/components/DensityCanvas.tsx src/components/DensityToggle.tsx src/components/NetCanvas.tsx src/components/NetCard.tsx src/App.tsx src/app.css src/styles/contrast.test.ts e2e/density.spec.ts e2e/polish.spec.ts
git commit -m "Show where the cloud is densest, from a button on the net" -m "The cloud saturates where points overlap, so its dense part looks uniform. The layer is a see-through sheet of blue bands over the dots, with a line at each level and a one-line key, so the peaks can be told apart and the dots still show."
```

---

### Task 4: The layer in the shared picture

**Files:**
- Modify: `src/share/text.ts`
- Modify: `src/share/text.test.ts`
- Modify: `src/share/drawCard.ts`
- Modify: `src/App.tsx`
- Test: `e2e/share.spec.ts`

**Interfaces:**
- Consumes: from Task 1, `DensityField`, `densityOf`, `densityLevels`, `densityAlpha`, `densityCaption`. From Task 2, `density` in `App`.
- Produces:
  - `captionLines` input gains optional `density?: string | null`.
  - `CardPalette` gains `density: string`; `CardInput` gains `density: DensityField | null`; `PictureInput` gains `density: boolean`.

- [ ] **Step 1: Write the failing unit tests**

In `src/share/text.test.ts`, inside `describe('captionLines', …)`, add:

```ts
  it('ends with the density layer’s line when it is given one', () => {
    const density = 'Density: lines from 2× to 6× an even spread';
    const lines = captionLines({ place: PLACE, dem: DEM, readout: WEST, sun: DEFAULT_SUN, site: SITE, density });
    expect(lines).toHaveLength(4);
    expect(lines[2].text).toBe('Sun 315° NW · 45° high · lpeezydos-arch.github.io/Pixel-Net');
    expect(lines[3]).toEqual({ text: density, size: 20, height: 28, weight: 400, ink: 'ink-500' });
  });

  it('has no density line when the layer is off or empty', () => {
    for (const density of [undefined, null, '']) {
      const lines = captionLines({ place: PLACE, dem: DEM, readout: EMPTY_READOUT, sun: DEFAULT_SUN, site: SITE, density });
      expect(lines.map((line) => line.height)).toEqual([28, 28]);
    }
  });
```

Run: `npx vitest run src/share/text.test.ts`
Expected: the first new test FAILS (three lines, not four), and `npx tsc --noEmit` reports that `density` is not in the input's type.

- [ ] **Step 2: Write the failing browser tests**

In `e2e/share.spec.ts`, add `openLink` to the import from `./helpers`. After the helper `inkRows`, add:

```ts
/** How many pixels in a box of the shared picture are bluer than they are red: the density layer. */
const blueIn = (page: Page, box: Box) =>
  page.evaluate((b) => {
    const canvas = (window as unknown as { __picture: HTMLCanvasElement }).__picture;
    const data = canvas.getContext('2d')!.getImageData(b.x, b.y, b.width, b.height).data;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i + 2] - data[i] > 20) count++;
    return count;
  }, box);
```

and at the end of the file:

```ts
test('with the density layer on, the picture shows it and says what its lines are', async ({ page }, testInfo) => {
  await withFileShareSheet(page);
  await openLink(page, 'dem=gore&density=1');
  await share(page).click();
  await expect.poll(async () => (await shared(page)).length).toBe(1);

  // Nothing is selected, so the caption is the facts, the sun and the layer's line.
  const layout = cardLayout({ mode: modeOf(testInfo), aspect: GORE_SHAPE, lines: [28, 28, 28] });
  const [sent] = (await shared(page)) as Array<{ url: string; picture: { width: number; height: number } }>;
  expect(sent.url).toBe(`${origin(page)}/#dem=gore&density=1`);
  expect(sent.picture.width).toBe(layout.width);
  expect(sent.picture.height).toBe(layout.height);

  expect(await blueIn(page, layout.net)).toBeGreaterThan(1000);
  expect(await blueIn(page, layout.terrain)).toBe(0);
  const line = layout.caption.lines[2];
  expect(
    await inkIn(page, { x: layout.caption.x, y: line.y, width: layout.caption.width, height: line.height }),
  ).toBeGreaterThan(0);

  const png = await page.evaluate(() =>
    (window as unknown as { __picture: HTMLCanvasElement }).__picture.toDataURL('image/png').split(',')[1],
  );
  const path = testInfo.outputPath('share-picture-density.png');
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.from(png, 'base64'));
});

test('with the density layer off, nothing in the picture is blue', async ({ page }, testInfo) => {
  await withFileShareSheet(page);
  await openApp(page);
  await share(page).click();
  await expect.poll(async () => (await shared(page)).length).toBe(1);
  const layout = cardLayout({ mode: modeOf(testInfo), aspect: GORE_SHAPE, lines: [28, 28] });
  const [sent] = (await shared(page)) as Array<{ picture: { width: number; height: number } }>;
  expect(sent.picture.height).toBe(layout.height);
  expect(await blueIn(page, layout.net)).toBe(0);
});
```

- [ ] **Step 3: Give the caption its line, in `src/share/text.ts`**

```diff
--- a/src/share/text.ts
+++ b/src/share/text.ts
@@ -29,14 +29,17 @@ interface CaptionInput {
   sun: Sun;
   /** The page's host and path, from `siteName`. */
   site: string;
+  /** The density layer's line, from `densityCaption`; nothing when the layer is off or empty. */
+  density?: string | null;
 }
 
 /**
  * The picture's caption: the readout if a pixel is selected, the DEM's
  * facts, then the sun and where the picture came from, so a picture pasted
- * into a report still says what it is.
+ * into a report still says what it is. With the density layer on, a last
+ * line says what its lines mean.
  */
-export function captionLines({ place, dem, readout, sun, site }: CaptionInput): CaptionLine[] {
+export function captionLines({ place, dem, readout, sun, site, density }: CaptionInput): CaptionLine[] {
   const lines: CaptionLine[] = [];
   if (readout === NO_DATA) {
     lines.push({ ...READOUT_LINE, text: 'No data at this pixel' });
@@ -49,6 +52,7 @@ export function captionLines({ place, dem, readout, sun, site }: CaptionInput):
   lines.push({ ...SMALL_LINE, text: demFacts(place, dem) });
   const light = formatSun(sun);
   lines.push({ ...SMALL_LINE, text: `${light === 'Overhead' ? 'Sun overhead' : `Sun ${light}`} · ${site}` });
+  if (density) lines.push({ ...SMALL_LINE, text: density });
   return lines;
 }
 
```

Run: `npx vitest run src/share/text.test.ts`
Expected: PASS.

- [ ] **Step 4: Draw the layer, in `src/share/drawCard.ts`**

The cloud's "alpha, then inked" steps become a helper, `inked`, which the layer uses too.

```diff
--- a/src/share/drawCard.ts
+++ b/src/share/drawCard.ts
@@ -1,4 +1,5 @@
 import { NET_RIM, cloudAlpha } from '../terrain/cloud';
+import { type DensityField, densityAlpha, densityCaption, densityLevels, densityOf } from '../terrain/density';
 import { readoutFor } from '../terrain/format';
 import { shade } from '../terrain/hillshade';
 import { RING_30, RING_60, sunToNet, toNet } from '../terrain/net';
@@ -23,6 +24,8 @@ export interface CardPalette {
   line: string;
   lineStrong: string;
   accent: string;
+  /** The density layer's color. */
+  density: string;
 }
 
 export interface CardInput {
@@ -31,6 +34,8 @@ export interface CardInput {
   sun: Sun;
   /** Index of the selected pixel, or −1. */
   selection: number;
+  /** The density layer's field, or null when the layer is off. */
+  density: DensityField | null;
   caption: CaptionLine[];
   palette: CardPalette;
   /** The page's font stack, as CSS writes it. */
@@ -50,6 +55,7 @@ export function readPalette(): CardPalette {
     line: token('--line'),
     lineStrong: token('--line-strong'),
     accent: token('--accent'),
+    density: token('--viz-1'),
   };
 }
 
@@ -79,6 +85,18 @@ function scratch(width: number, height: number): [HTMLCanvasElement, Context] {
   return [canvas, context];
 }
 
+/** A square image in one color, as opaque in each cell as `alpha` says. */
+function inked(alpha: Uint8ClampedArray, size: number, color: string): HTMLCanvasElement {
+  const [canvas, context] = scratch(size, size);
+  const image = context.createImageData(size, size);
+  for (let cell = 0, o = 3; cell < alpha.length; cell++, o += 4) image.data[o] = alpha[cell];
+  context.putImageData(image, 0, 0);
+  context.globalCompositeOperation = 'source-in';
+  context.fillStyle = color;
+  context.fillRect(0, 0, size, size);
+  return canvas;
+}
+
 function drawTerrain(context: Context, box: Box, { surface, sun, selection, palette }: CardInput): void {
   // One image pixel per DEM pixel, as on screen, then scaled up smoothly.
   const [source, sourceContext] = scratch(surface.width, surface.height);
@@ -106,7 +124,11 @@ function drawTerrain(context: Context, box: Box, { surface, sun, selection, pale
   band(context, x, y, 6.5 * K, 3 * K, palette.accent);
 }
 
-function drawNet(context: Context, box: Box, { surface, sun, selection, palette, fontFamily }: CardInput): void {
+function drawNet(
+  context: Context,
+  box: Box,
+  { surface, sun, selection, density, palette, fontFamily }: CardInput,
+): void {
   const size = box.width;
   const cx = box.x + size / 2;
   const cy = box.y + size / 2;
@@ -127,15 +149,13 @@ function drawNet(context: Context, box: Box, { surface, sun, selection, palette,
   context.stroke();
 
   // The cloud: its darkness as alpha, then inked.
-  const alpha = cloudAlpha(surface, size);
-  const [cloud, cloudContext] = scratch(size, size);
-  const image = cloudContext.createImageData(size, size);
-  for (let cell = 0, o = 3; cell < alpha.length; cell++, o += 4) image.data[o] = alpha[cell];
-  cloudContext.putImageData(image, 0, 0);
-  cloudContext.globalCompositeOperation = 'source-in';
-  cloudContext.fillStyle = palette.ink900;
-  cloudContext.fillRect(0, 0, size, size);
-  context.drawImage(cloud, box.x, box.y);
+  context.drawImage(inked(cloudAlpha(surface, size), size, palette.ink900), box.x, box.y);
+
+  // The density layer over it, as on screen: the dots show through.
+  if (density) {
+    const layer = densityAlpha(density, densityLevels(density.peak), size);
+    context.drawImage(inked(layer, size, palette.density), box.x, box.y);
+  }
 
   // Compass letters and ring labels, over the cloud. A paper edge keeps a
   // letter readable there, as on screen.
@@ -250,17 +270,31 @@ export interface PictureInput {
   sun: Sun;
   /** Index of the selected pixel, or −1. */
   selection: number;
+  /** Whether the density layer is on. */
+  density: boolean;
 }
 
 /** The picture of a view as a PNG file, or null if this browser cannot make one. */
-export function pictureFile({ mode, appName, demId, place, dem, surface, sun, selection }: PictureInput): File | null {
+export function pictureFile({
+  mode,
+  appName,
+  demId,
+  place,
+  dem,
+  surface,
+  sun,
+  selection,
+  density,
+}: PictureInput): File | null {
   try {
+    const field = density ? densityOf(surface) : null;
     const caption = captionLines({
       place,
       dem,
       readout: readoutFor(dem, surface, selection),
       sun,
       site: siteName(window.location.host, window.location.pathname),
+      density: field ? densityCaption(field) : null,
     });
     const layout = cardLayout({ mode, aspect: dem.width / dem.height, lines: caption.map((line) => line.height) });
     const canvas = drawCard({
@@ -268,6 +302,7 @@ export function pictureFile({ mode, appName, demId, place, dem, surface, sun, se
       surface,
       sun,
       selection,
+      density: field,
       caption,
       palette: readPalette(),
       fontFamily: getComputedStyle(document.body).fontFamily,
```

- [ ] **Step 5: Tell the picture whether the layer is on, in `src/App.tsx`**

In `handleShare`, in the object passed to `pictureFile`, after `selection: index,` add:

```ts
          density,
```

and add `density` to the callback's dependency list, so that it reads:

```ts
  }, [state, active, selection, sunAzimuth, sunAltitude, density, viewText, layout.mode]);
```

- [ ] **Step 6: Run everything**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test e2e/share.spec.ts`
Expected: PASS in both projects.

Open `test-results/**/share-picture-density.png` from both projects and look at them: blue bands with lines over the dots, the letters and the sun on top, and a last caption line reading "Density: lines from 2× to 6× an even spread".

- [ ] **Step 7: Commit**

```bash
git add src/share/text.ts src/share/text.test.ts src/share/drawCard.ts src/App.tsx e2e/share.spec.ts
git commit -m "Draw the density layer in the shared picture" -m "A link with the layer on opens with it on, so the picture sent with it shows the same. The caption gains a line saying what the lines stand for, because a picture pasted into a report has no tooltip."
```

---

### Task 5: The help sheet, the news and the records

**Files:**
- Modify: `src/help/howTo.ts`, `src/help/howTo.test.ts`
- Modify: `src/help/news.json`, `CHANGELOG.md` (written by the script)
- Modify: `e2e/help.spec.ts`
- Modify: `PRODUCT.md`, `README.md`, `docs/polish-pass.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing that other tasks use.

- [ ] **Step 1: Write the failing test for the how-to line**

In `src/help/howTo.test.ts`, in both expected lists, insert this line between `'The share button sends a link to this view.',` and `'The i on the net explains how to read it.',`:

```ts
      'The layers button on the net shows where pixels crowd together.',
```

Run: `npx vitest run src/help/howTo.test.ts`
Expected: FAIL, both tests, with six lines where seven are expected.

- [ ] **Step 2: Add the line**

In `src/help/howTo.ts`, after the line `const SHARE = …;` add:

```ts
const DENSITY = 'The layers button on the net shows where pixels crowd together.';
```

and in both lists put `DENSITY,` between `SHARE,` and `NET,`.

Run: `npx vitest run src/help/howTo.test.ts`
Expected: PASS.

- [ ] **Step 3: Add the news entry and write the changelog**

Run `date -I` and use its output as the date. In `src/help/news.json`, add after entry 4 (put a comma after entry 4's closing brace):

```json
  {
    "id": 5,
    "date": "<the output of date -I>",
    "text": "A button on the net shows where pixels crowd together."
  }
```

Run: `npm run changelog && npm test`
Expected: `CHANGELOG.md` gains the line under its date; all unit tests PASS, `changelog.test.ts` and `news.test.ts` included.

- [ ] **Step 4: Update the help sheet's browser tests**

In `e2e/help.spec.ts`, change both `await expect(howTo(page)).toHaveCount(6);` to `toHaveCount(7)`.

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test e2e/help.spec.ts`
Expected: PASS in both projects.

The sheet cannot scroll, and it now holds one more line. If any test named "the sheet fits …" or "turning the phone …" fails, do not let the sheet scroll, do not shrink its type and do not drop a line. Stop and report which size failed and by how many pixels: a shorter sentence is the owner's call.

- [ ] **Step 5: Update `PRODUCT.md`**

Make these five changes.

In "Product Purpose", after the sentence that ends "re-lights the terrain.", add:

```
A button on the net lays a see-through density layer over the cloud, which
shows where its pixels crowd together.
```

In "Capabilities and Constraints", after the bullet that begins "- Sun:", add:

```
- Density layer: a button in the net's top-right corner turns on a translucent
  blue layer over the cloud. It is the Schmidt count: the share of plottable
  pixels in a circle covering 1% of the net, in times an even spread. Bands
  with a line at each level; levels are whole multiples of the smallest of 1,
  2, 5, 10 and 20 that gives six or fewer, starting at 2× when the step is 1.
  A one-line key on the net names the first level and the last, and the net's
  tooltip says how it is counted. Off by default; kept across a DEM switch
  (`docs/superpowers/specs/2026-10-03-density-layer-design.md`).
```

In the bullet that begins "- View:", change "the DEM, the selected pixel and the sun are written into the address (`#dem=gore&px=150,210&sun=120,35`, with an unselected pixel and a default sun left out)" to "the DEM, the selected pixel, the sun and whether the density layer is on are written into the address (`#dem=gore&px=150,210&sun=120,35&density=1`, with an unselected pixel, a default sun and a layer that is off left out)".

In the paragraph that begins "Out of scope by decision", change "density net, aspect rose, patch or area selection;" to "aspect rose, patch or area selection;", and after "Shareable links left this list on 2026-10-03." add: "The density net left it the same day, as the density layer; still out of scope for it: a legend with a color bar, the density at the selected pixel, a choice of counting circle, levels or color, and Kamb contouring."

In "Terminology", after "the point (the highlighted pixel);" add "the density layer (bands over the cloud where pixels crowd together); times an even spread (its unit); the key (the line that names its levels);".

In "Evidence on Hand", change "`GORE_stereonet_density.png`, reference figures for the hillshade and for two views that are out of scope." to "`GORE_stereonet_density.png`: reference figures for the hillshade, for a view that is out of scope, and a Kamb-contoured figure of the same data. The Kamb figure is not the reference for the density layer, which is counted another way."

- [ ] **Step 6: Update `README.md`**

In "Links, sharing and the saved view", change the example to `#dem=gore&px=150,210&sun=120,35&density=1`, change "and the sun's azimuth and height." to "the sun's azimuth and height, and `density=1` when the density layer is on.", and change "The pixel is left out when nothing is selected, and the sun when it is at its default." to "The pixel is left out when nothing is selected, the sun when it is at its default, and the layer when it is off."

Directly before the heading "## Tell users what changed", add:

```markdown
## The density layer

The button in the net's top-right corner turns on a see-through blue layer
that shows where the cloud is densest. The cloud itself darkens where points
overlap, but it saturates quickly, so its dense part looks uniform.

It is the classic Schmidt count. For each position on the net, the app takes
the share of plottable pixels inside a circle covering 1% of the net, and
divides by 1%. The unit is times an even spread: at 1× a place holds as many
points as it would if the cloud were spread evenly over the whole net. The
net is equal-area, so one circle covers the same share of directions
everywhere on it.

Bands are drawn from 2× up, with a line at each level. The Gore Range peaks
at about 6.5× on its southwest slopes, so its lines are at 2×, 3×, 4×, 5× and
6×. A gentler landscape crowds toward the center and peaks far higher; its
levels rise by 2, 5, 10 or 20, whichever is the smallest step that gives six
levels or fewer. The key in the net's bottom-left corner names the first
level and the last.

Near the rim part of the circle lies outside the net, and the density there
reads low. It is not corrected: only ground steeper than about 80° plots
there.

The code is `src/terrain/density.ts`.

```

- [ ] **Step 7: Update `docs/polish-pass.md`**

In the table:

- Row 1, append to its evidence: " The density button is named by its tooltip (\"the button is named by its tooltip\"), and the net's own tooltip says what the layer shows while it is on (\"the net's explanation says what the layer shows while it is on\")."
- Row 5, change its status from "Not applicable" to "Met" and its evidence from "No legend" to: "The density layer has a one-line key on the net that names its first and last levels, and its method is in the net's tooltip. A color bar was decided against (`docs/superpowers/specs/2026-10-03-density-layer-design.md`). Tests: \"the density button turns the layer on and off\", \"the button and the key sit in the net's corners, clear of the rim\"."
- Row 7, append to its evidence: " The density button is 28px with a 44px target, covered by the same test, and shows that it is pressed."
- Row 20, append to its evidence: " The density layer, its key and its pressed button are `--viz-1`, a data color, so that rust stays the selection's alone."

Under "Checked by hand on a phone", add:

```markdown
- [ ] With the density layer on, the three peaks of the Gore Range (a ridge in
      the southwest, a peak in the northeast, a smaller one in the northwest)
      can be told apart at arm's length.
- [ ] With the layer on, the rust point is as easy to follow during a drag as
      with it off.
- [ ] The density button is easy to press with a thumb, beside the readout,
      and a press never moves the sun.
- [ ] The key is readable and does not touch the rim.
```

- [ ] **Step 8: Run the whole suite**

Run: `npm run build && npm test`
Expected: PASS.

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test`
Expected: PASS, every file, both projects.

- [ ] **Step 9: Commit**

```bash
git add src/help/howTo.ts src/help/howTo.test.ts src/help/news.json CHANGELOG.md e2e/help.spec.ts PRODUCT.md README.md docs/polish-pass.md
git commit -m "Tell users about the density layer, and record the decision" -m "The help sheet gains a line and the news an entry, so a returning user learns of the button from the dot. The product notes take the density net off the list of things decided against, and say what was decided in its place."
```
