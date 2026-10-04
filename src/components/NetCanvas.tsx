import { useEffect, useRef } from 'react';
import { cloudAlpha } from '../terrain/cloud';
import type { Surface } from '../terrain/types';
import { fadeIn, leaveGhost } from './fade';

interface NetCanvasProps {
  surface: Surface;
  /** Side of the net square in CSS pixels. */
  size: number;
}

/** The element's text color as red, green and blue, 0 to 255. */
export function inkOf(element: Element): [number, number, number] {
  const parts = getComputedStyle(element).color.match(/[\d.]+/g) ?? [];
  return [Number(parts[0] ?? 0), Number(parts[1] ?? 0), Number(parts[2] ?? 0)];
}

/** Every plottable pixel of the DEM as a point on the net. Drawn once per DEM and size. */
export function NetCanvas({ surface, size }: NetCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ghostRef = useRef<HTMLCanvasElement>(null);
  const drawn = useRef<Surface | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ghost = ghostRef.current;
    if (!canvas || !ghost || size <= 0) return;

    const previous = drawn.current;
    if (previous && previous !== surface) leaveGhost(canvas, ghost, '--t-base');

    // At least two image pixels per CSS pixel, so the points stay fine on
    // ordinary desktop screens too.
    const pixels = Math.round(size * Math.max(2, window.devicePixelRatio || 1));
    canvas.width = pixels;
    canvas.height = pixels;
    const context = canvas.getContext('2d');
    if (!context) return;

    const alpha = cloudAlpha(surface, pixels);
    const image = context.createImageData(pixels, pixels);
    const [red, green, blue] = inkOf(canvas);
    for (let cell = 0, o = 0; cell < alpha.length; cell++, o += 4) {
      image.data[o] = red;
      image.data[o + 1] = green;
      image.data[o + 2] = blue;
      image.data[o + 3] = alpha[cell];
    }
    context.putImageData(image, 0, 0);

    if (previous !== surface) fadeIn(canvas, previous ? '--t-base' : '--t-slow');
    drawn.current = surface;
  }, [surface, size]);

  return (
    <>
      <canvas ref={ghostRef} className="net__cloud" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className="net__cloud"
        data-testid="net-cloud"
        role="img"
        aria-label="Every pixel of the DEM, plotted by the direction it faces and how steep it is"
      />
    </>
  );
}
