import type { Sun, Surface } from './types';

const RAD = Math.PI / 180;

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

  for (let i = 0, o = 0; i < nx.length; i++, o += 4) {
    if (nodata[i]) {
      out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0;
      continue;
    }
    // Half-Lambert: wrap N·L from [-1,1] into [0,1] rather than clamping it, so
    // ground facing away from the sun keeps its shape. Squaring brings the
    // contrast on the lit side back close to what the clamp gave.
    const facing = nx[i] * lx + ny[i] * ly + nz[i] * lz;
    const wrapped = (facing + 1) / 2;
    const gray = 255 * wrapped * wrapped;
    out[o] = out[o + 1] = out[o + 2] = gray;
    out[o + 3] = 255;
  }
}
