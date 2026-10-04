import { describe, expect, it } from 'vitest';
import { DEFAULT_SUN } from '../terrain/net';
import { DEFAULT_VIEW, type View, decodeView, encodeSharedView, encodeView, namesView, pixelInside } from './view';

const WEST = { col: 150, row: 210 };
const LOW_SOUTHEAST = { azimuth: 120, altitude: 35 };

describe('encodeView', () => {
  it('writes the default view as nothing', () => {
    expect(encodeView(DEFAULT_VIEW, 'gore')).toBe('');
    expect(encodeView({ dem: 'gore', pixel: null, sun: DEFAULT_SUN, density: false }, 'gore')).toBe('');
  });

  it('names the DEM, then the pixel, then the sun', () => {
    expect(encodeView({ dem: 'gore', pixel: WEST, sun: DEFAULT_SUN, density: false }, 'gore')).toBe('dem=gore&px=150,210');
    expect(encodeView({ dem: 'gore', pixel: WEST, sun: LOW_SOUTHEAST, density: false }, 'gore')).toBe(
      'dem=gore&px=150,210&sun=120,35',
    );
    expect(encodeView({ dem: 'gore', pixel: null, sun: LOW_SOUTHEAST, density: false }, 'gore')).toBe('dem=gore&sun=120,35');
    expect(encodeView({ dem: 'second', pixel: null, sun: DEFAULT_SUN, density: false }, 'gore')).toBe('dem=second');
  });

  it('takes a view with no DEM to mean the first', () => {
    expect(encodeView({ dem: null, pixel: WEST, sun: DEFAULT_SUN, density: false }, 'gore')).toBe('dem=gore&px=150,210');
  });

  it('rounds the sun to whole degrees and writes 360 as 0', () => {
    const sun = { azimuth: 359.6, altitude: 34.5 };
    expect(encodeView({ dem: 'gore', pixel: null, sun, density: false }, 'gore')).toBe('dem=gore&sun=0,35');
  });

  it('leaves out a sun that rounds to the default', () => {
    const sun = { azimuth: 315.2, altitude: 44.8 };
    expect(encodeView({ dem: 'gore', pixel: null, sun, density: false }, 'gore')).toBe('');
  });

  it('escapes a DEM id that is not plain', () => {
    expect(encodeView({ dem: 'big bend & more', pixel: null, sun: DEFAULT_SUN, density: false }, 'gore')).toBe(
      'dem=big%20bend%20%26%20more',
    );
  });
});

describe('encodeSharedView', () => {
  it('names the DEM of the default view', () => {
    expect(encodeSharedView({ dem: 'gore', pixel: null, sun: DEFAULT_SUN, density: false }, 'gore')).toBe('dem=gore');
  });

  it('names the first DEM when the view names none', () => {
    expect(encodeSharedView(DEFAULT_VIEW, 'gore')).toBe('dem=gore');
    expect(encodeSharedView(DEFAULT_VIEW, 'big bend & more')).toBe('dem=big%20bend%20%26%20more');
  });

  it('writes any other view as encodeView does', () => {
    const views: View[] = [
      { dem: 'gore', pixel: WEST, sun: DEFAULT_SUN, density: false },
      { dem: 'gore', pixel: WEST, sun: LOW_SOUTHEAST, density: false },
      { dem: 'gore', pixel: null, sun: LOW_SOUTHEAST, density: false },
      { dem: 'second', pixel: null, sun: DEFAULT_SUN, density: false },
      { dem: null, pixel: WEST, sun: DEFAULT_SUN, density: false },
    ];
    for (const view of views) expect(encodeSharedView(view, 'gore')).toBe(encodeView(view, 'gore'));
  });

  it('is read back as the default view on the named DEM', () => {
    expect(decodeView(encodeSharedView(DEFAULT_VIEW, 'gore'))).toEqual({ ...DEFAULT_VIEW, dem: 'gore' });
  });
});

