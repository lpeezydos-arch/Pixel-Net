import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/tokens.css', 'utf8');

function token(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`tokens.css has no hex color --${name}`);
  return match[1];
}

function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG contrast ratio between two token colors. */
function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(token(a)), luminance(token(b))].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const appCss = readFileSync('src/app.css', 'utf8');

function rgb(hex: string): number[] {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
}

function luminanceOf([r, g, b]: number[]): number {
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

describe('focus ring', () => {
  it('is the accent at a share that reaches 3:1 on every ground', () => {
    const declaration = appCss.match(/--ring:[^;]*var\(--accent\)\s+(\d+)%/);
    if (!declaration) throw new Error('app.css has no --ring declaration built from --accent');
    const alpha = Number(declaration[1]) / 100;
    const accent = rgb(token('accent'));
    for (const ground of ['paper', 'surface', 'sunken']) {
      const under = rgb(token(ground));
      const ring = accent.map((value, i) => alpha * value + (1 - alpha) * under[i]);
      const [light, dark] = [luminanceOf(ring), luminanceOf(under)].sort((x, y) => y - x);
      expect((light + 0.05) / (dark + 0.05), `ring on --${ground}`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('token contrast', () => {
  it('uses the rust accent', () => {
    expect(token('accent')).toBe('#b84a00');
    expect(token('accent-strong')).toBe('#8f3900');
  });

  it.each([
    ['ink-900', 'paper'],
    ['ink-900', 'surface'],
    ['ink-700', 'paper'],
    ['ink-700', 'sunken'],
    ['ink-500', 'paper'],
    ['ink-500', 'surface'],
    ['accent', 'paper'],
    ['accent-strong', 'paper'],
    ['paper', 'ink-900'],
  ])('text in --%s on --%s reaches 4.5:1', (text, ground) => {
    expect(contrast(text, ground)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['ink-400', 'paper'],
    ['accent', 'surface'],
  ])('a control in --%s on --%s reaches 3:1', (mark, ground) => {
    expect(contrast(mark, ground)).toBeGreaterThanOrEqual(3);
  });
});
