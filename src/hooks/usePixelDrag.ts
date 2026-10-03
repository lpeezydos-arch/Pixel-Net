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
const TAP_SLOP = 6; // pixels a finger may move and still count as a tap
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_NEAR = 24; // pixels between two taps that are "the same place"

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
  const pressedAt = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);
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
    const start = pressedAt.current;
    pressedAt.current = null;

    // A finger has no Escape key: a second quick tap in the same place lets
    // go of the selection. A mouse's double click selects, like any click.
    const tapped =
      event.type === 'pointerup' &&
      event.pointerType === 'touch' &&
      start !== null &&
      Math.hypot(event.clientX - start.x, event.clientY - start.y) <= TAP_SLOP;
    const last = lastTap.current;
    lastTap.current = tapped ? { time: event.timeStamp, x: event.clientX, y: event.clientY } : null;
    if (
      tapped &&
      last &&
      event.timeStamp - last.time < DOUBLE_TAP_MS &&
      Math.hypot(event.clientX - last.x, event.clientY - last.y) <= DOUBLE_TAP_NEAR
    ) {
      lastTap.current = null;
      selection.set(-1);
      onClear();
      return;
    }
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
        pressedAt.current = { x: event.clientX, y: event.clientY };
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
