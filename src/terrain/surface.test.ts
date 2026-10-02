import { describe, expect, it } from 'vitest';
import { computeSurface } from './surface';
import { demFrom, tiltedPlane } from './testing';

const CENTER = 3 * 7 + 3; // middle pixel of the 7 × 7 test planes

describe('computeSurface', () => {
  it.each([
    ['north', 0],
    ['east', 90],
    ['south', 180],
    ['west', 270],
  ])('measures a 30° plane facing %s', (_name, aspect) => {
    const surface = computeSurface(tiltedPlane(30, aspect));
    expect(surface.slope[CENTER]).toBeCloseTo(30, 3);
    expect(surface.aspect[CENTER]).toBeCloseTo(aspect, 3);
    expect(surface.flat[CENTER]).toBe(0);
  });

  it('measures a plane facing an arbitrary direction', () => {
    const surface = computeSurface(tiltedPlane(36.3, 264));
    expect(surface.slope[CENTER]).toBeCloseTo(36.3, 2);
    expect(surface.aspect[CENTER]).toBeCloseTo(264, 2);
  });

  it('tilts the normal toward the downhill side', () => {
    const surface = computeSurface(tiltedPlane(30, 90));
    expect(surface.nx[CENTER]).toBeCloseTo(0.5, 4);
    expect(surface.ny[CENTER]).toBeCloseTo(0, 4);
    expect(surface.nz[CENTER]).toBeCloseTo(Math.cos(Math.PI / 6), 4);
  });

  it('flags level ground as flat with no aspect', () => {
    const surface = computeSurface(demFrom(5, 5, 5, () => 250));
    expect(surface.flat[12]).toBe(1);
    expect(surface.slope[12]).toBe(0);
    expect(Number.isNaN(surface.aspect[12])).toBe(true);
    expect(surface.nz[12]).toBe(1);
  });

  it('measures a uniform slope the same at the edges as in the middle', () => {
    const surface = computeSurface(tiltedPlane(30, 135));
    for (let i = 0; i < surface.slope.length; i++) {
      expect(surface.slope[i]).toBeCloseTo(30, 3);
      expect(surface.aspect[i]).toBeCloseTo(135, 3);
    }
  });

  it('flags a no-data pixel without spreading to its neighbors', () => {
    const dem = tiltedPlane(30, 90);
    dem.nodata[CENTER] = 1;
    dem.elevation[CENTER] = -9999;
    const surface = computeSurface(dem);
    expect(surface.nodata[CENTER]).toBe(1);
    expect(surface.nodata[CENTER + 1]).toBe(0);
    expect(Number.isFinite(surface.slope[CENTER + 1])).toBe(true);
    // Its west neighbor is missing, so it is replaced by the pixel's own value
    // and the west-east difference is three quarters of the full one.
    const expected = (Math.atan(0.75 * Math.tan((30 * Math.PI) / 180)) * 180) / Math.PI;
    expect(surface.slope[CENTER + 1]).toBeCloseTo(expected, 2);
  });

  it('handles a one-pixel DEM', () => {
    const surface = computeSurface(demFrom(1, 1, 5, () => 10));
    expect(surface.flat[0]).toBe(1);
  });
});
