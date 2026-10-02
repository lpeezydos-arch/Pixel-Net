import { describe, expect, it } from 'vitest';
import { LOUPE_LIFT, LOUPE_SIZE, loupeCenter } from './loupePlacement';

const HALF = LOUPE_SIZE / 2;
const BOX = 336;

describe('loupeCenter', () => {
  it('sits above the touch point when there is room', () => {
    expect(loupeCenter(168, 245, BOX)).toEqual({ x: 168, y: 245 - LOUPE_LIFT });
  });

  it('moves beside the touch point near the top edge, toward the side with room', () => {
    expect(loupeCenter(100, 40, BOX)).toEqual({ x: 100 + LOUPE_LIFT, y: HALF });
    expect(loupeCenter(260, 40, BOX)).toEqual({ x: 260 - LOUPE_LIFT, y: HALF });
    expect(loupeCenter(100, 100, BOX)).toEqual({ x: 100 + LOUPE_LIFT, y: 100 });
  });

  it('stays inside the box at the left and right edges', () => {
    expect(loupeCenter(5, 245, BOX).x).toBe(HALF);
    expect(loupeCenter(333, 245, BOX).x).toBe(BOX - HALF);
  });

  it('is never clipped by the top of the box', () => {
    for (let y = 0; y <= 343; y += 7) {
      for (let x = 0; x <= BOX; x += 12) {
        const center = loupeCenter(x, y, BOX);
        expect(center.y - HALF).toBeGreaterThanOrEqual(0);
        expect(center.x - HALF).toBeGreaterThanOrEqual(0);
        expect(center.x + HALF).toBeLessThanOrEqual(BOX);
      }
    }
  });

  it('does not cover the touch point', () => {
    for (let y = 0; y <= 343; y += 7) {
      for (let x = 60; x <= BOX - 60; x += 12) {
        const center = loupeCenter(x, y, BOX);
        expect(Math.hypot(center.x - x, center.y - y)).toBeGreaterThan(HALF);
      }
    }
  });
});
