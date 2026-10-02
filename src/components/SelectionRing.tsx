import type { MotionValue } from 'motion/react';
import { useEffect, useRef } from 'react';
import { toPixel } from '../terrain/pick';

export interface TerrainOverlayProps {
  /** Index of the selected pixel, or −1. */
  selection: MotionValue<number>;
  /** DEM dimensions in pixels. */
  columns: number;
  rows: number;
  /** Size of the terrain on screen, in CSS pixels. */
  boxWidth: number;
  boxHeight: number;
}

/** The accent ring around the selected pixel on the terrain. */
export function SelectionRing({ selection, columns, rows, boxWidth, boxHeight }: TerrainOverlayProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ring = ref.current;
    if (!ring) return;
    const place = (index: number) => {
      if (index < 0) {
        ring.dataset.visible = 'false';
        return;
      }
      const { col, row } = toPixel(index, columns);
      const x = ((col + 0.5) / columns) * boxWidth;
      const y = ((row + 0.5) / rows) * boxHeight;
      ring.style.transform = `translate(${x}px, ${y}px)`;
      ring.dataset.visible = 'true';
    };
    place(selection.get());
    return selection.on('change', place);
  }, [selection, columns, rows, boxWidth, boxHeight]);

  return <div ref={ref} className="ring" data-visible="false" data-testid="selection-ring" />;
}
