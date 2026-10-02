import type { Sun, Surface } from './types';

const RAD = Math.PI / 180;

/** Gray level of a slope that receives no direct light. Keeps shade readable. */
export const SHADE_FLOOR = 40;

/**
 * Writes one RGBA pixel per DEM pixel into `out` (length width × height × 4),
 * so it can be handed straight to an ImageData. There are no cast shadows.
 */
export function shade(surface: Surface, sun: Sun, out: Uint8ClampedArray): void {
  const azimuth = sun.azimuth * RAD;
  const altitude = sun.altitude * RAD;
  const lx = Math.cos(altitude) * Math.sin(azimuth);
  const ly = Math.cos(altitude) * Math.cos(azimuth);
  const lz = Math.sin(altitude);
  const { nx, ny, nz, nodata } = surface;
  const range = 255 - SHADE_FLOOR;

  for (let i = 0, o = 0; i < nx.length; i++, o += 4) {
    if (nodata[i]) {
      out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0;
      continue;
    }
    const facing = nx[i] * lx + ny[i] * ly + nz[i] * lz;
    const gray = SHADE_FLOOR + range * (facing > 0 ? facing : 0);
    out[o] = out[o + 1] = out[o + 2] = gray;
    out[o + 3] = 255;
  }
}
