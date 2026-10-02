import { describe, expect, it } from 'vitest';
import { EMPTY_READOUT, describeReadout, readoutFor } from './format';
import { computeSurface } from './surface';
import { demFrom, tiltedPlane } from './testing';

const CENTER = 3 * 7 + 3;

describe('readoutFor', () => {
  it('shows dashes when nothing is selected', () => {
    const dem = tiltedPlane(30, 90);
    expect(readoutFor(dem, computeSurface(dem), -1)).toEqual(EMPTY_READOUT);
    expect(EMPTY_READOUT).toEqual({ slope: '–', aspect: '–', elevation: '–' });
  });

  it('formats slope, aspect and elevation', () => {
    const dem = tiltedPlane(36.3, 264);
    dem.elevation[CENTER] = 3873.9;
    // Changing one elevation tilts its neighbors, so read the surface first.
    const surface = computeSurface(tiltedPlane(36.3, 264));
    expect(readoutFor(dem, surface, CENTER)).toEqual({
      slope: '36.3°',
      aspect: '264° W',
      elevation: '3,874 m',
    });
  });

  it('writes an aspect that rounds up to 360° as 0° N', () => {
    const dem = tiltedPlane(20, 359.7);
    expect(readoutFor(dem, computeSurface(dem), CENTER).aspect).toBe('0° N');
  });

  it('says Flat where the ground has no direction', () => {
    const dem = demFrom(5, 5, 5, () => 3620.18);
    expect(readoutFor(dem, computeSurface(dem), 12)).toEqual({
      slope: '0.0°',
      aspect: 'Flat',
      elevation: '3,620 m',
    });
  });

  it('says No data for a pixel without data', () => {
    const dem = tiltedPlane(30, 90);
    dem.nodata[CENTER] = 1;
    expect(readoutFor(dem, computeSurface(dem), CENTER)).toEqual({
      slope: 'No data',
      aspect: 'No data',
      elevation: 'No data',
    });
  });

  it('shows dashes for an index past the end of the DEM', () => {
    const dem = tiltedPlane(30, 90);
    expect(readoutFor(dem, computeSurface(dem), 10_000)).toEqual(EMPTY_READOUT);
  });
});

describe('describeReadout', () => {
  it('reads the three values as one sentence', () => {
    expect(describeReadout({ slope: '36.3°', aspect: '264° W', elevation: '3,874 m' })).toBe(
      'Slope 36.3°, aspect 264° W, elevation 3,874 m',
    );
  });

  it('says so when there is no data, and nothing when nothing is selected', () => {
    const dem = tiltedPlane(30, 90);
    dem.nodata[CENTER] = 1;
    expect(describeReadout(readoutFor(dem, computeSurface(dem), CENTER))).toBe('No data at this pixel');
    expect(describeReadout(EMPTY_READOUT)).toBe('');
  });
});
