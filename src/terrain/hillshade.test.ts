import { describe, expect, it } from 'vitest';
import { shade } from './hillshade';
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

  it('makes a slope the sun only grazes a quarter gray', () => {
    // A 45° slope facing west, sun in the east 45° high: the light runs along it.
    expect(grayAt(tiltedPlane(45, 270), 90, 45, CENTER)).toEqual([64, 64, 64, 255]);
  });

  it('keeps the shape of ground facing away from the sun', () => {
    // Slopes facing west under a sun in the east 45° high. Both get no direct
    // light; the steeper one turns further from the sun and prints darker.
    const [steep] = grayAt(tiltedPlane(60, 270), 90, 45, CENTER);
    const [steeper] = grayAt(tiltedPlane(75, 270), 90, 45, CENTER);
    expect(steep).toBe(35);
    expect(steeper).toBe(16);
  });

  it('lights a north-facing slope from the north and darkens it from the south', () => {
    expect(grayAt(tiltedPlane(45, 0), 0, 45, CENTER)).toEqual([255, 255, 255, 255]);
    expect(grayAt(tiltedPlane(45, 0), 180, 45, CENTER)).toEqual([64, 64, 64, 255]);
  });

  it('lights level ground by the height of the sun alone', () => {
    const level = demFrom(5, 5, 5, () => 100);
    const [low] = grayAt(level, 0, 30, 12);
    const [high] = grayAt(level, 200, 90, 12);
    expect(low).toBe(143);
    expect(high).toBe(255);
  });

  it('leaves no-data pixels transparent', () => {
    const dem = tiltedPlane(45, 90);
    dem.nodata[CENTER] = 1;
    expect(grayAt(dem, 90, 45, CENTER)[3]).toBe(0);
  });
});
