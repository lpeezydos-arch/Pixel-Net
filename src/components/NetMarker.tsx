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

/**
 * The selected pixel's point on the net. It springs from one position to the
 * next. Flat ground has no direction, so its point sits at the center, drawn
 * hollow; a pixel with no data has no point at all.
 */
export function NetMarker({ surface, size, selection }: NetMarkerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const pulsed = useRef(false); // has the point pulsed since the selection was last cleared
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

    const place = (index: number) => {
      if (index < 0 || surface.nodata[index]) {
        marker.dataset.visible = 'false';
        // Re-arm the pulse, so the next first selection plays it again.
        if (index < 0) {
          marker.dataset.pulse = 'false';
          pulsed.current = false;
        }
        return;
      }
      const flat = surface.flat[index] === 1;
      const point = flat ? { x: 0, y: 0 } : toNet(surface.slope[index], surface.aspect[index]);
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
      marker.dataset.flat = String(flat);
      if (appearing) {
        marker.dataset.visible = 'true';
        // One pulse on the first appearance after the selection was cleared.
        marker.dataset.pulse = pulsed.current ? 'false' : 'true';
        pulsed.current = true;
      }
    };

    place(selection.get());
    return selection.on('change', place);
  }, [surface, size, selection, reducedMotion, targetX, targetY, x, y]);

  return (
    <motion.div
      ref={ref}
      className="net-marker"
      data-visible="false"
      data-flat="false"
      data-testid="net-marker"
      style={{ x, y }}
    >
      <span className="net-marker__mark" />
    </motion.div>
  );
}
