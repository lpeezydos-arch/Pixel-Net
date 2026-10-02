import type { Dem } from './types';

/** Builds a DEM from a height function of (east meters, north meters). */
export function demFrom(
  width: number,
  height: number,
  cellSize: number,
  z: (east: number, north: number) => number,
): Dem {
  const elevation = new Float32Array(width * height);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      elevation[row * width + col] = z(col * cellSize, (height - 1 - row) * cellSize);
    }
  }
  return { width, height, cellSize, elevation, nodata: new Uint8Array(width * height) };
}

/** A plane with the given slope whose downhill direction is `aspect`. */
export function tiltedPlane(slope: number, aspect: number, size = 7, cellSize = 5): Dem {
  const rad = Math.PI / 180;
  const grade = Math.tan(slope * rad);
  const east = Math.sin(aspect * rad);
  const north = Math.cos(aspect * rad);
  return demFrom(size, size, cellSize, (x, y) => 1000 - grade * (x * east + y * north));
}
