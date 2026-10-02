import { describe, expect, it } from 'vitest';
import { CLOUD_REFERENCE, NET_RIM, cloudAlpha } from './cloud';
import { toNet } from './net';
import { computeSurface } from './surface';
import { demFrom, tiltedPlane } from './testing';
import type { Surface } from './types';

const SIZE = CLOUD_REFERENCE;

function cellOf(slope: number, aspect: number): number {
  const p = toNet(slope, aspect);
  const x = Math.floor(SIZE / 2 + p.x * (SIZE / 2) * NET_RIM);
  const y = Math.floor(SIZE / 2 - p.y * (SIZE / 2) * NET_RIM);
  return y * SIZE + x;
}

/** A surface whose pixels all have the same slope and aspect. */
function uniformSurface(pixels: number, slope: number, aspect: number): Surface {
  return {
    width: pixels,
    height: 1,
    slope: new Float32Array(pixels).fill(slope),
    aspect: new Float32Array(pixels).fill(aspect),
    nx: new Float32Array(pixels),
    ny: new Float32Array(pixels),
    nz: new Float32Array(pixels).fill(1),
    flat: new Uint8Array(pixels),
    nodata: new Uint8Array(pixels),
  };
}

describe('cloudAlpha', () => {
  it('returns one alpha value per cell', () => {
    expect(cloudAlpha(computeSurface(tiltedPlane(30, 90)), SIZE)).toHaveLength(SIZE * SIZE);
  });

  it('draws a slope where toNet says it belongs', () => {
    const alpha = cloudAlpha(computeSurface(tiltedPlane(30, 90, 9)), SIZE);
    expect(alpha[cellOf(30, 90)]).toBeGreaterThan(0);
    expect(alpha[cellOf(30, 270)]).toBe(0);
  });

  it('darkens a cell as more pixels land on it', () => {
    const cell = cellOf(30, 90);
    const one = cloudAlpha(uniformSurface(1, 30, 90), SIZE)[cell];
    const two = cloudAlpha(uniformSurface(2, 30, 90), SIZE)[cell];
    const many = cloudAlpha(uniformSurface(40, 30, 90), SIZE)[cell];
    expect(one).toBeCloseTo(255 * 0.3, -1);
    expect(two).toBeCloseTo(255 * 0.51, -1);
    expect(many).toBe(255);
  });

  it('counts each point for less on a smaller image', () => {
    const half = CLOUD_REFERENCE / 2;
    const p = toNet(30, 90);
    const cell = Math.floor(half / 2 - p.y * (half / 2) * NET_RIM) * half + Math.floor(half / 2 + p.x * (half / 2) * NET_RIM);
    const alpha = cloudAlpha(uniformSurface(4, 30, 90), half)[cell];
    // Four points on a cell four times the area: the same as one point at full size.
    expect(alpha).toBeCloseTo(255 * 0.3, -1);
  });

  it('leaves flat and no-data pixels out', () => {
    const level = cloudAlpha(computeSurface(demFrom(6, 6, 5, () => 10)), SIZE);
    expect(level.every((value) => value === 0)).toBe(true);

    const dem = tiltedPlane(30, 90, 3);
    dem.nodata.fill(1);
    const missing = cloudAlpha(computeSurface(dem), SIZE);
    expect(missing.every((value) => value === 0)).toBe(true);
  });

  it('returns nothing for a net with no size', () => {
    expect(cloudAlpha(computeSurface(tiltedPlane(30, 90)), 0)).toHaveLength(0);
  });
});
