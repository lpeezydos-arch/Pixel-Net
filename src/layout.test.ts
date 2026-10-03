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

  it('puts the cards side by side on a laptop, each half the width', () => {
    const l = computeLayout(1280, 744, GORE);
    expect(l.mode).toBe('wide');
    expect(l.readout).toBe('below');
    expect(l.terrainWidth).toBe(604);
    expect(l.netCardWidth).toBe(604);
    expect(l.netCardHeight).toBe(l.terrainHeight);
    expect(l.netSize).toBeGreaterThan(480);
  });

  it('lets the cards grow on a monitor, up to 760px', () => {
    const monitor = computeLayout(1920, 968, GORE);
    expect(monitor.mode).toBe('wide');
    expect(monitor.terrainWidth).toBe(760);
    expect(monitor.netCardWidth).toBe(760);
    expect(monitor.netSize).toBeGreaterThan(640);
    const laptop = computeLayout(1440, 844, GORE);
    expect(laptop.terrainWidth).toBe(684);
    expect(laptop.netSize).toBeGreaterThan(560);
  });

  it('puts the cards side by side on a phone turned sideways', () => {
    const l = computeLayout(844, 334, GORE);
    expect(l.mode).toBe('wide');
    expect(l.readout).toBe('side');
    expect(l.netSize).toBeGreaterThanOrEqual(180);
  });

  it('stays stacked on a tablet or a narrow window when stacking gives the larger cards', () => {
    expect(computeLayout(719, 944, GORE).mode).toBe('portrait');
    expect(computeLayout(720, 944, GORE).mode).toBe('portrait');
    expect(computeLayout(768, 968, GORE).mode).toBe('portrait');
    // A short, wide window is still side by side.
    expect(computeLayout(720, 500, GORE).mode).toBe('wide');
  });

  it('moves the readout under the net on a tall phone instead of leaving empty bands', () => {
    const l = computeLayout(412, 859, GORE);
    expect(l.mode).toBe('portrait');
    expect(l.readout).toBe('below');
    expect(l.terrainWidth).toBe(388);
    expect(l.netSize).toBe(299);
    expect(contentHeight(412, 859)).toBe(859);
  });

  it('keeps the readout beside the net when moving it would not fill the screen', () => {
    const l = computeLayout(412, 783, GORE);
    expect(l.readout).toBe('side');
    expect(l.netSize).toBe(276);
  });

  it('shares the column on a tablet held upright, with the two cards the same width', () => {
    const l = computeLayout(768, 968, GORE);
    expect(l.mode).toBe('portrait');
    expect(l.readout).toBe('side');
    expect(l.netCardWidth).toBe(l.terrainWidth);
    expect(l.terrainWidth).toBeGreaterThan(480);
    expect(l.netSize).toBeGreaterThan(360);
    expect(contentHeight(768, 968)).toBeLessThanOrEqual(968);
  });

  it('keeps the two cards the same width in a narrow upright window', () => {
    const l = computeLayout(720, 844, GORE);
    expect(l.mode).toBe('portrait');
    expect(l.netCardWidth).toBe(l.terrainWidth);
    expect(l.terrainWidth).toBeGreaterThan(400);
    expect(l.netSize).toBeGreaterThan(300);
  });

  it('keeps the terrain across the whole screen of a phone', () => {
    for (const [width, height] of [[360, 684], [412, 783], [412, 859]]) {
      expect(computeLayout(width, height, GORE).terrainWidth, `${width}×${height}`).toBe(width - 24);
    }
  });

  it('keeps the net card and the terrain the same width when the terrain has shrunk', () => {
    const l = computeLayout(375, 591, GORE);
    expect(l.terrainWidth).toBeLessThan(351);
    expect(l.netCardWidth).toBe(l.terrainWidth);
  });

  it('judges landscape by the viewport, not by the area under the title bar', () => {
    // A 400 × 450 window is portrait; under a 56px title bar its stage is 400 × 394.
    expect(computeLayout(400, 394, GORE).mode).toBe('portrait');
    // A phone on its side is still wide.
    expect(computeLayout(844, 334, GORE).mode).toBe('wide');
  });

  it('never needs more room than it was given', () => {
    const sizes = [
      [320, 480], [360, 684], [375, 591], [390, 763], [412, 783], [412, 859], [430, 870],
      [600, 900], [667, 319], [844, 334], [720, 944], [720, 1000], [768, 968], [1024, 712],
      [1280, 744], [1440, 844], [1920, 968], [2560, 1384],
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
