/** Diameter of the loupe in CSS pixels. */
export const LOUPE_SIZE = 96;
/** Screen pixels per DEM pixel inside the loupe. */
export const LOUPE_ZOOM = 8;
/** Distance from the touch point to the loupe's center. */
export const LOUPE_LIFT = 82;

/**
 * Center of the loupe for a touch at (x, y) inside a box `boxWidth` wide.
 * It sits above the touch point; near the top edge, where that would clip
 * it, it moves beside the touch point on the side that has more room.
 */
export function loupeCenter(x: number, y: number, boxWidth: number): { x: number; y: number } {
  const half = LOUPE_SIZE / 2;
  const keepInside = (value: number) =>
    Math.min(Math.max(value, half), Math.max(half, boxWidth - half));

  if (y - LOUPE_LIFT - half >= 0) return { x: keepInside(x), y: y - LOUPE_LIFT };
  const side = x <= boxWidth / 2 ? 1 : -1;
  return { x: keepInside(x + side * LOUPE_LIFT), y: Math.max(half, y) };
}
