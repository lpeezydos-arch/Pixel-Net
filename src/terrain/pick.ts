import type { Pixel } from './types';

/** Limits `value` to `low`…`high`. Anything that is not a number becomes `low`. */
const clamp = (value: number, low: number, high: number) =>
  value > low ? (value < high ? value : high) : low;

/**
 * The DEM pixel under a point in a box that shows the whole DEM. A point
 * outside the box picks the nearest edge pixel.
 */
export function pixelAt(
  x: number,
  y: number,
  boxWidth: number,
  boxHeight: number,
  width: number,
  height: number,
): Pixel {
  if (boxWidth <= 0 || boxHeight <= 0) return { col: 0, row: 0 };
  return {
    col: clamp(Math.floor((x / boxWidth) * width), 0, width - 1),
    row: clamp(Math.floor((y / boxHeight) * height), 0, height - 1),
  };
}

const STEPS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/**
 * Where an arrow key moves the selection: one pixel, or ten with `big`. With
 * nothing selected the first press selects the center pixel. Returns null
 * for any key that is not an arrow.
 */
export function stepPixel(
  current: Pixel | null,
  key: string,
  big: boolean,
  width: number,
  height: number,
): Pixel | null {
  const step = STEPS[key];
  if (!step) return null;
  if (!current) return { col: Math.floor(width / 2), row: Math.floor(height / 2) };
  const distance = big ? 10 : 1;
  return {
    col: clamp(current.col + step[0] * distance, 0, width - 1),
    row: clamp(current.row + step[1] * distance, 0, height - 1),
  };
}

export const toIndex = (pixel: Pixel, width: number): number => pixel.row * width + pixel.col;

export const toPixel = (index: number, width: number): Pixel => ({
  col: index % width,
  row: Math.floor(index / width),
});
