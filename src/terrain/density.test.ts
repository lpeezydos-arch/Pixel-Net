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

  it('explain the layer in the tooltip, with the DEM\'s own levels', () => {
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
