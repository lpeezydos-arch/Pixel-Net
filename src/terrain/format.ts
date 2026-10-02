import { compass } from './net';
import type { Dem, Surface } from './types';

export interface ReadoutText {
  slope: string;
  aspect: string;
  elevation: string;
}

export const EMPTY_READOUT: ReadoutText = { slope: '–', aspect: '–', elevation: '–' };
const NO_DATA: ReadoutText = { slope: 'No data', aspect: 'No data', elevation: 'No data' };

const wholeNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** The three readout values for the pixel at `index`, or dashes when `index` is −1. */
export function readoutFor(dem: Dem, surface: Surface, index: number): ReadoutText {
  if (index < 0 || index >= surface.slope.length) return EMPTY_READOUT;
  if (surface.nodata[index]) return NO_DATA;
  const elevation = `${wholeNumber.format(dem.elevation[index])} m`;
  if (surface.flat[index]) return { slope: '0.0°', aspect: 'Flat', elevation };
  const aspect = surface.aspect[index];
  return {
    slope: `${surface.slope[index].toFixed(1)}°`,
    aspect: `${Math.round(aspect) % 360}° ${compass(aspect)}`,
    elevation,
  };
}

/** The readout as one sentence, for screen readers. */
export function describeReadout(readout: ReadoutText): string {
  if (readout === EMPTY_READOUT) return '';
  if (readout === NO_DATA) return 'No data at this pixel';
  return `Slope ${readout.slope}, aspect ${readout.aspect}, elevation ${readout.elevation}`;
}
