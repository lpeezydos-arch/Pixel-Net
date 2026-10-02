import { describe, expect, it } from 'vitest';
import { SHADE_FLOOR, shade } from './hillshade';
import { computeSurface } from './surface';
import { demFrom, tiltedPlane } from './testing';

const CENTER = 3 * 7 + 3;

function grayAt(dem: ReturnType<typeof tiltedPlane>, azimuth: number, altitude: number, index: number) {
  const surface = computeSurface(dem);
  const out = new Uint8ClampedArray(surface.width * surface.height * 4);
  shade(surface, { azimuth, altitude }, out);
  return [out[index * 4], out[index * 4 + 1], out[index * 4 + 2], out[index * 4 + 3]];
}

describe('shade', () => {
  it('makes a slope that faces the sun fully bright', () => {
    // A 45° slope facing east, sun in the east 45° high.
    expect(grayAt(tiltedPlane(45, 90), 90, 45, CENTER)).toEqual([255, 255, 255, 255]);
  });

  it('makes a slope that faces away from the sun as dark as the floor', () => {
    // A 45° slope facing west, sun in the east 45° high.
    expect(grayAt(tiltedPlane(45, 270), 90, 45, CENTER)).toEqual([
      SHADE_FLOOR, SHADE_FLOOR, SHADE_FLOOR, 255,
    ]);
  });

  it('lights level ground by the height of the sun alone', () => {
    const level = demFrom(5, 5, 5, () => 100);
    const [low] = grayAt(level, 0, 30, 12);
    const [high] = grayAt(level, 200, 90, 12);
    expect(low).toBe(Math.round(SHADE_FLOOR + (255 - SHADE_FLOOR) * 0.5));
    expect(high).toBe(255);
  });

  it('leaves no-data pixels transparent', () => {
    const dem = tiltedPlane(45, 90);
    dem.nodata[CENTER] = 1;
    expect(grayAt(dem, 90, 45, CENTER)[3]).toBe(0);
  });
});
