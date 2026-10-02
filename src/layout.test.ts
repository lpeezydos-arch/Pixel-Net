import { describe, expect, it } from 'vitest';
import { computeLayout } from './layout';

const GORE = 288 / 294;

/** Height the laid-out content needs, including its padding. */
function contentHeight(width: number, height: number, aspect = GORE): number {
  const l = computeLayout(width, height, aspect);
  const terrainColumn = l.terrainHeight + 8 + 18;
  return l.mode === 'portrait'
    ? 2 * l.pad + l.netCardHeight + l.gap + terrainColumn
    : 2 * l.pad + Math.max(l.netCardHeight, terrainColumn);
}

function contentWidth(width: number, height: number, aspect = GORE): number {
  const l = computeLayout(width, height, aspect);
  return l.mode === 'portrait'
    ? 2 * l.pad + Math.max(l.netCardWidth, l.terrainWidth)
    : 2 * l.pad + l.terrainWidth + l.gap + l.netCardWidth;
}

describe('computeLayout', () => {
  it('stacks the net above full-width terrain on a tall phone', () => {
    const l = computeLayout(360, 684, GORE);
    expect(l.mode).toBe('portrait');
    expect(l.readout).toBe('side');
    expect(l.terrainWidth).toBe(336);
    expect(l.terrainHeight).toBe(343);
    expect(l.netSize).toBe(224);
    expect(l.netCardWidth).toBe(336);
    expect(l.netCardHeight).toBe(248);
  });

  it('shrinks the terrain, not the net, once the net reaches 180px', () => {
    const l = computeLayout(375, 591, GORE);
    expect(l.netSize).toBe(180);
    expect(l.terrainWidth).toBeLessThan(351);
    expect(l.terrainWidth / l.terrainHeight).toBeCloseTo(GORE, 1);
  });

  it('puts the cards side by side on a wide screen', () => {
    const l = computeLayout(1280, 744, GORE);
    expect(l.mode).toBe('wide');
    expect(l.readout).toBe('below');
    expect(l.terrainWidth).toBe(520);
    expect(l.netCardWidth).toBe(520);
    expect(l.netCardHeight).toBe(l.terrainHeight);
    expect(l.netSize).toBeGreaterThan(380);
  });

  it('puts the cards side by side on a phone turned sideways', () => {
    const l = computeLayout(844, 334, GORE);
    expect(l.mode).toBe('wide');
    expect(l.readout).toBe('side');
    expect(l.netSize).toBeGreaterThanOrEqual(180);
  });

  it('switches to side by side at 720px wide even when taller than wide', () => {
    expect(computeLayout(719, 1000, GORE).mode).toBe('portrait');
    expect(computeLayout(720, 1000, GORE).mode).toBe('wide');
  });

  it('never needs more room than it was given', () => {
    const sizes = [
      [320, 480], [360, 684], [375, 591], [390, 763], [412, 783], [430, 870],
      [667, 319], [844, 334], [720, 1000], [768, 968], [1024, 712], [1280, 744], [1920, 1024],
    ];
    for (const [width, height] of sizes) {
      for (const aspect of [GORE, 0.5, 1, 2]) {
        expect(contentHeight(width, height, aspect), `${width}×${height} @${aspect}`).toBeLessThanOrEqual(height);
        expect(contentWidth(width, height, aspect), `${width}×${height} @${aspect}`).toBeLessThanOrEqual(width);
      }
    }
  });

  it('returns whole, non-negative sizes for any input', () => {
    for (const [width, height] of [[0, 0], [100, 50], [50, 100], [360, 200]]) {
      const l = computeLayout(width, height, GORE);
      for (const value of [l.netSize, l.netCardWidth, l.netCardHeight, l.terrainWidth, l.terrainHeight]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(value)).toBe(true);
      }
    }
  });
});
