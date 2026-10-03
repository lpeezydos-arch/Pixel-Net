import * as Tooltip from '@radix-ui/react-tooltip';
import { Sun as SunIcon } from 'lucide-react';
import { type MotionValue, animate, motion, useMotionValue, useReducedMotion } from 'motion/react';
import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useCoarsePointer } from '../hooks/useCoarsePointer';
import { NET_RIM } from '../terrain/cloud';
import { describeSun } from '../terrain/format';
import { DEFAULT_SUN, MIN_SUN_ALTITUDE, formatSun, netToSun, sunToNet } from '../terrain/net';
import type { Sun } from '../terrain/types';
import { announce } from './announce';
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
const RAISED_AFTER_KEY_MS = 1500; // how long the label stays raised after a key press
const RAISED_FOR_HINT_MS = 2000; // how long a tap's hint stays
const ANNOUNCE_AFTER_MS = 400; // quiet time after a key press before the new position is announced
const SMALL_NET = 220; // below this the resting label is hidden
const MOVE_HINT = 'Drag to move the light';
const RESET_HINT = 'Double-tap to reset';
const NAME_SUFFIX = 'Arrow keys move the light; Home resets it.';

const accessibleName = (sun: Sun) => `Sun, ${formatSun(sun)}. ${NAME_SUFFIX}`;
const atDefault = (sun: Sun) =>
  sun.azimuth === DEFAULT_SUN.azimuth && sun.altitude === DEFAULT_SUN.altitude;

/**
 * The sun, drawn on the net where a slope facing straight at it would plot.
 * Dragging it changes where the light comes from; a double tap resets it.
 *
 * Its position is always written beside it, quietly at rest and raised into
 * a dark label while it moves, and is spoken when a move ends.
 */
