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

/**
 * The key on the net: the first level and the last. Empty when nothing was
 * counted. On a small net the full words would cross the rim, so `short`
 * drops "even" and joins the levels with an en dash.
 */
export function densityKey(field: DensityField, short = false): string {
  if (field.count === 0) return '';
  const levels = densityLevels(field.peak);
  const even = short ? '' : ' even';
  if (levels.length === 0) return `Below 2×${even}`;
  if (levels.length === 1) return `${levels[0]}×${even}`;
  const last = levels[levels.length - 1];
  return short ? `${levels[0]}×–${last}×` : `${levels[0]}× to ${last}×${even}`;
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
