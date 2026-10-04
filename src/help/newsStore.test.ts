import { describe, expect, it } from 'vitest';
import { NEWS_SEEN_KEY, parseSeen } from './newsStore';

describe('parseSeen', () => {
  it('reads a whole number', () => {
    expect(parseSeen('4')).toBe(4);
    expect(parseSeen('0')).toBe(0);
    expect(parseSeen('9999')).toBe(9999);
  });

  it('reads nothing stored as 0', () => {
    expect(parseSeen(null)).toBe(0);
    expect(parseSeen('')).toBe(0);
  });

  it('reads anything that is not a whole number as 0', () => {
    for (const raw of ['abc', '-1', '1.5', '4 ', ' 4', '4px', '1e3', 'NaN', '99999999999999999999']) {
      expect(parseSeen(raw), raw).toBe(0);
    }
  });
});

describe('the key', () => {
  it('carries the prefix the saved view uses, because the origin is shared', () => {
    expect(NEWS_SEEN_KEY).toBe('pixel-net:news-seen');
  });
});
