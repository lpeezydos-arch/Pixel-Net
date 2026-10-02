import { toNet } from './net';
import type { Surface } from './types';

/** Radius of the net's rim, as a fraction of half the square it is drawn in. */
export const NET_RIM = 0.9375;

/** Share of the background still showing through after one point is drawn. */
const SHOW_THROUGH = 0.7;

/** Image size at which one point has exactly that effect. */
export const CLOUD_REFERENCE = 640;

/**
 * Alpha (0 to 255) for each cell of a `size` × `size` image of the point cloud.
 * At the reference size a cell holding `k` points gets alpha 1 − 0.7^k, so
 * overlapping points darken. At other sizes each point counts for more or
 * less, in proportion to the area of a cell, so the cloud is equally dark on
 * every screen.
 */
export function cloudAlpha(surface: Surface, size: number): Uint8ClampedArray {
  if (size <= 0) return new Uint8ClampedArray(0);
  const counts = new Uint16Array(size * size);
  const center = size / 2;
  const rim = center * NET_RIM;

  for (let i = 0; i < surface.slope.length; i++) {
    if (surface.nodata[i] || surface.flat[i]) continue;
    const p = toNet(surface.slope[i], surface.aspect[i]);
    const x = Math.floor(center + p.x * rim);
    const y = Math.floor(center - p.y * rim);
    if (x < 0 || y < 0 || x >= size || y >= size) continue;
    const cell = y * size + x;
    if (counts[cell] < 65535) counts[cell]++;
  }

  const weight = (size / CLOUD_REFERENCE) ** 2;
  const alpha = new Uint8ClampedArray(size * size);
  for (let cell = 0; cell < counts.length; cell++) {
    if (counts[cell]) alpha[cell] = 255 * (1 - SHOW_THROUGH ** (counts[cell] * weight));
  }
  return alpha;
}
