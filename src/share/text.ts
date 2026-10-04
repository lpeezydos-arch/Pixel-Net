import { EMPTY_READOUT, NO_DATA, type ReadoutText, demFacts, describeReadout } from '../terrain/format';
import { formatSun } from '../terrain/net';
import type { Dem, Sun } from '../terrain/types';

/** One line of the picture's caption. Sizes are in image pixels. */
export interface CaptionLine {
  text: string;
  /** Font size. */
  size: number;
  /** Height of the line's box. */
  height: number;
  weight: 400 | 600;
  ink: 'ink-900' | 'ink-500';
}

const READOUT_LINE = { size: 30, height: 40, weight: 600, ink: 'ink-900' } as const;
const SMALL_LINE = { size: 20, height: 28, weight: 400, ink: 'ink-500' } as const;

/** One line for the share sheet: the place, and what was read there. */
export function shareText(place: string, readout: ReadoutText): string {
  const said = describeReadout(readout);
  return said ? `${place}: ${said[0].toLowerCase()}${said.slice(1)}` : place;
}

interface CaptionInput {
  place: string;
  dem: Dem;
  readout: ReadoutText;
  sun: Sun;
  /** The page's host and path, from `siteName`. */
  site: string;
  /** The density layer's line, from `densityCaption`; nothing when the layer is off or empty. */
  density?: string | null;
}

/**
 * The picture's caption: the readout if a pixel is selected, the DEM's
 * facts, then the sun and where the picture came from, so a picture pasted
 * into a report still says what it is. With the density layer on, a last
 * line says what its lines mean.
 */
export function captionLines({ place, dem, readout, sun, site, density }: CaptionInput): CaptionLine[] {
  const lines: CaptionLine[] = [];
  if (readout === NO_DATA) {
    lines.push({ ...READOUT_LINE, text: 'No data at this pixel' });
  } else if (readout !== EMPTY_READOUT) {
    lines.push({
      ...READOUT_LINE,
      text: `Slope ${readout.slope} · Aspect ${readout.aspect} · Elevation ${readout.elevation}`,
    });
  }
  lines.push({ ...SMALL_LINE, text: demFacts(place, dem) });
  const light = formatSun(sun);
  lines.push({ ...SMALL_LINE, text: `${light === 'Overhead' ? 'Sun overhead' : `Sun ${light}`} · ${site}` });
  if (density) lines.push({ ...SMALL_LINE, text: density });
  return lines;
}

/** The page's host and path with no trailing slash: where a picture says it came from. */
export function siteName(host: string, pathname: string): string {
  return `${host}${pathname}`.replace(/\/(index\.html)?$/, '');
}

/** A file name for the picture, from the app's name and the DEM's id. */
export function fileName(appName: string, demId: string): string {
  const plain = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  return `${[plain(appName), plain(demId)].filter(Boolean).join('-') || 'view'}.png`;
}
