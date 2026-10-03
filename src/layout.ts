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
const SPAN_UP_TO = 520; // a screen this wide or narrower is a phone: the cards span it
const MAX_COLUMN = 760; // the widest a card gets on a monitor
const READOUT_SIDE = 76; // width of the readout column beside the net
const READOUT_BELOW = 78; // height of the readout row under the net, with its gap

const whole = (value: number) => Math.max(0, Math.floor(value));

/** The smaller of the two cards: what a layout is judged by. */
const smallerCard = (layout: Layout) => Math.min(layout.netSize, layout.terrainWidth);

/**
 * Sizes that make the net card, the terrain card and the caption fill a
 * `width` × `height` area (the viewport minus the title bar) without
 * scrolling. `aspect` is the DEM's width divided by its height.
 *
 * A landscape viewport puts the cards side by side. An upright one takes
 * whichever arrangement gives the larger smaller card: a phone stacks them,
 * and so does a tablet held upright, rather than two small cards with most
 * of the screen empty.
 */
export function computeLayout(width: number, height: number, aspect: number): Layout {
  if (width > height + HEADER_HEIGHT) return wideLayout(width, height, aspect);
  const stacked = portraitLayout(width, height, aspect);
  const wide = wideLayout(width, height, aspect);
  return smallerCard(wide) > smallerCard(stacked) ? wide : stacked;
}

function portraitLayout(width: number, height: number, aspect: number): Layout {
  const pad = 12;
  const gap = 12;
  const inner = 12;
  const cardWidth = Math.min(MAX_COLUMN, whole(width - 2 * pad));
  // On a phone the cards span the screen. In a wider window they float in a
  // column, and the column is shared so the net is as large as the terrain
  // allows instead of the terrain taking it all.
  const spans = width - 2 * pad <= SPAN_UP_TO;
  // Height left for the net and the terrain after everything of fixed size.
  const free = height - 2 * pad - gap - CAPTION_GAP - CAPTION_HEIGHT - 2 * inner;

  let readout: Layout['readout'] = 'side';
  const beside = 2 * inner + gap + READOUT_SIDE; // what the net card adds around the net
  const netBeside = whole(cardWidth - beside);
  let terrainWidth = spans ? cardWidth : sharedTerrainWidth(cardWidth, free, aspect, beside);
  let terrainHeight = whole(terrainWidth / aspect);
  let netSize = Math.min(netBeside, whole(free - terrainHeight));
  // In a shared column the net card is exactly as wide as the terrain.
  if (!spans) netSize = Math.min(netSize, terrainWidth - beside);

  // The readout moves under the net when leaving it beside the net would
  // leave more than half a readout row of the screen empty; the net grows
  // into that room instead.
  const empty = free - terrainHeight - netSize;
  const netBelow = Math.min(whole(cardWidth - 2 * inner), whole(free - READOUT_BELOW - terrainHeight));
  if (empty > READOUT_BELOW / 2 && netBelow >= MIN_NET) {
    readout = 'below';
    netSize = netBelow;
  } else if (netSize < MIN_NET) {
    // The net has shrunk as far as it may; the terrain gives up the rest.
    netSize = Math.min(netBeside, MIN_NET, whole(free));
    terrainHeight = whole(free - netSize);
    terrainWidth = Math.min(cardWidth, whole(terrainHeight * aspect));
    terrainHeight = Math.min(terrainHeight, whole(terrainWidth / aspect));
  }

  const readoutWidth = readout === 'side' ? gap + READOUT_SIDE : 0;
  const readoutHeight = readout === 'below' ? READOUT_BELOW : 0;
  return {
    mode: 'portrait',
    readout,
    pad,
    gap,
    inner,
    netSize,
    // No wider than the terrain, so the two cards share their edges.
    netCardWidth: Math.min(cardWidth, Math.max(terrainWidth, netSize + 2 * inner + readoutWidth)),
    netCardHeight: netSize + 2 * inner + readoutHeight,
    terrainWidth,
    terrainHeight,
  };
}

/**
 * The terrain width that makes the two cards the same width in a shared
 * column: the net card is the net plus `beside` (its padding and the readout
 * next to it), and the two cards together fill the `free` height.
 */
function sharedTerrainWidth(cardWidth: number, free: number, aspect: number, beside: number): number {
  return Math.min(cardWidth, whole(((free + beside) * aspect) / (aspect + 1)));
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