describe('decodeView', () => {
  it('reads back everything encodeView writes', () => {
    const views: View[] = [
      { dem: 'gore', pixel: WEST, sun: DEFAULT_SUN, density: false },
      { dem: 'gore', pixel: WEST, sun: LOW_SOUTHEAST, density: false },
      { dem: 'gore', pixel: null, sun: LOW_SOUTHEAST, density: false },
      { dem: 'second', pixel: null, sun: DEFAULT_SUN, density: false },
      { dem: 'second', pixel: { col: 0, row: 0 }, sun: { azimuth: 0, altitude: 90 }, density: false },
      { dem: 'big bend & more', pixel: null, sun: DEFAULT_SUN, density: false },
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
      density: false,
    });
  });

  it('drops a pixel that is not two whole numbers', () => {
    for (const px of ['', '150', '150,', ',210', '1.5,2', '-1,2', 'a,b', '1,2,3', '1234567,1']) {
      expect(decodeView(`dem=gore&px=${px}`).pixel, `px=${px}`).toBeNull();
    }
  });

  it('falls back to the default sun when the sun is not two numbers', () => {
    for (const sun of ['', '120', '120,', ',35', 'a,b', '1,2,3', 'Infinity,35']) {
      expect(decodeView(`sun=${sun}`).sun, `sun=${sun}`).toEqual(DEFAULT_SUN);
    }
  });

  it('wraps the azimuth, limits the height and rounds both', () => {
    expect(decodeView('sun=360,35').sun).toEqual({ azimuth: 0, altitude: 35 });
    expect(decodeView('sun=480,35').sun).toEqual({ azimuth: 120, altitude: 35 });
    expect(decodeView('sun=-45,35').sun).toEqual({ azimuth: 315, altitude: 35 });
    expect(decodeView('sun=120,2').sun).toEqual({ azimuth: 120, altitude: 10 });
    expect(decodeView('sun=120,400').sun).toEqual({ azimuth: 120, altitude: 90 });
    expect(decodeView('sun=120.4,34.6').sun).toEqual({ azimuth: 120, altitude: 35 });
  });

  it('ignores parts it does not know', () => {
    expect(decodeView('utm_source=x&dem=gore&zoom=3')).toEqual({ dem: 'gore', pixel: null, sun: DEFAULT_SUN, density: false });
  });
});

describe('namesView', () => {
  it('is true for text that names any part of a view', () => {
    for (const text of ['dem=gore', 'px=1,2', 'sun=1,2', 'x=1&sun=1,2']) {
      expect(namesView(text), text).toBe(true);
    }
  });

  it('is false for text that names none', () => {
    for (const text of ['', 'top', 'utm_source=x']) {
      expect(namesView(text), text).toBe(false);
    }
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

describe('the density layer', () => {
  const ON: View = { dem: 'gore', pixel: WEST, sun: LOW_SOUTHEAST, density: true };

  it('is written last, as density=1', () => {
    expect(encodeView(ON, 'gore')).toBe('dem=gore&px=150,210&sun=120,35&density=1');
    expect(encodeView({ ...DEFAULT_VIEW, density: true }, 'gore')).toBe('dem=gore&density=1');
  });

  it('is left out when it is off', () => {
    expect(encodeView({ ...ON, density: false }, 'gore')).toBe('dem=gore&px=150,210&sun=120,35');
    expect(encodeView(DEFAULT_VIEW, 'gore')).toBe('');
  });

  it('is read back', () => {
    expect(decodeView(encodeView(ON, 'gore'))).toEqual(ON);
    expect(decodeView('density=1')).toEqual({ ...DEFAULT_VIEW, density: true });
  });

  it('reads as off in a link made before there was a layer', () => {
    expect(decodeView('dem=gore&px=150,210&sun=120,35').density).toBe(false);
  });

  it('reads as off for any value but 1', () => {
    for (const value of ['', '0', 'true', 'on', '2', '01', '1.0', ' 1']) {
      expect(decodeView(`density=${value}`).density, `density=${value}`).toBe(false);
    }
  });

  it('is shared like any other part', () => {
    expect(encodeSharedView({ ...DEFAULT_VIEW, density: true }, 'gore')).toBe('dem=gore&density=1');
  });

  it('makes a string name a view', () => {
    expect(namesView('density=1')).toBe(true);
    expect(namesView('density=0')).toBe(true);
  });
});
