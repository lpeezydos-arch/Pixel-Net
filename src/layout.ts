export interface Layout {
  /** `portrait`: net above terrain. `wide`: terrain left of net. */
  mode: 'portrait' | 'wide';
  /** Where the readout sits inside the net card. */
  readout: 'side' | 'below';
  /** Space around the cards, and between them. */
  pad: number;
  gap: number;
  /** Padding inside the net card. */
  inner: number;
  netSize: number;
  netCardWidth: number;
  netCardHeight: number;
  terrainWidth: number;
  terrainHeight: number;
}

export const CAPTION_HEIGHT = 18;
export const CAPTION_GAP = 8;
export const HEADER_HEIGHT = 56; // --header-h: the title bar above the stage
const MIN_NET = 180;
const MAX_COLUMN = 520;
const READOUT_SIDE = 76; // width of the readout column beside the net
const READOUT_BELOW = 78; // height of the readout row under the net, with its gap
const WIDE_FROM = 720;

const whole = (value: number) => Math.max(0, Math.floor(value));

/**
 * Sizes that make the net card, the terrain card and the caption fill a
 * `width` × `height` area (the viewport minus the title bar) without scrolling. `aspect` is the DEM's width
 * divided by its height.
 */
export function computeLayout(width: number, height: number, aspect: number): Layout {
  if (width >= WIDE_FROM || width > height + HEADER_HEIGHT) return wideLayout(width, height, aspect);

  const pad = 12;
  const gap = 12;
  const inner = 12;
  const cardWidth = whole(width - 2 * pad);
  const netMax = whole(cardWidth - 2 * inner - gap - READOUT_SIDE);
  // Height left for the net and the terrain after everything of fixed size.
  const free = height - 2 * pad - gap - CAPTION_GAP - CAPTION_HEIGHT - 2 * inner;

  let terrainWidth = cardWidth;
  let terrainHeight = whole(terrainWidth / aspect);
  let netSize = Math.min(netMax, whole(free - terrainHeight));
  if (netSize < MIN_NET) {
    // The net has shrunk as far as it may; the terrain gives up the rest.
    netSize = Math.min(netMax, MIN_NET, whole(free));
    terrainHeight = whole(free - netSize);
    terrainWidth = Math.min(cardWidth, whole(terrainHeight * aspect));
    terrainHeight = Math.min(terrainHeight, whole(terrainWidth / aspect));
  }

  return {
    mode: 'portrait',
    readout: 'side',
    pad,
    gap,
    inner,
    netSize,
    netCardWidth: cardWidth,
    netCardHeight: netSize + 2 * inner,
    terrainWidth,
    terrainHeight,
  };
}

function wideLayout(width: number, height: number, aspect: number): Layout {
  const short = height < 480;
  const pad = short ? 12 : 24;
  const gap = pad;
  const inner = short ? 12 : 16;
  const column = Math.min(MAX_COLUMN, whole((width - 2 * pad - gap) / 2));
  const room = height - 2 * pad - CAPTION_GAP - CAPTION_HEIGHT;

  const terrainWidth = Math.min(column, whole(room * aspect));
  const terrainHeight = Math.min(whole(room), whole(terrainWidth / aspect));
  const netCardHeight = terrainHeight;

  if (short) {
    const netSize = whole(
      Math.min(netCardHeight - 2 * inner, column - 2 * inner - gap - READOUT_SIDE),
    );
    return {
      mode: 'wide',
      readout: 'side',
      pad,
      gap,
      inner,
      netSize,
      netCardWidth: Math.min(column, netSize + 2 * inner + gap + READOUT_SIDE),
      netCardHeight,
      terrainWidth,
      terrainHeight,
    };
  }

  const netCardWidth = Math.min(column, Math.max(terrainWidth, whole(column * 0.6)));
  const netSize = whole(
    Math.min(netCardWidth - 2 * inner, netCardHeight - 2 * inner - READOUT_BELOW),
  );
  return {
    mode: 'wide',
    readout: 'below',
    pad,
    gap,
    inner,
    netSize,
    netCardWidth,
    netCardHeight,
    terrainWidth,
    terrainHeight,
  };
}
