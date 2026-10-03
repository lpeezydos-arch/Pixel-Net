import { describe, expect, it } from 'vitest';
import { DEFAULT_SUN } from '../terrain/net';
import { DEFAULT_VIEW, type View, decodeView, encodeView, pixelInside } from './view';

const WEST = { col: 150, row: 210 };
const LOW_SOUTHEAST = { azimuth: 120, altitude: 35 };

describe('encodeView', () => {
  it('writes the default view as nothing', () => {
    expect(encodeView(DEFAULT_VIEW, 'gore')).toBe('');
    expect(encodeView({ dem: 'gore', pixel: null, sun: DEFAULT_SUN }, 'gore')).toBe('');
  });

  it('names the DEM, then the pixel, then the sun', () => {
    expect(encodeView({ dem: 'gore', pixel: WEST, sun: DEFAULT_SUN }, 'gore')).toBe('dem=gore&px=150,210');
    expect(encodeView({ dem: 'gore', pixel: WEST, sun: LOW_SOUTHEAST }, 'gore')).toBe(
      'dem=gore&px=150,210&sun=120,35',
    );
    expect(encodeView({ dem: 'gore', pixel: null, sun: LOW_SOUTHEAST }, 'gore')).toBe('dem=gore&sun=120,35');
    expect(encodeView({ dem: 'second', pixel: null, sun: DEFAULT_SUN }, 'gore')).toBe('dem=second');
  });

  it('takes a view with no DEM to mean the first', () => {
    expect(encodeView({ dem: null, pixel: WEST, sun: DEFAULT_SUN }, 'gore')).toBe('dem=gore&px=150,210');
  });

  it('rounds the sun to whole degrees and writes 360 as 0', () => {
    const sun = { azimuth: 359.6, altitude: 34.5 };
    expect(encodeView({ dem: 'gore', pixel: null, sun }, 'gore')).toBe('dem=gore&sun=0,35');
  });

  it('leaves out a sun that rounds to the default', () => {
    const sun = { azimuth: 315.2, altitude: 44.8 };
    expect(encodeView({ dem: 'gore', pixel: null, sun }, 'gore')).toBe('');
  });

  it('escapes a DEM id that is not plain', () => {
    expect(encodeView({ dem: 'big bend & more', pixel: null, sun: DEFAULT_SUN }, 'gore')).toBe(
      'dem=big%20bend%20%26%20more',
    );
  });
});

describe('decodeView', () => {
  it('reads back everything encodeView writes', () => {
    const views: View[] = [
      { dem: 'gore', pixel: WEST, sun: DEFAULT_SUN },
      { dem: 'gore', pixel: WEST, sun: LOW_SOUTHEAST },
      { dem: 'gore', pixel: null, sun: LOW_SOUTHEAST },
      { dem: 'second', pixel: null, sun: DEFAULT_SUN },
      { dem: 'second', pixel: { col: 0, row: 0 }, sun: { azimuth: 0, altitude: 90 } },
      { dem: 'big bend & more', pixel: null, sun: DEFAULT_SUN },
    ];
    for (const view of views) expect(decodeView(encodeView(view, 'gore'))).toEqual(view);
  });

  it('reads nothing as the default view', () => {
    expect(decodeView('')).toEqual(DEFAULT_VIEW);
  });

  it('reads an escaped id and an escaped comma', () => {
    expect(decodeView('dem=big%20bend%20%26%20more&px=150%2C210')).toEqual({
      dem: 'big bend & more',
      pixel: WEST,
      sun: DEFAULT_SUN,
    });
  });

  it('drops a pixel that is not two whole numbers', () => {
    for (const px of ['', '150', '150,', ',210', '1.5,2', '-1,2', 'a,b', '1,2,3']) {
      expect(decodeView(`dem=gore&px=${px}`).pixel, `px=${px}`).toBeNull();
    }
  });

  it('falls back to the default sun when the sun is not two numbers', () => {
    for (const sun of ['', '120', '120,', ',35', 'a,b', '1,2,3']) {
      expect(decodeView(`sun=${sun}`).sun, `sun=${sun}`).toEqual(DEFAULT_SUN);
    }
  });

  it('wraps the azimuth, limits the height and rounds both', () => {
    expect(decodeView('sun=480,35').sun).toEqual({ azimuth: 120, altitude: 35 });
    expect(decodeView('sun=-45,35').sun).toEqual({ azimuth: 315, altitude: 35 });
    expect(decodeView('sun=120,2').sun).toEqual({ azimuth: 120, altitude: 10 });
    expect(decodeView('sun=120,400').sun).toEqual({ azimuth: 120, altitude: 90 });
    expect(decodeView('sun=120.4,34.6').sun).toEqual({ azimuth: 120, altitude: 35 });
  });

  it('ignores parts it does not know', () => {
    expect(decodeView('utm_source=x&dem=gore&zoom=3')).toEqual({ dem: 'gore', pixel: null, sun: DEFAULT_SUN });
  });
});

describe('pixelInside', () => {
  it('accepts every pixel of the DEM and nothing beyond it', () => {
    expect(pixelInside({ col: 0, row: 0 }, 288, 294)).toBe(true);
    expect(pixelInside({ col: 287, row: 293 }, 288, 294)).toBe(true);
    expect(pixelInside({ col: 150, row: 210 }, 288, 294)).toBe(true);
    expect(pixelInside({ col: 288, row: 0 }, 288, 294)).toBe(false);
    expect(pixelInside({ col: 0, row: 294 }, 288, 294)).toBe(false);
    expect(pixelInside({ col: -1, row: 0 }, 288, 294)).toBe(false);
  });
});
