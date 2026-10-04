import { NET_RIM, cloudAlpha } from '../terrain/cloud';
import { type DensityField, densityAlpha, densityCaption, densityLevels, densityOf } from '../terrain/density';
import { readoutFor } from '../terrain/format';
import { shade } from '../terrain/hillshade';
import { RING_30, RING_60, sunToNet, toNet } from '../terrain/net';
import { toPixel } from '../terrain/pick';
import type { Dem, Sun, Surface } from '../terrain/types';
import { type Box, type CardLayout, cardLayout } from './cardLayout';
import { type CaptionLine, captionLines, fileName, siteName } from './text';

/** The picture's lines, dots and letters are the screen's, this much larger. */
const K = 1.5;
const TURN = 2 * Math.PI;
const SMALLEST_TYPE = 12; // a caption line is not set smaller than this
/** The rays of lucide's sun, in its 24-unit box. The disc is drawn as a circle. */
const SUN_RAYS =
  'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41';

/** The token colors the picture is drawn in. */
export interface CardPalette {
  paper: string;
  ink900: string;
  ink500: string;
  line: string;
  lineStrong: string;
  accent: string;
  /** The density layer's color. */
  density: string;
}

export interface CardInput {
  layout: CardLayout;
  surface: Surface;
  sun: Sun;
  /** Index of the selected pixel, or −1. */
  selection: number;
  /** The density layer's field, or null when the layer is off. */
  density: DensityField | null;
  caption: CaptionLine[];
  palette: CardPalette;
  /** The page's font stack, as CSS writes it. */
  fontFamily: string;
}

type Context = CanvasRenderingContext2D;

/** The picture's colors, read from the page's own tokens. */
export function readPalette(): CardPalette {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim();
  return {
    paper: token('--paper'),
    ink900: token('--ink-900'),
    ink500: token('--ink-500'),
    line: token('--line'),
    lineStrong: token('--line-strong'),
    accent: token('--accent'),
    density: token('--viz-1'),
  };
}

function disc(context: Context, x: number, y: number, radius: number, color: string): void {
  context.beginPath();
  context.arc(x, y, radius, 0, TURN);
  context.fillStyle = color;
  context.fill();
}

/** A circle's outline, `width` thick, centered on `radius`. */
function band(context: Context, x: number, y: number, radius: number, width: number, color: string): void {
  context.beginPath();
  context.arc(x, y, radius, 0, TURN);
  context.lineWidth = width;
  context.strokeStyle = color;
  context.stroke();
}

/** A canvas of its own, for the picture or for an image drawn onto it. */
function scratch(width: number, height: number): [HTMLCanvasElement, Context] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser gave no 2D canvas.');
  return [canvas, context];
}

/** A square image in one color, as opaque in each cell as `alpha` says. */
function inked(alpha: Uint8ClampedArray, size: number, color: string): HTMLCanvasElement {
  const [canvas, context] = scratch(size, size);
  const image = context.createImageData(size, size);
  for (let cell = 0, o = 3; cell < alpha.length; cell++, o += 4) image.data[o] = alpha[cell];
  context.putImageData(image, 0, 0);
  context.globalCompositeOperation = 'source-in';
  context.fillStyle = color;
  context.fillRect(0, 0, size, size);
  return canvas;
}

