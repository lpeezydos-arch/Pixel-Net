import type { MotionValue } from 'motion/react';
import { type RefObject, useEffect, useRef } from 'react';
import { shade } from '../terrain/hillshade';
import type { Surface } from '../terrain/types';
import { fadeIn, leaveGhost } from './fade';

interface TerrainCanvasProps {
  surface: Surface;
  sunAzimuth: MotionValue<number>;
  sunAltitude: MotionValue<number>;
  /** The canvas the hillshade is drawn on, shared with the loupe. */
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

/** The hillshade. Redrawn on the next animation frame whenever the sun moves. */
export function TerrainCanvas({ surface, sunAzimuth, sunAltitude, canvasRef }: TerrainCanvasProps) {
  const ghostRef = useRef<HTMLCanvasElement>(null);
  const drawn = useRef<Surface | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ghost = ghostRef.current;
    if (!canvas || !ghost) return;

    const previous = drawn.current;
    if (previous && previous !== surface) leaveGhost(canvas, ghost, '--t-base');

    canvas.width = surface.width;
    canvas.height = surface.height;
    const context = canvas.getContext('2d');
    if (!context) return;
    const image = context.createImageData(surface.width, surface.height);

    let frame = 0;
    const paint = () => {
      frame = 0;
      shade(surface, { azimuth: sunAzimuth.get(), altitude: sunAltitude.get() }, image.data);
      context.putImageData(image, 0, 0);
    };
    paint();

    if (previous !== surface) fadeIn(canvas, previous ? '--t-base' : '--t-fast');
    drawn.current = surface;

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const stopAzimuth = sunAzimuth.on('change', schedule);
    const stopAltitude = sunAltitude.on('change', schedule);
    return () => {
      stopAzimuth();
      stopAltitude();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [surface, sunAzimuth, sunAltitude, canvasRef]);

  return (
    <>
      <canvas ref={ghostRef} className="terrain__image" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className="terrain__image"
        data-testid="terrain-image"
        role="img"
        aria-label="Hillshade of the DEM"
      />
    </>
  );
}
