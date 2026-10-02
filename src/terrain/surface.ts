import type { Dem, Surface } from './types';

const DEG = 180 / Math.PI;
const FLAT_GRADIENT = 1e-6;

/**
 * Slope, aspect and surface normal for every pixel, by Horn's 3 × 3 method
 * (the one GDAL and ArcGIS use). Neighbors beyond the edge, and no-data
 * neighbors, are filled in so that every pixel with data gets a value.
 */
export function computeSurface(dem: Dem): Surface {
  const { width, height, cellSize, elevation, nodata } = dem;
  const count = width * height;
  const surface: Surface = {
    width,
    height,
    slope: new Float32Array(count),
    aspect: new Float32Array(count).fill(NaN),
    nx: new Float32Array(count),
    ny: new Float32Array(count),
    nz: new Float32Array(count),
    flat: new Uint8Array(count),
    nodata: new Uint8Array(count),
  };

  // Elevation at (row, col). Beyond an edge the surface is continued in a
  // straight line from the two pixels nearest that edge, so a uniform slope
  // measures the same at the edge as in the middle. A neighbor with no data
  // takes the center pixel's value.
  const at = (row: number, col: number, center: number): number => {
    if (col < 0) {
      return width > 1 ? 2 * at(row, 0, center) - at(row, 1, center) : at(row, 0, center);
    }
    if (col >= width) {
      return width > 1
        ? 2 * at(row, width - 1, center) - at(row, width - 2, center)
        : at(row, width - 1, center);
    }
    if (row < 0) {
      return height > 1 ? 2 * at(0, col, center) - at(1, col, center) : at(0, col, center);
    }
    if (row >= height) {
      return height > 1
        ? 2 * at(height - 1, col, center) - at(height - 2, col, center)
        : at(height - 1, col, center);
    }
    const i = row * width + col;
    return nodata[i] ? center : elevation[i];
  };

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const i = row * width + col;
      if (nodata[i]) {
        surface.nodata[i] = 1;
        surface.nz[i] = 1;
        continue;
      }
      const e = elevation[i];
      const a = at(row - 1, col - 1, e);
      const b = at(row - 1, col, e);
      const c = at(row - 1, col + 1, e);
      const d = at(row, col - 1, e);
      const f = at(row, col + 1, e);
      const g = at(row + 1, col - 1, e);
      const h = at(row + 1, col, e);
      const k = at(row + 1, col + 1, e);

      const dzdx = (c + 2 * f + k - (a + 2 * d + g)) / (8 * cellSize); // toward east
      const dzdy = (a + 2 * b + c - (g + 2 * h + k)) / (8 * cellSize); // toward north
      const gradient = Math.hypot(dzdx, dzdy);
      const length = Math.sqrt(dzdx * dzdx + dzdy * dzdy + 1);

      surface.nx[i] = -dzdx / length;
      surface.ny[i] = -dzdy / length;
      surface.nz[i] = 1 / length;

      if (gradient < FLAT_GRADIENT) {
        surface.flat[i] = 1;
      } else {
        surface.slope[i] = Math.atan(gradient) * DEG;
        surface.aspect[i] = (Math.atan2(-dzdx, -dzdy) * DEG + 360) % 360;
      }
    }
  }
  return surface;
}