function drawTerrain(context: Context, box: Box, { surface, sun, selection, palette }: CardInput): void {
  // One image pixel per DEM pixel, as on screen, then scaled up smoothly.
  const [source, sourceContext] = scratch(surface.width, surface.height);
  const image = sourceContext.createImageData(surface.width, surface.height);
  shade(surface, sun, image.data);
  sourceContext.putImageData(image, 0, 0);

  context.save();
  context.beginPath();
  // Older Safari has no roundRect. Square corners are better than no picture.
  if (typeof context.roundRect === 'function') context.roundRect(box.x, box.y, box.width, box.height, 12 * K);
  else context.rect(box.x, box.y, box.width, box.height);
  context.clip();
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, box.x, box.y, box.width, box.height);
  context.restore();

  if (selection < 0) return;
  const { col, row } = toPixel(selection, surface.width);
  const x = box.x + ((col + 0.5) / surface.width) * box.width;
  const y = box.y + ((row + 0.5) / surface.height) * box.height;
  // The screen's ring: a 3px accent band from 5px to 8px out, edged in paper on both sides.
  band(context, x, y, 6.5 * K, 6 * K, palette.paper);
  band(context, x, y, 6.5 * K, 3 * K, palette.accent);
}

function drawNet(
  context: Context,
  box: Box,
  { surface, sun, selection, density, palette, fontFamily }: CardInput,
): void {
  const size = box.width;
  const cx = box.x + size / 2;
  const cy = box.y + size / 2;
  const rim = (size / 2) * NET_RIM;

  // The frame, under the cloud: rim, slope rings and compass cross.
  disc(context, cx, cy, rim, palette.paper);
  band(context, cx, cy, rim, 1.5 * K, palette.lineStrong);
  band(context, cx, cy, rim * RING_30, K, palette.line);
  band(context, cx, cy, rim * RING_60, K, palette.line);
  context.beginPath();
  context.moveTo(cx, cy - rim);
  context.lineTo(cx, cy + rim);
  context.moveTo(cx - rim, cy);
  context.lineTo(cx + rim, cy);
  context.lineWidth = K;
  context.strokeStyle = palette.line;
  context.stroke();

  // The cloud: its darkness as alpha, then inked.
  context.drawImage(inked(cloudAlpha(surface, size), size, palette.ink900), box.x, box.y);

  // The density layer over it, as on screen: the dots show through.
  if (density) {
    const layer = densityAlpha(density, densityLevels(density.peak), size);
    context.drawImage(inked(layer, size, palette.density), box.x, box.y);
  }

  // Compass letters and ring labels, over the cloud. A paper edge keeps a
  // letter readable there, as on screen.
  const label = (text: string, x: number, y: number, weight: 400 | 600, align: CanvasTextAlign) => {
    context.font = `${weight} ${12 * K}px ${fontFamily}`;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.lineJoin = 'round';
    context.lineWidth = 4 * K;
    context.strokeStyle = palette.paper;
    context.strokeText(text, x, y);
    context.fillStyle = palette.ink500;
    context.fillText(text, x, y);
  };
  label('N', cx, cy - rim + 16 * K, 600, 'center');
  label('S', cx, cy + rim - 7 * K, 600, 'center');
  label('E', cx + rim - 10 * K, cy + 4 * K, 600, 'center');
  label('W', cx - rim + 10 * K, cy + 4 * K, 600, 'center');
  label('30°', cx + rim * RING_30 + 3 * K, cy + 14 * K, 400, 'left');
  label('60°', cx + rim * RING_60 + 3 * K, cy + 14 * K, 400, 'left');

  // The sun: a paper disc with a soft shadow, standing in for --shadow-1,
  // and lucide's sun on it.
  const sunAt = sunToNet(sun);
  const sunX = cx + sunAt.x * rim;
  const sunY = cy - sunAt.y * rim;
  context.save();
  context.shadowColor = 'rgba(28, 26, 23, 0.2)';
  context.shadowBlur = 6 * K;
  context.shadowOffsetY = K;
  disc(context, sunX, sunY, 15 * K, palette.paper);
  context.restore();
  context.save();
  const unit = (18 * K) / 24; // lucide draws in a 24-unit box; the screen's icon is 18px
  context.translate(sunX - 12 * unit, sunY - 12 * unit);
  context.scale(unit, unit);
  context.strokeStyle = palette.ink900;
  context.lineWidth = 2;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  context.arc(12, 12, 4, 0, TURN);
  context.stroke();
  context.stroke(new Path2D(SUN_RAYS));
  context.restore();

  // The selected pixel's point, over the sun. Flat ground has no direction:
  // its point sits at the center, hollow. A pixel with no data has no point.
  if (selection < 0 || surface.nodata[selection]) return;
  const flat = surface.flat[selection] === 1;
  const at = flat ? { x: 0, y: 0 } : toNet(surface.slope[selection], surface.aspect[selection]);
  const pointX = cx + at.x * rim;
  const pointY = cy - at.y * rim;
  disc(context, pointX, pointY, 7 * K, palette.paper);
  if (flat) band(context, pointX, pointY, 4 * K, 2 * K, palette.accent);
  else disc(context, pointX, pointY, 5 * K, palette.accent);
  band(context, pointX, pointY, 10.5 * K, 3 * K, palette.accent); // the halo
}

