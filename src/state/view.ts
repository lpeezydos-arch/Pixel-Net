import { DEFAULT_SUN, MIN_SUN_ALTITUDE } from '../terrain/net';
import type { Pixel, Sun } from '../terrain/types';

/** What the screen shows: which DEM, which pixel is selected, and where the sun is. */
export interface View {
  /** The DEM's `id` in the list, or null for the first DEM. */
  dem: string | null;
  /** The selected pixel, or null when nothing is selected. */
  pixel: Pixel | null;
  /** In whole degrees, the precision the sun's label shows. */
  sun: Sun;
}

export const DEFAULT_VIEW: View = { dem: null, pixel: null, sun: DEFAULT_SUN };

/** The sun in whole degrees: azimuth 0 to 359, height within the limits a drag has. */
function wholeSun(sun: Sun): Sun {
  return {
    azimuth: ((Math.round(sun.azimuth) % 360) + 360) % 360,
    altitude: Math.min(90, Math.max(MIN_SUN_ALTITUDE, Math.round(sun.altitude))),
  };
}

/**
 * The view as text, such as `dem=gore&px=150,210&sun=120,35`. A part at its
 * default is left out, and the default view is the empty string. Any other
 * view names its DEM, so a link keeps its meaning if the list is reordered.
 */
export function encodeView(view: View, firstDem: string): string {
  const dem = view.dem ?? firstDem;
  const sun = wholeSun(view.sun);
  const defaultSun = sun.azimuth === DEFAULT_SUN.azimuth && sun.altitude === DEFAULT_SUN.altitude;
  if (dem === firstDem && !view.pixel && defaultSun) return '';
  const parts = [`dem=${encodeURIComponent(dem)}`];
  if (view.pixel) parts.push(`px=${view.pixel.col},${view.pixel.row}`);
  if (!defaultSun) parts.push(`sun=${sun.azimuth},${sun.altitude}`);
  return parts.join('&');
}

const WHOLE_PAIR = /^(\d{1,6}),(\d{1,6})$/;

function decodePixel(text: string | null): Pixel | null {
  const match = text?.match(WHOLE_PAIR);
  return match ? { col: Number(match[1]), row: Number(match[2]) } : null;
}

function decodeSun(text: string | null): Sun {
  const parts = text?.split(',') ?? [];
  if (parts.length !== 2 || parts.some((part) => part.trim() === '')) return DEFAULT_SUN;
  const [azimuth, altitude] = parts.map(Number);
  if (!Number.isFinite(azimuth) || !Number.isFinite(altitude)) return DEFAULT_SUN;
  return wholeSun({ azimuth, altitude });
}

/**
 * Reads what `encodeView` writes. It reads leniently: a part that cannot be
 * used is dropped and the rest still applies. Whether the DEM is in the list
 * and the pixel inside it is for the caller to check, once both are known.
 */
export function decodeView(text: string): View {
  const params = new URLSearchParams(text);
  return {
    dem: params.get('dem') || null,
    pixel: decodePixel(params.get('px')),
    sun: decodeSun(params.get('sun')),
  };
}

export function pixelInside(pixel: Pixel, width: number, height: number): boolean {
  return pixel.col >= 0 && pixel.row >= 0 && pixel.col < width && pixel.row < height;
}
