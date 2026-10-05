import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseDem } from '../terrain/dem';
import type { DemEntry } from './useDems';

const FOLDER = 'public/dems/';
const entries: DemEntry[] = JSON.parse(readFileSync(`${FOLDER}dems.json`, 'utf8'));

// The picker states a DEM's pixel size from the list, not from the file, so
// the list is held to the files here. Unit tests gate the deploy.
describe('public/dems/dems.json', () => {
  // A new visitor opens on the first DEM in the list.
  it('ships Gore Range first, and Massanutten with it', () => {
    const ids = entries.map((entry) => entry.id);
    expect(ids[0]).toBe('gore');
    expect(ids).toContain('massanutten');
  });

  it('gives every DEM its own id', () => {
    const ids = entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const entry of entries) {
    // The three are optional in the list; one that is given must be true.
    it(`${entry.id}: any dimensions and pixel size it states are its file's`, async () => {
      const file = readFileSync(`${FOLDER}${entry.file}`);
      const dem = await parseDem(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
      const actual = { width: dem.width, height: dem.height, cell: Number(dem.cellSize.toFixed(2)) };
      for (const key of ['width', 'height', 'cell'] as const) {
        if (entry[key] !== undefined) expect(entry[key], key).toBe(actual[key]);
      }
    });

    it(`${entry.id}: has a thumbnail; run \`npm run thumbs\` after adding a DEM`, () => {
      expect(existsSync(`${FOLDER}${entry.id}.png`)).toBe(true);
    });
  }
});
