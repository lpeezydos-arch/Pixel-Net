import * as Tooltip from '@radix-ui/react-tooltip';
import { Sun as SunIcon } from 'lucide-react';
import { type MotionValue, animate, motion, useMotionValue, useReducedMotion } from 'motion/react';
import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from 'react';
import { NET_RIM } from '../terrain/cloud';
import { DEFAULT_SUN, MIN_SUN_ALTITUDE, formatSun, netToSun, sunToNet } from '../terrain/net';
import { POINT_SPRING } from './motion';

interface SunHandleProps {
  /** Side of the net square in CSS pixels. */
  size: number;
  azimuth: MotionValue<number>;
  altitude: MotionValue<number>;
}

const TAP_SLOP = 6; // pixels a pointer may move and still count as a tap
const DOUBLE_TAP_MS = 300;
const KEY_STEP = 5; // degrees per arrow key press

/**
 * The sun, drawn on the net where a slope facing straight at it would plot.
 * Dragging it changes where the light comes from; a double tap resets it.
 */
export function SunHandle({ size, azimuth, altitude }: SunHandleProps) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const reducedMotion = useReducedMotion();
  const [dragging, setDragging] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const drag = useRef<{ pointer: number; dx: number; dy: number; startX: number; startY: number } | null>(null);
  const lastTap = useRef(0);
  // The reset glide in progress, if any. Any new input from the user stops it.
  const glide = useRef<{ stop: () => void } | null>(null);

  const center = size / 2;
  const rim = center * NET_RIM;

  // Keep the marker and its label on the current sun.
  useEffect(() => {
    const place = () => {
      const sun = { azimuth: azimuth.get(), altitude: altitude.get() };
      const point = sunToNet(sun);
      x.set(center + point.x * rim);
      y.set(center - point.y * rim);
      const label = labelRef.current;
      if (label) {
        label.textContent = formatSun(sun);
        label.dataset.side = point.x > 0 ? 'left' : 'right';
      }
    };
    place();
    const stopAzimuth = azimuth.on('change', place);
    const stopAltitude = altitude.on('change', place);
    return () => {
      stopAzimuth();
      stopAltitude();
    };
  }, [azimuth, altitude, x, y, center, rim]);

  const setSun = (netX: number, netY: number) => {
    const sun = netToSun(netX, netY);
    azimuth.set(sun.azimuth);
    altitude.set(sun.altitude);
  };

  const stopGlide = () => {
    glide.current?.stop();
    glide.current = null;
  };

  // A glide must not outlive the marker.
  useEffect(() => () => glide.current?.stop(), []);

  const reset = () => {
    stopGlide();
    const from = sunToNet({ azimuth: azimuth.get(), altitude: altitude.get() });
    const to = sunToNet(DEFAULT_SUN);
    const finish = () => {
      azimuth.set(DEFAULT_SUN.azimuth);
      altitude.set(DEFAULT_SUN.altitude);
    };
    if (reducedMotion) {
      finish();
      return;
    }
    // Glide across the net in a straight line; the terrain re-lights on the way.
    let live = true;
    const controls = animate(0, 1, {
      type: 'spring',
      ...POINT_SPRING,
      onUpdate: (t) => {
        if (live) setSun(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
      },
      onComplete: () => {
        if (!live) return;
        glide.current = null;
        finish();
      },
    });
    glide.current = {
      stop: () => {
        live = false;
        controls.stop();
      },
    };
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (drag.current || (event.pointerType === 'mouse' && event.button !== 0)) return;
    stopGlide();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Not every pointer can be captured; the drag still works over the marker.
    }
    // Remember where on the marker it was grabbed, so it does not jump.
    drag.current = {
      pointer: event.pointerId,
      dx: event.clientX - x.get(),
      dy: event.clientY - y.get(),
      startX: event.clientX,
      startY: event.clientY,
    };
    setDragging(true);
    setTipOpen(false);
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    setSun((event.clientX - current.dx - center) / rim, -(event.clientY - current.dy - center) / rim);
  };

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    const moved = Math.hypot(event.clientX - current.startX, event.clientY - current.startY);
    if (event.type === 'pointercancel' || moved > TAP_SLOP) {
      lastTap.current = 0;
      return;
    }
    if (event.timeStamp - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      reset();
    } else {
      lastTap.current = event.timeStamp;
    }
  };

  // A pointer-up that never arrives must not leave the sun undraggable. This
  // also fires after a normal release, when the drag has already ended.
  const onLostPointerCapture = (event: PointerEvent<HTMLButtonElement>) => {
    if (drag.current?.pointer !== event.pointerId) return;
    drag.current = null;
    lastTap.current = 0;
    setDragging(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const turn = event.key === 'ArrowRight' ? KEY_STEP : event.key === 'ArrowLeft' ? -KEY_STEP : 0;
    const lift = event.key === 'ArrowUp' ? KEY_STEP : event.key === 'ArrowDown' ? -KEY_STEP : 0;
    if (event.key === 'Home') {
      event.preventDefault();
      reset();
    } else if (turn || lift) {
      event.preventDefault();
      stopGlide();
      azimuth.set((azimuth.get() + turn + 360) % 360);
      altitude.set(Math.min(90, Math.max(MIN_SUN_ALTITUDE, altitude.get() + lift)));
    }
  };

  return (
    <motion.div className="sun" style={{ x, y }}>
      {/* The tooltip gives way to the direction label while dragging. */}
      <Tooltip.Root open={tipOpen && !dragging} onOpenChange={setTipOpen}>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className="sun__handle"
            aria-label="Sun. Arrow keys move the light; Home resets it."
            data-testid="sun"
            data-dragging={dragging}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onLostPointerCapture={onLostPointerCapture}
            onKeyDown={onKeyDown}
          >
            <span className="sun__disc">
              <SunIcon size={18} aria-hidden="true" />
            </span>
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="tooltip" sideOffset={2} collisionPadding={8}>
            Drag to move the light, or double-tap to reset it.
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      <span ref={labelRef} className="sun__label" data-visible={dragging} data-testid="sun-label" />
    </motion.div>
  );
}
