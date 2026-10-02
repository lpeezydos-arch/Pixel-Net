import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LOUPE_SIZE } from '../components/loupePlacement';
import { NET_RIM } from '../terrain/cloud';
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

/** The declarations of the first rule with this selector in app.css. */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = styles.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`app.css has no rule for ${selector}`);
  return match[1];
}

function declared(selector: string, property: string): string {
  const match = rule(selector).match(new RegExp(`(?:^|[\\s;])${property}:\\s*([^;]+);`));
  if (!match) throw new Error(`${selector} does not declare ${property}`);
  return match[1].trim();
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

  it('draws the loupe lens at the size the placement code assumes', () => {
    expect(declared('.loupe__lens', 'width')).toBe(`${LOUPE_SIZE}px`);
    expect(declared('.loupe__lens', 'height')).toBe(`${LOUPE_SIZE}px`);
  });

  it('insets the net skeleton by the share the rim leaves free', () => {
    expect(parseFloat(declared('.net .net__skeleton', 'inset'))).toBeCloseTo(((1 - NET_RIM) / 2) * 100, 6);
  });
});
