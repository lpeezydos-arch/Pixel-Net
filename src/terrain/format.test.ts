import { describe, expect, it } from 'vitest';
import { EMPTY_READOUT, demFacts, describeReadout, describeSun, pixelSize, readoutFor, tileLine } from './format';
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

describe('describeSun', () => {
  it('reads the sun as one phrase, with a pause where the label has a dot', () => {
    expect(describeSun({ azimuth: 315, altitude: 45 })).toBe('Sun 315° NW, 45° high');
    expect(describeSun({ azimuth: 67.5, altitude: 10 })).toBe('Sun 68° E, 10° high');
  });

  it('says overhead when the sun is overhead', () => {
    expect(describeSun({ azimuth: 0, altitude: 90 })).toBe('Sun overhead');
  });
});

describe('demFacts', () => {
  it('writes the place, the pixel size and the dimensions', () => {
    const dem = demFrom(288, 294, 5, () => 0);
    expect(pixelSize(dem)).toBe('5 m pixels');
    expect(demFacts('Gore Range, Colorado', dem)).toBe('Gore Range, Colorado · 5 m pixels · 288 × 294');
  });

  it('keeps two decimals of an uneven pixel size and drops trailing zeros', () => {
    expect(pixelSize(demFrom(2, 2, 4.99712, () => 0))).toBe('5 m pixels');
    expect(pixelSize(demFrom(2, 2, 0.5, () => 0))).toBe('0.5 m pixels');
    expect(pixelSize(demFrom(2, 2, 9.144, () => 0))).toBe('9.14 m pixels');
  });
});

describe('tileLine', () => {
  it('writes the region and the pixel size', () => {
    expect(tileLine({ region: 'Virginia', cell: 100 })).toBe('Virginia · 100 m');
  });

  it('writes the pixel size as the caption does, without the word', () => {
    expect(tileLine({ region: 'Colorado', cell: 4.99712 })).toBe('Colorado · 5 m');
    expect(tileLine({ cell: 2.5 })).toBe('2.5 m');
  });

  it('leaves out a part the entry does not give', () => {
    expect(tileLine({ region: 'Colorado' })).toBe('Colorado');
    expect(tileLine({ cell: 5 })).toBe('5 m');
    expect(tileLine({})).toBe('');
  });

  // The list is written by hand, so a value may be of the wrong kind.
  it('leaves out a part that is not usable', () => {
    expect(tileLine({ region: '  ', cell: 5 })).toBe('5 m');
    expect(tileLine({ region: 7, cell: 5 })).toBe('5 m');
    for (const cell of ['5', 0, -1, Number.NaN, Number.POSITIVE_INFINITY, null]) {
      expect(tileLine({ region: 'Colorado', cell })).toBe('Colorado');
    }
  });
});
