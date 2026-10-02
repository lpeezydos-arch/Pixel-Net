import type { MotionValue } from 'motion/react';
import { useRef } from 'react';
import type { DemErrorReason } from '../terrain/dem';
import type { Surface } from '../terrain/types';
import { ErrorCard } from './ErrorCard';
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
}

export function TerrainCard({
  width,
  height,
  surface,
  error,
  onRetry,
  sunAzimuth,
  sunAltitude,
}: TerrainCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <section className="card terrain" style={{ width, height }} aria-label="Terrain">
      {error ? (
        <ErrorCard reason={error} onRetry={onRetry} />
      ) : surface ? (
        <TerrainCanvas
          surface={surface}
          sunAzimuth={sunAzimuth}
          sunAltitude={sunAltitude}
          canvasRef={canvasRef}
        />
      ) : (
        <div className="skeleton terrain__skeleton" aria-busy="true" />
      )}
    </section>
  );
}