function drawCaption(context: Context, { layout, caption, palette, fontFamily }: CardInput): void {
  const { x, width, lines } = layout.caption;
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  caption.forEach((line, i) => {
    const slot = lines[i];
    if (!slot) return;
    // A line too long for the picture is set smaller until it fits.
    let size = line.size;
    context.font = `${line.weight} ${size}px ${fontFamily}`;
    while (size > SMALLEST_TYPE && context.measureText(line.text).width > width) {
      size -= 1;
      context.font = `${line.weight} ${size}px ${fontFamily}`;
    }
    context.fillStyle = line.ink === 'ink-900' ? palette.ink900 : palette.ink500;
    // The last resort for a line still too long at the smallest size: the
    // canvas squeezes it into the width.
    context.fillText(line.text, x, slot.y + slot.height / 2, width);
  });
}

/** Draws the picture of a view: the terrain, the net and a caption, on paper. */
export function drawCard(input: CardInput): HTMLCanvasElement {
  const { layout, palette } = input;
  const [canvas, context] = scratch(layout.width, layout.height);
  context.fillStyle = palette.paper;
  context.fillRect(0, 0, layout.width, layout.height);
  drawTerrain(context, layout.terrain, input);
  drawNet(context, layout.net, input);
  drawCaption(context, input);
  return canvas;
}

/**
 * The picture as a PNG file. It is made without waiting, by way of a data
 * URL, so that it can be shared inside the press that asked for it.
 */
export function cardFile(canvas: HTMLCanvasElement, name: string): File {
  const binary = atob(canvas.toDataURL('image/png').split(',')[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type: 'image/png' });
}

export interface PictureInput {
  /** The screen's arrangement, which the picture follows. */
  mode: 'portrait' | 'wide';
  appName: string;
  demId: string;
  place: string;
  dem: Dem;
  surface: Surface;
  sun: Sun;
  /** Index of the selected pixel, or −1. */
  selection: number;
  /** Whether the density layer is on. */
  density: boolean;
}

/** The picture of a view as a PNG file, or null if this browser cannot make one. */
export function pictureFile({
  mode,
  appName,
  demId,
  place,
  dem,
  surface,
  sun,
  selection,
  density,
}: PictureInput): File | null {
  try {
    const field = density ? densityOf(surface) : null;
    const caption = captionLines({
      place,
      dem,
      readout: readoutFor(dem, surface, selection),
      sun,
      site: siteName(window.location.host, window.location.pathname),
      density: field ? densityCaption(field) : null,
    });
    const layout = cardLayout({ mode, aspect: dem.width / dem.height, lines: caption.map((line) => line.height) });
    const canvas = drawCard({
      layout,
      surface,
      sun,
      selection,
      density: field,
      caption,
      palette: readPalette(),
      fontFamily: getComputedStyle(document.body).fontFamily,
    });
    return cardFile(canvas, fileName(appName, demId));
  } catch (error) {
    // The link is shared without the picture. This warning is the only trace
    // of why it went alone.
    console.warn('The picture could not be made.', error);
    return null;
  }
}
