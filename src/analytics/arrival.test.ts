import { describe, expect, it } from 'vitest';
import { OPT_OUT_KEY, arrivalSource } from './arrival';

describe('arrivalSource', () => {
  it('is link when the address names a view', () => {
    expect(arrivalSource('dem=gore&px=1,2', 'dem=gore')).toBe('link');
  });

  it('is saved when only the device remembers a view', () => {
    expect(arrivalSource('', 'dem=gore&px=1,2')).toBe('saved');
  });

  it('is default when there is neither', () => {
    expect(arrivalSource('', '')).toBe('default');
  });

  it('treats an address that names nothing as no address', () => {
    expect(arrivalSource('foo=bar', '')).toBe('default');
  });
});

describe('the opt-out key', () => {
  it('carries the prefix the saved view uses, because the origin is shared', () => {
    expect(OPT_OUT_KEY).toBe('pixel-net:no-analytics');
  });
});
