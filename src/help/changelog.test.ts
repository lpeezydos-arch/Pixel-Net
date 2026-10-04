import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NEWS, formatDate } from './news';

const made = () => execFileSync(process.execPath, ['scripts/make-changelog.mjs', '--print'], { encoding: 'utf8' });

describe('CHANGELOG.md', () => {
  it('is what the list makes; run `npm run changelog` after adding an entry', () => {
    expect(readFileSync('CHANGELOG.md', 'utf8')).toBe(made());
  });

  it('holds every entry, newest first', () => {
    const text = made();
    const places = NEWS.map((entry) => text.indexOf(`- ${entry.text}\n`));
    for (const place of places) expect(place).toBeGreaterThan(-1);
    expect(places).toEqual([...places].sort((a, b) => b - a));
  });

  it('heads each day once, written the way the sheet writes it', () => {
    const text = made();
    for (const date of new Set(NEWS.map((entry) => entry.date))) {
      expect(text.split(`\n## ${formatDate(date)}\n`)).toHaveLength(2);
    }
  });
});
