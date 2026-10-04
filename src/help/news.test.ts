import { describe, expect, it } from 'vitest';
import { NEWS, type NewsEntry, formatDate, isUnseen, latest, newestId } from './news';

const entry = (id: number): NewsEntry => ({ id, date: '2026-10-03', text: `Change ${id}.` });
const five = [1, 2, 3, 4, 5].map(entry);

describe('latest', () => {
  it('gives the last entries, newest first', () => {
    expect(latest(five, 3).map((e) => e.id)).toEqual([5, 4, 3]);
  });

  it('gives what there is when the list is short', () => {
    expect(latest([entry(1), entry(2)], 3).map((e) => e.id)).toEqual([2, 1]);
  });

  it('gives nothing from an empty list, or when asked for none', () => {
    expect(latest([], 3)).toEqual([]);
    expect(latest(five, 0)).toEqual([]);
  });

  it('leaves the list as it was', () => {
    const list = [1, 2, 3].map(entry);
    latest(list, 2);
    expect(list.map((e) => e.id)).toEqual([1, 2, 3]);
  });
});

describe('newestId', () => {
  it('is the highest id', () => {
    expect(newestId(five)).toBe(5);
  });

  it('is 0 for an empty list', () => {
    expect(newestId([])).toBe(0);
  });
});

describe('isUnseen', () => {
  it('is true only for an entry newer than the one remembered', () => {
    expect(isUnseen(entry(3), 2)).toBe(true);
    expect(isUnseen(entry(3), 3)).toBe(false);
    expect(isUnseen(entry(3), 9)).toBe(false);
    expect(isUnseen(entry(1), 0)).toBe(true);
  });
});

describe('formatDate', () => {
  it('writes the day, a short month and the year', () => {
    expect(formatDate('2026-10-03')).toBe('3 Oct 2026');
    expect(formatDate('2027-01-31')).toBe('31 Jan 2027');
    expect(formatDate('2026-12-09')).toBe('9 Dec 2026');
  });
});

describe('the list', () => {
  it('numbers its entries from 1, rising by one', () => {
    expect(NEWS.map((e) => e.id)).toEqual(NEWS.map((_, i) => i + 1));
  });

  it('dates each entry with a real day, never earlier than the entry before', () => {
    for (const { date } of NEWS) {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10)).toBe(date);
    }
    const dates = NEWS.map((e) => e.date);
    expect(dates).toEqual([...dates].sort());
  });

  it('gives each entry one sentence on one line', () => {
    for (const { text } of NEWS) {
      expect(text).toMatch(/^[A-Z].*\.$/);
      expect(text).not.toMatch(/\n/);
    }
  });

  it('does not name the app, which is set in one place', () => {
    for (const { text } of NEWS) expect(text).not.toMatch(/pixel net/i);
  });
});
