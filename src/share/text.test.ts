import { describe, expect, it } from 'vitest';
import { EMPTY_READOUT, NO_DATA, type ReadoutText } from '../terrain/format';
import { DEFAULT_SUN } from '../terrain/net';
import type { Dem } from '../terrain/types';
import { captionLines, fileName, shareText, siteName } from './text';

const PLACE = 'Gore Range, Colorado';
const SITE = 'lpeezydos-arch.github.io/Pixel-Net';
const WEST: ReadoutText = { slope: '36.0°', aspect: '259° W', elevation: '3,874 m' };
// Only the DEM's size is read here.
const DEM: Dem = { width: 288, height: 294, cellSize: 5, elevation: new Float32Array(0), nodata: new Uint8Array(0) };

describe('shareText', () => {
  it('gives the place and what was read there', () => {
    expect(shareText(PLACE, WEST)).toBe('Gore Range, Colorado: slope 36.0°, aspect 259° W, elevation 3,874 m');
  });

  it('says so when the pixel has no data', () => {
    expect(shareText(PLACE, NO_DATA)).toBe('Gore Range, Colorado: no data at this pixel');
  });

  it('is the place alone when nothing is selected', () => {
    expect(shareText(PLACE, EMPTY_READOUT)).toBe('Gore Range, Colorado');
  });
});

describe('captionLines', () => {
  it('writes the readout, the facts and the source', () => {
    expect(captionLines({ place: PLACE, dem: DEM, readout: WEST, sun: DEFAULT_SUN, site: SITE })).toEqual([
      {
        text: 'Slope 36.0° · Aspect 259° W · Elevation 3,874 m',
        size: 30,
        height: 40,
        weight: 600,
        ink: 'ink-900',
      },
      { text: 'Gore Range, Colorado · 5 m pixels · 288 × 294', size: 20, height: 28, weight: 400, ink: 'ink-500' },
      {
        text: 'Sun 315° NW · 45° high · lpeezydos-arch.github.io/Pixel-Net',
        size: 20,
        height: 28,
        weight: 400,
        ink: 'ink-500',
      },
    ]);
  });

  it('has no readout line when nothing is selected', () => {
    const lines = captionLines({ place: PLACE, dem: DEM, readout: EMPTY_READOUT, sun: DEFAULT_SUN, site: SITE });
    expect(lines.map((line) => line.height)).toEqual([28, 28]);
    expect(lines[0].text).toBe('Gore Range, Colorado · 5 m pixels · 288 × 294');
  });

  it('says so when the pixel has no data', () => {
    const lines = captionLines({ place: PLACE, dem: DEM, readout: NO_DATA, sun: DEFAULT_SUN, site: SITE });
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatchObject({ text: 'No data at this pixel', size: 30, weight: 600 });
  });

  it('writes a sun at the top of the sky as overhead', () => {
    const sun = { azimuth: 120, altitude: 90 };
    const lines = captionLines({ place: PLACE, dem: DEM, readout: EMPTY_READOUT, sun, site: SITE });
    expect(lines[1].text).toBe('Sun overhead · lpeezydos-arch.github.io/Pixel-Net');
  });
});

describe('siteName', () => {
  it('is the host and the path with no trailing slash', () => {
    expect(siteName('lpeezydos-arch.github.io', '/Pixel-Net/')).toBe('lpeezydos-arch.github.io/Pixel-Net');
    expect(siteName('localhost:4173', '/')).toBe('localhost:4173');
    expect(siteName('example.org', '/app/index.html')).toBe('example.org/app');
  });
});

describe('fileName', () => {
  it('is made of the app name and the DEM id, in plain lowercase', () => {
    expect(fileName('Pixel Net', 'gore')).toBe('pixel-net-gore.png');
    expect(fileName('Pixel Net', 'Big Bend #2')).toBe('pixel-net-big-bend-2.png');
    expect(fileName('', '')).toBe('view.png');
  });
});
