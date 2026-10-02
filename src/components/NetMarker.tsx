import { type MotionValue, motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { useEffect, useRef } from 'react';
import { NET_RIM } from '../terrain/cloud';
import { toNet } from '../terrain/net';
import type { Surface } from '../terrain/types';
import { POINT_SPRING } from './motion';

interface NetMarkerProps {
  surface: Surface;
  /** Side of the net square in CSS pixels. */
  size: number;
  /** Index of the selected pixel, or −1. */
  selection: MotionValue<number>;
}

/** The selected pixel's point on the net. It springs from one position to the next. */
export function NetMarker({ surface, size, selection }: NetMarkerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const targetX = useMotionValue(0);
  const targetY = useMotionValue(0);
  const x = useSpring(targetX, POINT_SPRING);
  const y = useSpring(targetY, POINT_SPRING);

  useEffect(() => {
    const marker = ref.current;
    if (!marker) return;
    const center = size / 2;
    const rim = center * NET_RIM;
    let previous = -1;

    const place = (index: number) => {
      const plottable = index >= 0 && !surface.nodata[index] && !surface.flat[index];
      if (!plottable) {
        marker.dataset.visible = 'false';
        // Re-arm the pulse, so the next first selection plays it again.
        if (index < 0) marker.dataset.pulse = 'false';
        previous = index;
        return;
      }
      const point = toNet(surface.slope[index], surface.aspect[index]);
      const px = center + point.x * rim;
      const py = center - point.y * rim;
      const appearing = marker.dataset.visible !== 'true';
      if (appearing || reducedMotion) {
        // Nowhere to glide from, or motion is unwanted: go straight there.
        targetX.jump(px);
        targetY.jump(py);
        x.jump(px);
        y.jump(py);
      } else {
        targetX.set(px);
        targetY.set(py);
      }
      if (appearing) {
        marker.dataset.visible = 'true';
        // One pulse on the first selection, not on return from a flat pixel.
        marker.dataset.pulse = previous < 0 ? 'true' : 'false';
      }
      previous = index;
    };

    place(selection.get());
    return selection.on('change', place);
  }, [surface, size, selection, reducedMotion, targetX, targetY, x, y]);

  return (
    <motion.div
      ref={ref}
      className="net-marker"
      data-visible="false"
      data-testid="net-marker"
      style={{ x, y }}
    >
      <span className="net-marker__mark" />
    </motion.div>
  );
}
