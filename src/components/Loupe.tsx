import { type RefObject, useEffect, useRef } from 'react';
import { toPixel } from '../terrain/pick';
import { LOUPE_SIZE, LOUPE_ZOOM, loupeCenter } from './loupePlacement';
import type { TerrainOverlayProps } from './SelectionRing';

interface LoupeProps extends TerrainOverlayProps {
  /** The hillshade canvas to magnify. One canvas pixel is one DEM pixel. */
  source: RefObject<HTMLCanvasElement | null>;
  /** True while a finger or mouse button is down on the terrain. */
  visible: boolean;
}

/** A magnified view of the terrain around the selected pixel, shown while pressing. */
export function Loupe({ source, visible, selection, columns, rows, boxWidth, boxHeight }: LoupeProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    const lens = lensRef.current;
    const terrain = source.current;
    if (!visible || !anchor || !lens || !terrain) return;

    lens.width = lens.height = Math.round(LOUPE_SIZE * (window.devicePixelRatio || 1));
    const context = lens.getContext('2d');
    if (!context) return;
    const span = LOUPE_SIZE / LOUPE_ZOOM; // DEM pixels across the lens

    const show = (index: number) => {
      if (index < 0) return;
      const { col, row } = toPixel(index, columns);
      const center = loupeCenter(
        ((col + 0.5) / columns) * boxWidth,
        ((row + 0.5) / rows) * boxHeight,
        boxWidth,
      );
      anchor.style.transform = `translate(${center.x}px, ${center.y}px)`;
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, lens.width, lens.height);
      context.drawImage(
        terrain,
        col + 0.5 - span / 2,
        row + 0.5 - span / 2,
        span,
        span,
        0,
        0,
        lens.width,
        lens.height,
      );
    };
    show(selection.get());
    return selection.on('change', show);
  }, [source, visible, selection, columns, rows, boxWidth, boxHeight]);

  return (
    <div ref={anchorRef} className="loupe" aria-hidden="true">
      <div className="loupe__lens" data-visible={visible} data-testid="loupe">
        <canvas ref={lensRef} />
      </div>
    </div>
  );
}
