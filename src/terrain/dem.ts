import { fromArrayBuffer } from 'geotiff';
import type { Dem } from './types';

/** `load`: could not be fetched or read. `units`: not meters with square cells. */
export type DemErrorReason = 'load' | 'units';

export class DemError extends Error {
  readonly reason: DemErrorReason;

  constructor(reason: DemErrorReason, message: string) {
    super(message);
    this.name = 'DemError';
    this.reason = reason;
  }
}

const PROJECTED = 1; // GTModelTypeGeoKey
const METERS = 9001; // ProjLinearUnitsGeoKey
const SQUARE_TOLERANCE = 0.001;

export async function parseDem(buffer: ArrayBuffer): Promise<Dem> {
  let image;
  let raster;
  try {
    const tiff = await fromArrayBuffer(buffer);
    image = await tiff.getImage();
    raster = await image.readRasters({ interleave: true, samples: [0] });
  } catch {
    throw new DemError('load', 'The file is not a readable GeoTIFF.');
  }

  const keys = image.getGeoKeys();
  if (keys?.GTModelTypeGeoKey !== PROJECTED || keys.ProjLinearUnitsGeoKey !== METERS) {
    throw new DemError('units', 'The DEM is not in a projected coordinate system in meters.');
  }

  let resolution: number[];
  try {
    resolution = image.getResolution();
  } catch {
    throw new DemError('units', 'The DEM does not state its pixel size.');
  }
  const cellX = Math.abs(resolution[0]);
  const cellY = Math.abs(resolution[1]);
  const valid = Number.isFinite(cellX) && Number.isFinite(cellY) && cellX > 0 && cellY > 0;
  if (!valid || !(Math.abs(cellX - cellY) / cellX <= SQUARE_TOLERANCE)) {
    throw new DemError('units', 'The DEM does not have square cells.');
  }

  const elevation =
    raster instanceof Float32Array ? raster : Float32Array.from(raster as ArrayLike<number>);
  const tag = image.getGDALNoData();
  // The pixels are float32, so compare with the float32 nearest to the tag.
  const missing = tag === null ? null : Math.fround(tag);
  const nodata = new Uint8Array(elevation.length);
  for (let i = 0; i < elevation.length; i++) {
    if (Number.isNaN(elevation[i]) || (missing !== null && elevation[i] === missing)) nodata[i] = 1;
  }

  return {
    width: image.getWidth(),
    height: image.getHeight(),
    cellSize: cellX,
    elevation,
    nodata,
  };
}

export async function loadDem(url: string): Promise<Dem> {
  let buffer: ArrayBuffer;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    buffer = await response.arrayBuffer();
  } catch {
    throw new DemError('load', `Could not fetch ${url}.`);
  }
  return parseDem(buffer);
}