export function SunHandle({ size, azimuth, altitude }: SunHandleProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const announceRef = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const reducedMotion = useReducedMotion();
  const coarse = useCoarsePointer();
  const [dragging, setDragging] = useState(false);
  const [raised, setRaised] = useState(false); // the label in its dark form after a key press or a tap
  const [tipOpen, setTipOpen] = useState(false);
  const drag = useRef<{ pointer: number; dx: number; dy: number; startX: number; startY: number } | null>(null);
  const lastTap = useRef(0);
  // A hint standing in for the position in the label, while it lasts.
  const hint = useRef<string | null>(null);
  const raiseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The reset glide in progress, if any. Any new input from the user stops it.
  const glide = useRef<{ stop: () => void } | null>(null);

  const center = size / 2;
  const rim = center * NET_RIM;

  const currentSun = useCallback(
    (): Sun => ({ azimuth: azimuth.get(), altitude: altitude.get() }),
    [azimuth, altitude],
  );

  // Puts the marker, its label and its accessible name on the current sun.
  const place = useCallback(() => {
    const sun = currentSun();
    const point = sunToNet(sun);
    x.set(center + point.x * rim);
    y.set(center - point.y * rim);
    const label = labelRef.current;
    if (label) {
      label.textContent = hint.current ?? formatSun(sun);
      // Raised, the label sits beside the disc on the side toward the center.
      label.dataset.side = point.x > 0 ? 'left' : 'right';
      // At rest it is a caption under the disc, or over it in the south where
      // there is no room below, kept inside the net square.
      label.dataset.vertical = point.y < -0.5 ? 'above' : 'below';
      const sunX = center + point.x * rim;
      const width = label.offsetWidth;
      const left = Math.max(-sunX, Math.min(-width / 2, size - sunX - width));
      label.style.setProperty('--label-x', `${left}px`);
    }
    buttonRef.current?.setAttribute('aria-label', accessibleName(sun));
  }, [currentSun, x, y, center, rim, size]);

  useEffect(() => {
    place();
    const stopAzimuth = azimuth.on('change', place);
    const stopAltitude = altitude.on('change', place);
    return () => {
      stopAzimuth();
      stopAltitude();
    };
  }, [azimuth, altitude, place]);

  const announceSun = useCallback(() => {
    announce(announceRef.current, describeSun(currentSun()));
  }, [currentSun]);

  const lower = useCallback(() => {
    if (raiseTimer.current) clearTimeout(raiseTimer.current);
    raiseTimer.current = null;
    hint.current = null;
    setRaised(false);
    place();
  }, [place]);

  /** Shows the label in its dark form for a while, with `text` in place of the position if given. */
  const raise = (ms: number, text: string | null = null) => {
    if (raiseTimer.current) clearTimeout(raiseTimer.current);
    hint.current = text;
    place();
    setRaised(true);
    raiseTimer.current = setTimeout(lower, ms);
  };

  const setSun = (netX: number, netY: number) => {
    const sun = netToSun(netX, netY);
    azimuth.set(sun.azimuth);
    altitude.set(sun.altitude);
  };

  const stopGlide = () => {
    glide.current?.stop();
    glide.current = null;
  };

  // Nothing outlives the marker: not a glide, not a timer.
  useEffect(
    () => () => {
      glide.current?.stop();
      if (raiseTimer.current) clearTimeout(raiseTimer.current);
      if (announceTimer.current) clearTimeout(announceTimer.current);
    },
    [],
  );

  const reset = () => {
    stopGlide();
    lower();
    const from = sunToNet(currentSun());
    const to = sunToNet(DEFAULT_SUN);
    const finish = () => {
      azimuth.set(DEFAULT_SUN.azimuth);
      altitude.set(DEFAULT_SUN.altitude);
      announceSun();
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
    // A hint gives way to the position the moment the sun is taken hold of.
    if (hint.current) {
      hint.current = null;
      place();
    }
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
      announceSun();
      return;
    }
    if (event.timeStamp - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      reset();
      return;
    }
    lastTap.current = event.timeStamp;
    // A finger has no tooltip to hover: a single tap says what the sun does,
    // or, once it has been moved, what a second tap would do.
    if (event.pointerType === 'touch') {
      raise(RAISED_FOR_HINT_MS, atDefault(currentSun()) ? MOVE_HINT : RESET_HINT);
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
      setTipOpen(false);
      reset();
    } else if (turn || lift) {
      event.preventDefault();
      stopGlide();
      // The instructions have been followed; the label takes over from the tooltip.
      setTipOpen(false);
      azimuth.set((azimuth.get() + turn + 360) % 360);
      altitude.set(Math.min(90, Math.max(MIN_SUN_ALTITUDE, altitude.get() + lift)));
      raise(RAISED_AFTER_KEY_MS);
      // Speak where a run of key presses ends up, not every step on the way.
      if (announceTimer.current) clearTimeout(announceTimer.current);
      announceTimer.current = setTimeout(announceSun, ANNOUNCE_AFTER_MS);
    }
  };

  return (
    <motion.div className="sun" style={{ x, y }}>
      {/* The tooltip gives way to the position label while dragging. */}
      <Tooltip.Root open={tipOpen && !dragging} onOpenChange={setTipOpen}>
        <Tooltip.Trigger asChild>
          <button
            ref={buttonRef}
            type="button"
            className="sun__handle"
            aria-label={accessibleName(currentSun())}
            data-testid="sun"
            data-dragging={dragging}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onLostPointerCapture={onLostPointerCapture}
            onKeyDown={onKeyDown}
          >
            {/* On a touch screen nothing can hover, so the disc stirs once to say it moves. */}
            <span className="sun__disc" data-nudge={coarse}>
              <SunIcon size={18} aria-hidden="true" />
            </span>
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="tooltip" sideOffset={2} collisionPadding={8}>
            Drag, or use the arrow keys, to move the light. Double-click or Home resets it.
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      {/* The button's name carries the position for assistive technology. On
          a small net the resting label would cover half of it, so it waits
          until the sun moves. */}
      <span
        ref={labelRef}
        className="sun__label"
        data-active={dragging || raised}
        data-quiet-hidden={size < SMALL_NET}
        data-testid="sun-label"
        aria-hidden="true"
      />
      <span
        ref={announceRef}
        className="visually-hidden"
        aria-live="polite"
        data-testid="sun-announcement"
      />
    </motion.div>
  );
}
