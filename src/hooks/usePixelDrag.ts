import type { MotionValue } from 'motion/react';
import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from 'react';
import { pixelAt, stepPixel, toIndex, toPixel } from '../terrain/pick';

interface PixelDragOptions {
  /** DEM dimensions in pixels. */
  width: number;
  height: number;
  enabled: boolean;
  /** Index of the selected pixel, or −1. */
  selection: MotionValue<number>;
  /** A finger or mouse button went down on the terrain. */
  onPress: () => void;
  /** A drag ended, or a key press moved the selection. */
  onSettle: () => void;
  /** Escape cleared the selection. */
  onClear: () => void;
}

/**
 * Turns pointer and arrow-key events on the terrain into a selected pixel.
 * Spread `handlers` onto the element that shows the whole DEM.
 */
export function usePixelDrag({
  width,
  height,
  enabled,
  selection,
  onPress,
  onSettle,
  onClear,
}: PixelDragOptions) {
  // The pointer that started the drag. A second finger does not take over.
  const pointer = useRef<number | null>(null);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    if (!enabled) {
      pointer.current = null;
      setPressed(false);
    }
  }, [enabled]);

  const select = (event: PointerEvent<HTMLElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const pixel = pixelAt(
      event.clientX - box.left,
      event.clientY - box.top,
      box.width,
      box.height,
      width,
      height,
    );
    selection.set(toIndex(pixel, width));
  };

  const release = (event: PointerEvent<HTMLElement>) => {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    setPressed(false);
    onSettle();
  };

  return {
    /** True while a finger or mouse button is down on the terrain. */
    pressed,
    handlers: {
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if (!enabled || pointer.current !== null) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        pointer.current = event.pointerId;
        try {
          // Keeps the drag alive when the pointer leaves the terrain.
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Not every pointer can be captured; the drag still works inside the terrain.
        }
        setPressed(true);
        select(event);
        onPress();
      },
      onPointerMove(event: PointerEvent<HTMLElement>) {
        if (pointer.current === event.pointerId) select(event);
      },
      onPointerUp: release,
      onPointerCancel: release,
      // A pointer-up that never arrives ends the press too.
      onLostPointerCapture: release,
      onKeyDown(event: KeyboardEvent<HTMLElement>) {
        if (!enabled || event.altKey || event.ctrlKey || event.metaKey) return;
        const current = selection.get();
        // The way out: back to the whole landscape and the clean net.
        if (event.key === 'Escape') {
          if (current < 0) return;
          selection.set(-1);
          onClear();
          return;
        }
        const next = stepPixel(
          current < 0 ? null : toPixel(current, width),
          event.key,
          event.shiftKey,
          width,
          height,
        );
        if (!next) return;
        event.preventDefault();
        selection.set(toIndex(next, width));
        onSettle();
      },
    },
  };
}
