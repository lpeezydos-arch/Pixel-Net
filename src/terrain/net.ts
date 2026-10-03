import type { Sun } from './types';

export interface NetPoint {
  /** East is positive. The rim is at radius 1. */
  x: number;
  /** North is positive. */
  y: number;
}

export const DEFAULT_SUN: Sun = { azimuth: 315, altitude: 45 };
export const MIN_SUN_ALTITUDE = 10;

const RAD = Math.PI / 180;
const POINTS_8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const POINTS_16 = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

/** Equal-area (Schmidt) projection of the upward normal of a slope. */
export function toNet(slope: number, aspect: number): NetPoint {
  const r = Math.SQRT2 * Math.sin((slope * RAD) / 2);
  return { x: r * Math.sin(aspect * RAD), y: r * Math.cos(aspect * RAD) };
}

export function fromNet(x: number, y: number): { slope: number; aspect: number } {
  const r = Math.min(1, Math.hypot(x, y));
  return {
    slope: (2 * Math.asin(r / Math.SQRT2)) / RAD,
    aspect: (Math.atan2(x, y) / RAD + 360) % 360,
  };
}

export function compass(degrees: number, points: 8 | 16 = 8): string {
  const names = points === 8 ? POINTS_8 : POINTS_16;
  const step = 360 / points;
  const wrapped = ((degrees % 360) + 360) % 360;
  return names[Math.floor((wrapped + step / 2) / step) % points];
}

/** The sun sits where a slope facing straight at it would plot. */
export function sunToNet(sun: Sun): NetPoint {
  return toNet(90 - sun.altitude, sun.azimuth);
}

export function netToSun(x: number, y: number): Sun {
  const { slope, aspect } = fromNet(x, y);
  return { azimuth: aspect, altitude: Math.max(MIN_SUN_ALTITUDE, 90 - slope) };
}

/** The sun written the way the aspect readout is: degrees, then the compass letter. */
export function formatSun(sun: Sun): string {
  if (sun.altitude >= 89.5) return 'Overhead';
  return `${Math.round(sun.azimuth) % 360}° ${compass(sun.azimuth)} · ${Math.round(sun.altitude)}° high`;
}
