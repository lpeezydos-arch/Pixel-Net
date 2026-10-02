export interface Dem {
  width: number;
  height: number;
  /** Ground size of one pixel, in meters. */
  cellSize: number;
  /** Elevations in meters, row by row starting at the north edge. */
  elevation: Float32Array;
  /** 1 where the pixel has no data. */
  nodata: Uint8Array;
}

export interface Surface {
  width: number;
  height: number;
  /** Degrees from horizontal, 0 to 90. */
  slope: Float32Array;
  /** Downhill direction in degrees clockwise from north. NaN when flat or no-data. */
  aspect: Float32Array;
  /** Unit upward normal: east, north and up components. */
  nx: Float32Array;
  ny: Float32Array;
  nz: Float32Array;
  /** 1 where the pixel has no slope direction. */
  flat: Uint8Array;
  /** 1 where the pixel has no data. */
  nodata: Uint8Array;
}

export interface Sun {
  /** Direction the light comes from, in degrees clockwise from north. */
  azimuth: number;
  /** Degrees above the horizon. */
  altitude: number;
}

export interface Pixel {
  col: number;
  row: number;
}
