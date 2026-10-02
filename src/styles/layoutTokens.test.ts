import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CAPTION_GAP, CAPTION_HEIGHT, HEADER_HEIGHT } from '../layout';

const tokens = readFileSync('src/styles/tokens.css', 'utf8');
const styles = readFileSync('src/app.css', 'utf8');

/** Pixel value of a custom property, following one `var(--token)` reference. */
function pixels(css: string, name: string): number {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`--${name} is not declared`);
  const reference = match[1].trim().match(/^var\(--([\w-]+)\)$/);
  return reference ? pixels(tokens, reference[1]) : parseFloat(match[1]);
}

describe('sizes shared by layout.ts and the stylesheets', () => {
  it('uses one caption height', () => {
    expect(pixels(styles, 'caption-height')).toBe(CAPTION_HEIGHT);
  });

  it('uses one gap between the terrain and its caption', () => {
    expect(pixels(styles, 'caption-gap')).toBe(CAPTION_GAP);
  });

  it('uses the title bar height from the tokens', () => {
    expect(pixels(tokens, 'header-h')).toBe(HEADER_HEIGHT);
  });
});
