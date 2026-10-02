import { describe, expect, it } from 'vitest';
import { DEFAULT_SUN, compass, formatSun, fromNet, netToSun, sunToNet, toNet } from './net';

describe('toNet', () => {
  it('plots flat ground at the center', () => {
    const p = toNet(0, 123);
    expect(p.x).toBeCloseTo(0, 10);
    expect(p.y).toBeCloseTo(0, 10);
  });

  it('plots a vertical face on the rim', () => {
    const p = toNet(90, 0);
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(1, 10);
  });

  it('plots an east-facing slope on the positive x axis', () => {
    const p = toNet(45, 90);
    expect(p.x).toBeGreaterThan(0);
    expect(p.y).toBeCloseTo(0, 10);
  });

  it('plots a north-facing slope on the positive y axis', () => {
    const p = toNet(45, 0);
    expect(p.x).toBeCloseTo(0, 10);
    expect(p.y).toBeGreaterThan(0);
  });

  it('puts the 30° and 60° rings at 0.366 and 0.707', () => {
    expect(toNet(30, 0).y).toBeCloseTo(0.366, 3);
    expect(toNet(60, 0).y).toBeCloseTo(0.707, 3);
  });
});

describe('fromNet', () => {
  it('reverses toNet', () => {
    for (const [slope, aspect] of [[10, 5], [36.3, 264], [72, 180], [89, 359]]) {
      const p = toNet(slope, aspect);
      const back = fromNet(p.x, p.y);
      expect(back.slope).toBeCloseTo(slope, 6);
      expect(back.aspect).toBeCloseTo(aspect, 6);
    }
  });

  it('treats a point outside the rim as on the rim', () => {
    expect(fromNet(3, 0).slope).toBeCloseTo(90, 6);
  });
});

describe('compass', () => {
  it('names eight points', () => {
    expect(compass(0)).toBe('N');
    expect(compass(264)).toBe('W');
    expect(compass(337.5)).toBe('N');
    expect(compass(22.4)).toBe('N');
    expect(compass(22.5)).toBe('NE');
    expect(compass(360)).toBe('N');
    expect(compass(-90)).toBe('W');
  });

  it('names sixteen points', () => {
    expect(compass(70, 16)).toBe('ENE');
    expect(compass(315, 16)).toBe('NW');
  });
});

describe('sun on the net', () => {
  it('places the default sun to the northwest at the 45° slope radius', () => {
    const p = sunToNet(DEFAULT_SUN);
    expect(p.x).toBeCloseTo(-p.y, 10);
    expect(p.x).toBeLessThan(0);
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(Math.SQRT2 * Math.sin(Math.PI / 8), 10);
  });

  it('reverses sunToNet', () => {
    const p = sunToNet({ azimuth: 70, altitude: 35 });
    const sun = netToSun(p.x, p.y);
    expect(sun.azimuth).toBeCloseTo(70, 6);
    expect(sun.altitude).toBeCloseTo(35, 6);
  });

  it('puts the sun overhead at the center', () => {
    expect(netToSun(0, 0).altitude).toBeCloseTo(90, 6);
  });

  it('holds the sun at 10° when dragged to the rim or beyond', () => {
    expect(netToSun(0, 1).altitude).toBe(10);
    expect(netToSun(5, 5).altitude).toBe(10);
  });

  it('describes the sun in words', () => {
    expect(formatSun({ azimuth: 70, altitude: 35 })).toBe('ENE · 35° high');
    expect(formatSun({ azimuth: 0, altitude: 90 })).toBe('Overhead');
  });
});
