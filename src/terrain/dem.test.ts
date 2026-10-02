import { readFileSync } from 'node:fs';
import { writeArrayBuffer } from 'geotiff';
import { describe, expect, it } from 'vitest';
import { DemError, parseDem } from './dem';

const METERS = {
  width: 4,
  height: 3,
  GTModelTypeGeoKey: 1,
  ProjectedCSTypeGeoKey: 32613,
  ProjLinearUnitsGeoKey: 9001,
  ModelPixelScale: [5, 5, 0],
  ModelTiepoint: [0, 0, 0, 500000, 4400000, 0],
};

function fixture(overrides: Record<string, unknown> = {}, values?: Float32Array | Uint16Array) {
  const data = values ?? Float32Array.from({ length: 12 }, (_, i) => 100 + i);
  return writeArrayBuffer(data, { ...METERS, ...overrides });
}

async function reasonOf(buffer: ArrayBuffer): Promise<string> {
  try {
    await parseDem(buffer);
    return 'accepted';
  } catch (error) {
    return error instanceof DemError ? error.reason : `unexpected: ${String(error)}`;
  }
}

describe('parseDem', () => {
  it('reads the Gore Range sample', async () => {
    const file = readFileSync('public/dems/gore.tif');
    const dem = await parseDem(
      file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer,
    );
    expect(dem.width).toBe(288);
    expect(dem.height).toBe(294);
    expect(dem.cellSize).toBe(5);
    expect(dem.elevation).toHaveLength(288 * 294);
    let min = Infinity;
    let max = -Infinity;
    let missing = 0;
    for (let i = 0; i < dem.elevation.length; i++) {
      min = Math.min(min, dem.elevation[i]);
      max = Math.max(max, dem.elevation[i]);
      missing += dem.nodata[i];
    }
    expect(min).toBeCloseTo(3378.7, 1);
    expect(max).toBeCloseTo(4054.6, 1);
    expect(missing).toBe(0);
  });

  it('reads a small projected DEM in row order', async () => {
    const dem = await parseDem(fixture());
    expect([dem.width, dem.height, dem.cellSize]).toEqual([4, 3, 5]);
    expect(Array.from(dem.elevation.slice(0, 5))).toEqual([100, 101, 102, 103, 104]);
  });

  it('converts integer elevations to floats', async () => {
    // Unsigned, because geotiff's writer does not round-trip signed integers.
    const dem = await parseDem(fixture({}, Uint16Array.from({ length: 12 }, (_, i) => 200 + i)));
    expect(dem.elevation).toBeInstanceOf(Float32Array);
    expect(dem.elevation[11]).toBe(211);
  });

  it('marks the no-data value and NaN as no data', async () => {
    const values = Float32Array.from({ length: 12 }, (_, i) => 100 + i);
    values[2] = -9999;
    values[7] = NaN;
    const dem = await parseDem(fixture({ GDAL_NODATA: '-9999' }, values));
    expect(Array.from(dem.nodata)).toEqual([0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0]);
  });

  it('rejects a DEM in degrees', async () => {
    const buffer = fixture({
      GTModelTypeGeoKey: 2,
      GeographicTypeGeoKey: 4326,
      ProjectedCSTypeGeoKey: undefined,
      ProjLinearUnitsGeoKey: undefined,
      ModelPixelScale: [0.0001, 0.0001, 0],
    });
    expect(await reasonOf(buffer)).toBe('units');
  });

  it('rejects a projected DEM in feet', async () => {
    expect(await reasonOf(fixture({ ProjLinearUnitsGeoKey: 9003 }))).toBe('units');
  });

  it('rejects a projected DEM that does not state its units', async () => {
    expect(await reasonOf(fixture({ ProjLinearUnitsGeoKey: undefined }))).toBe('units');
  });

  it('rejects cells that are not square', async () => {
    expect(await reasonOf(fixture({ ModelPixelScale: [5, 10, 0] }))).toBe('units');
  });

  it('accepts cells that are square to within 0.1%', async () => {
    expect(await reasonOf(fixture({ ModelPixelScale: [5, 5.004, 0] }))).toBe('accepted');
  });

  it('rejects a file that is not a GeoTIFF', async () => {
    const html = new TextEncoder().encode('<!doctype html><html></html>');
    expect(await reasonOf(html.buffer as ArrayBuffer)).toBe('load');
  });

  it('rejects an empty file', async () => {
    expect(await reasonOf(new ArrayBuffer(0))).toBe('load');
  });
});
