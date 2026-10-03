/**
 * Where everything goes in the picture that is shared. Sizes are in image
 * pixels and do not depend on the screen. This file imports nothing, so the
 * browser tests can use it to know what size to expect.
 */

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CardLayout {
  width: number;
  height: number;
  terrain: Box;
  /** The square the net is drawn in. */
  net: Box;
  /** The caption: its left edge, the width a line may take, and each line's box. */
  caption: { x: number; width: number; lines: Array<{ y: number; height: number }> };
}

interface CardOptions {
  /** The screen's arrangement, which the picture follows. */
  mode: 'portrait' | 'wide';
  /** The DEM's width divided by its height. */
  aspect: number;
  /** Heights of the caption's lines, top to bottom. */
  lines: number[];
}

const CARD_SIDE = 720; // the net's side; the terrain's height side by side, its width stacked
const CARD_LIMIT = 1440; // the longest a terrain side may be
const CARD_PAD = 48; // space around
const CARD_GAP = 40; // space between the terrain and the net
const CAPTION_GAP = 28; // space above the caption

export function cardLayout({ mode, aspect, lines }: CardOptions): CardLayout {
  const wide = mode === 'wide';
  const shape = aspect > 0 ? aspect : 1;

  // One side of the terrain matches the net; the other follows the DEM's
  // shape, up to the limit. A terrain at the limit is scaled to fit.
  let terrainWidth = wide ? Math.round(CARD_SIDE * shape) : CARD_SIDE;
  let terrainHeight = wide ? CARD_SIDE : Math.round(CARD_SIDE / shape);
  if (terrainWidth > CARD_LIMIT) {
    terrainWidth = CARD_LIMIT;
    terrainHeight = Math.round(CARD_LIMIT / shape);
  }
  if (terrainHeight > CARD_LIMIT) {
    terrainHeight = CARD_LIMIT;
    terrainWidth = Math.round(CARD_LIMIT * shape);
  }
  terrainWidth = Math.max(1, terrainWidth);
  terrainHeight = Math.max(1, terrainHeight);

  const contentWidth = wide ? terrainWidth + CARD_GAP + CARD_SIDE : CARD_SIDE;
  const contentHeight = wide ? CARD_SIDE : CARD_SIDE + CARD_GAP + terrainHeight;

  // A terrain smaller than its place is centered beside, or under, the net.
  const terrain: Box = wide
    ? {
        x: CARD_PAD,
        y: CARD_PAD + Math.round((CARD_SIDE - terrainHeight) / 2),
        width: terrainWidth,
        height: terrainHeight,
      }
    : {
        x: CARD_PAD + Math.round((CARD_SIDE - terrainWidth) / 2),
        y: CARD_PAD + CARD_SIDE + CARD_GAP,
        width: terrainWidth,
        height: terrainHeight,
      };
  const net: Box = {
    x: wide ? CARD_PAD + terrainWidth + CARD_GAP : CARD_PAD,
    y: CARD_PAD,
    width: CARD_SIDE,
    height: CARD_SIDE,
  };

  let y = CARD_PAD + contentHeight + CAPTION_GAP;
  const captionLines = lines.map((height) => {
    const line = { y, height };
    y += height;
    return line;
  });

  return {
    width: 2 * CARD_PAD + contentWidth,
    height: y + CARD_PAD,
    terrain,
    net,
    caption: { x: CARD_PAD, width: contentWidth, lines: captionLines },
  };
}
