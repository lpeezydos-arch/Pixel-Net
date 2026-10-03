import type { MotionValue } from 'motion/react';
import { useRef } from 'react';
import { usePixelDrag } from '../hooks/usePixelDrag';
import type { DemErrorReason } from '../terrain/dem';
import type { Surface } from '../terrain/types';
import { ErrorCard } from './ErrorCard';
import { Loupe } from './Loupe';
import { SelectionRing } from './SelectionRing';
import { TerrainCanvas } from './TerrainCanvas';

interface TerrainCardProps {
  width: number;
  height: number;
  /** The surface to show, or null while the first DEM loads or after a failure. */
  surface: Surface | null;
  error: DemErrorReason | null;
  onRetry: () => void;
  sunAzimuth: MotionValue<number>;
  sunAltitude: MotionValue<number>;
  /** Index of the selected pixel, or −1. */
  selection: MotionValue<number>;
  /** False while another DEM is loading over the one shown. */
  interactive: boolean;
  onPress: () => void;
  onSettle: () => void;
  /** Escape cleared the selection. */
  onClear: () => void;
  /** The terrain gained or lost keyboard focus (focus a pointer gave it does not count). */
  onFocusVisible?: (visible: boolean) => void;
}

export function TerrainCard({
  width,
  height,
  surface,
  error,
  onRetry,
  sunAzimuth,
  sunAltitude,
  selection,
  interactive,
  onPress,
  onSettle,
  onClear,
  onFocusVisible,
}: TerrainCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { pressed, handlers } = usePixelDrag({
    width: surface?.width ?? 0,
    height: surface?.height ?? 0,
    enabled: interactive && surface !== null && !error,
    selection,
    onPress,
    onSettle,
    onClear,
  });

  return (
    <section className="card terrain" style={{ width, height }} aria-label="Terrain">
      {error ? (
        <ErrorCard reason={error} onRetry={onRetry} />
      ) : surface ? (
        <div
          className="terrain__area"
          tabIndex={0}
          role="application"
          aria-label="Terrain. Drag, or use the arrow keys, to inspect a pixel."
          data-testid="terrain-area"
          {...handlers}
          onFocus={(event) => onFocusVisible?.(event.currentTarget.matches(':focus-visible'))}
          onBlur={() => onFocusVisible?.(false)}
        >
          <TerrainCanvas
            surface={surface}
            sunAzimuth={sunAzimuth}
            sunAltitude={sunAltitude}
            canvasRef={canvasRef}
          />
          <SelectionRing
            selection={selection}
            columns={surface.width}
            rows={surface.height}
            boxWidth={width}
            boxHeight={height}
          />
          <Loupe
            source={canvasRef}
            visible={pressed}
            selection={selection}
            columns={surface.width}
            rows={surface.height}
            boxWidth={width}
            boxHeight={height}
          />
        </div>
      ) : (
        <div className="skeleton terrain__skeleton" aria-busy="true" />
      )}
    </section>
  );
}
