import { describe, expect, it } from 'vitest';
import { pixelAt, stepPixel, toIndex, toPixel } from './pick';

describe('pixelAt', () => {
  it('finds the pixel under a point', () => {
    // A 288 × 294 DEM shown in a 336 × 343 box.
    expect(pixelAt(0, 0, 336, 343, 288, 294)).toEqual({ col: 0, row: 0 });
    expect(pixelAt(175.6, 245.6, 336, 343, 288, 294)).toEqual({ col: 150, row: 210 });
    expect(pixelAt(335.9, 342.9, 336, 343, 288, 294)).toEqual({ col: 287, row: 293 });
  });

  it('picks the nearest edge pixel for a point outside the box', () => {
    expect(pixelAt(-40, 100, 336, 343, 288, 294).col).toBe(0);
    expect(pixelAt(900, 100, 336, 343, 288, 294).col).toBe(287);
    expect(pixelAt(100, -5, 336, 343, 288, 294).row).toBe(0);
    expect(pixelAt(100, 343, 336, 343, 288, 294).row).toBe(293);
  });

  it('does not fail for a box with no size or a point that is not a number', () => {
    expect(pixelAt(10, 10, 0, 0, 288, 294)).toEqual({ col: 0, row: 0 });
    expect(pixelAt(NaN, NaN, 336, 343, 288, 294)).toEqual({ col: 0, row: 0 });
  });
});

describe('stepPixel', () => {
  const at = { col: 150, row: 210 };

  it('moves one pixel per arrow key', () => {
    expect(stepPixel(at, 'ArrowLeft', false, 288, 294)).toEqual({ col: 149, row: 210 });
    expect(stepPixel(at, 'ArrowRight', false, 288, 294)).toEqual({ col: 151, row: 210 });
    expect(stepPixel(at, 'ArrowUp', false, 288, 294)).toEqual({ col: 150, row: 209 });
    expect(stepPixel(at, 'ArrowDown', false, 288, 294)).toEqual({ col: 150, row: 211 });
  });

  it('moves ten pixels with Shift', () => {
    expect(stepPixel(at, 'ArrowRight', true, 288, 294)).toEqual({ col: 160, row: 210 });
  });

  it('stops at the edges', () => {
    expect(stepPixel({ col: 0, row: 0 }, 'ArrowLeft', true, 288, 294)).toEqual({ col: 0, row: 0 });
    expect(stepPixel({ col: 285, row: 293 }, 'ArrowRight', true, 288, 294)).toEqual({ col: 287, row: 293 });
    expect(stepPixel({ col: 285, row: 293 }, 'ArrowDown', false, 288, 294)).toEqual({ col: 285, row: 293 });
  });

  it('starts from the center pixel when nothing is selected', () => {
    expect(stepPixel(null, 'ArrowLeft', false, 288, 294)).toEqual({ col: 144, row: 147 });
  });

  it('ignores other keys', () => {
    expect(stepPixel(at, 'Enter', false, 288, 294)).toBeNull();
    expect(stepPixel(null, 'a', false, 288, 294)).toBeNull();
  });
});

describe('toIndex and toPixel', () => {
  it('convert between a pixel and its place in the arrays', () => {
    expect(toIndex({ col: 150, row: 210 }, 288)).toBe(60630);
    expect(toPixel(60630, 288)).toEqual({ col: 150, row: 210 });
  });
});
