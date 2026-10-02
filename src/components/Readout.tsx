import type { MotionValue } from 'motion/react';
import { useEffect, useRef } from 'react';
import { EMPTY_READOUT, readoutFor } from '../terrain/format';
import type { Dem, Surface } from '../terrain/types';
import { InfoTip } from './InfoTip';

interface ReadoutProps {
  dem: Dem | null;
  surface: Surface | null;
  /** Index of the selected pixel, or −1. */
  selection: MotionValue<number>;
}

/** Slope, aspect and elevation of the selected pixel. Updated without re-rendering. */
export function Readout({ dem, surface, selection }: ReadoutProps) {
  const slopeRef = useRef<HTMLElement>(null);
  const aspectRef = useRef<HTMLElement>(null);
  const elevationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const write = (index: number) => {
      const text = dem && surface ? readoutFor(dem, surface, index) : EMPTY_READOUT;
      if (slopeRef.current) slopeRef.current.textContent = text.slope;
      if (aspectRef.current) aspectRef.current.textContent = text.aspect;
      if (elevationRef.current) elevationRef.current.textContent = text.elevation;
    };
    write(selection.get());
    return selection.on('change', write);
  }, [dem, surface, selection]);

  return (
    <dl className="readout">
      <div className="stat">
        <dt className="stat__label">
          Slope
          <InfoTip
            label="About slope"
            text="How steep the ground is at this pixel, from 0° for flat to 90° for vertical."
          />
        </dt>
        <dd className="stat__value" ref={slopeRef} data-testid="slope" />
      </div>
      <div className="stat">
        <dt className="stat__label">
          Aspect
          <InfoTip
            label="About aspect"
            text="The compass direction this slope faces, looking downhill."
          />
        </dt>
        <dd className="stat__value" ref={aspectRef} data-testid="aspect" />
      </div>
      <div className="stat">
        <dt className="stat__label">
          Elevation
          <InfoTip label="About elevation" text="The height stored in the DEM at this pixel." />
        </dt>
        <dd className="stat__value" ref={elevationRef} data-testid="elevation" />
      </div>
    </dl>
  );
}
