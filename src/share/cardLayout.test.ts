import { describe, expect, it } from 'vitest';
import { type Box, cardLayout } from './cardLayout';

const GORE = 288 / 294;
const WITH_READOUT = [40, 28, 28];
const WITHOUT_READOUT = [28, 28];

describe('cardLayout', () => {
  it('puts the terrain left of the net when the cards sit side by side', () => {
    expect(cardLayout({ mode: 'wide', aspect: GORE, lines: WITH_READOUT })).toEqual({
      width: 1561,
      height: 940,
      terrain: { x: 48, y: 48, width: 705, height: 720 },
      net: { x: 793, y: 48, width: 720, height: 720 },
      caption: {
        x: 48,
        width: 1465,
        lines: [
          { y: 796, height: 40 },
          { y: 836, height: 28 },
          { y: 864, height: 28 },
        ],
      },
    });
  });

  it('puts the net above the terrain when the cards are stacked', () => {
    expect(cardLayout({ mode: 'portrait', aspect: GORE, lines: WITH_READOUT })).toEqual({
      width: 816,
      height: 1715,
      terrain: { x: 48, y: 808, width: 720, height: 735 },
      net: { x: 48, y: 48, width: 720, height: 720 },
      caption: {
        x: 48,
        width: 720,
        lines: [
          { y: 1571, height: 40 },
          { y: 1611, height: 28 },
          { y: 1639, height: 28 },
        ],
      },
    });
  });

  it('is shorter by the readout line when nothing is selected', () => {
    expect(cardLayout({ mode: 'wide', aspect: GORE, lines: WITHOUT_READOUT }).height).toBe(900);
    expect(cardLayout({ mode: 'portrait', aspect: GORE, lines: WITHOUT_READOUT }).height).toBe(1675);
  });

  it('lets a wide terrain reach the limit and no further, centered beside the net', () => {
    const twice = cardLayout({ mode: 'wide', aspect: 2, lines: WITHOUT_READOUT });
    expect(twice.terrain).toEqual({ x: 48, y: 48, width: 1440, height: 720 });
    const thrice = cardLayout({ mode: 'wide', aspect: 3, lines: WITHOUT_READOUT });
    expect(thrice.terrain).toEqual({ x: 48, y: 168, width: 1440, height: 480 });
    expect(thrice.net.x).toBe(1528);
    expect(thrice.width).toBe(2296);
  });

  it('lets a tall terrain reach the limit and no further, centered under the net', () => {
    const twice = cardLayout({ mode: 'portrait', aspect: 0.5, lines: WITHOUT_READOUT });
    expect(twice.terrain).toEqual({ x: 48, y: 808, width: 720, height: 1440 });
    const thrice = cardLayout({ mode: 'portrait', aspect: 1 / 3, lines: WITHOUT_READOUT });
    expect(thrice.terrain).toEqual({ x: 168, y: 808, width: 480, height: 1440 });
    expect(thrice.height).toBe(2380);
  });

  it('keeps everything inside the picture and apart, whatever the shape of the DEM', () => {
    const overlap = (a: Box, b: Box) =>
      a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    for (const mode of ['wide', 'portrait'] as const) {
      for (const aspect of [0.2, 1 / 3, 0.5, GORE, 1, 2, 3, 5]) {
        const card = cardLayout({ mode, aspect, lines: WITH_READOUT });
        const lines = card.caption.lines.map((line) => ({
          x: card.caption.x,
          y: line.y,
          width: card.caption.width,
          height: line.height,
        }));
        const boxes = [card.terrain, card.net, ...lines];
        for (const box of boxes) {
          expect(box.width).toBeGreaterThan(0);
          expect(box.height).toBeGreaterThan(0);
          expect(box.x).toBeGreaterThanOrEqual(48);
          expect(box.y).toBeGreaterThanOrEqual(48);
          expect(box.x + box.width).toBeLessThanOrEqual(card.width - 48);
          expect(box.y + box.height).toBeLessThanOrEqual(card.height - 48);
        }
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            expect(overlap(boxes[i], boxes[j]), `${mode} at ${aspect}: boxes ${i} and ${j}`).toBe(false);
          }
        }
      }
    }
  });

  it('treats a shape that is not a positive number as square', () => {
    const square = { x: 48, y: 48, width: 720, height: 720 };
    expect(cardLayout({ mode: 'wide', aspect: 0, lines: WITHOUT_READOUT }).terrain).toEqual(square);
    expect(cardLayout({ mode: 'wide', aspect: Number.NaN, lines: WITHOUT_READOUT }).terrain).toEqual(square);
  });
});
