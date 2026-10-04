import { useLayoutEffect, useRef } from 'react';
import { densityAlpha, densityLevels, densityOf } from '../terrain/density';
import type { Surface } from '../terrain/types';
import { inkOf } from './NetCanvas';
import { fadeIn, leaveGhost } from './fade';

interface DensityCanvasProps {
  surface: Surface;
  /** Side of the net square in CSS pixels. */
  size: number;
  /** Whether the layer is shown. */
  on: boolean;
}

/**
 * The density layer: bands and lines over the cloud, where its pixels crowd
 * together. Drawn when the layer is on and the DEM or the size has changed;
 * turning it on and off is a fade of the whole layer, in CSS.
 */
export function DensityCanvas({ surface, size, on }: DensityCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ghostRef = useRef<HTMLCanvasElement>(null);
  const drawn = useRef<{ surface: Surface; pixels: number } | null>(null);
  const wasOn = useRef(false);
  // True until the layout effect has run once, so a layer that is on from
  // the start (a link or the saved view) can fade in with the cloud.
  const mounting = useRef(true);

  // A layout effect, so a layer that is turned on never shows, even for a
  // frame, what it last drew for another DEM or another size.
  useLayoutEffect(() => {
    const stayedOn = wasOn.current && on;
    wasOn.current = on;
    const opening = mounting.current && on;
    if (!on) mounting.current = false; // started off: turning it on later is not opening
    const canvas = canvasRef.current;
    const ghost = ghostRef.current;
    if (!on || !canvas || !ghost || size <= 0) return;

    // The cloud's own rule: at least two image pixels per CSS pixel.
    const pixels = Math.round(size * Math.max(2, window.devicePixelRatio || 1));
    const previous = drawn.current;
    if (previous && previous.surface === surface && previous.pixels === pixels) return;

    // When the DEM changes under a layer that is on, it changes as the cloud does.
    const crossfade = stayedOn && previous !== null && previous.surface !== surface;
    if (crossfade) leaveGhost(canvas, ghost, '--t-base');

    canvas.width = pixels;
    canvas.height = pixels;
    const context = canvas.getContext('2d');
    if (!context) return;

    const field = densityOf(surface);
    const alpha = densityAlpha(field, densityLevels(field.peak), pixels);
    const image = context.createImageData(pixels, pixels);
    const [red, green, blue] = inkOf(canvas);
    for (let cell = 0, o = 0; cell < alpha.length; cell++, o += 4) {
      image.data[o] = red;
      image.data[o + 1] = green;
      image.data[o + 2] = blue;
      image.data[o + 3] = alpha[cell];
    }
    context.putImageData(image, 0, 0);

    if (crossfade) fadeIn(canvas, '--t-base');
    // Opened on, the sheet comes in with the cloud, not before it. A layer
    // the user turns on has the wrapper's own fade and needs no second one.
    // The ref is cleared here, after the draw: StrictMode's second run finds
    // the drawing done and returns above, so the fade is not started twice.
    if (opening) fadeIn(canvas, '--t-slow');
    mounting.current = false;
    drawn.current = { surface, pixels };
  }, [surface, size, on]);

  return (
    <div className="net__density" data-on={on} data-testid="density-layer" aria-hidden="true">
      <canvas ref={ghostRef} />
      <canvas ref={canvasRef} data-testid="net-density" />
    </div>
  );
}
