import type { MotionValue } from 'motion/react';
import type { CSSProperties } from 'react';
import type { Layout } from '../layout';
import type { Dem, Surface } from '../terrain/types';
import { InfoTip } from './InfoTip';
import { NetCanvas } from './NetCanvas';
import { NetFrame, NetLabels } from './NetFrame';
import { NetMarker } from './NetMarker';
import { Readout } from './Readout';
import { SunHandle } from './SunHandle';

/** The one explanation of the net and of the three values read off it. */
export const NET_HELP =
  'Each dot is one pixel. Its direction from the center is its aspect, the way the slope faces looking downhill; its distance from the center is its slope, from 0° at the center to 90° at the rim. Elevation is the height the DEM stores for the pixel.';

interface NetCardProps {
  layout: Layout;
  /** The DEM to show, or null while the first DEM loads or after a failure. */
  dem: Dem | null;
  surface: Surface | null;
  loading: boolean;
  /** Index of the selected pixel, or −1. */
  selection: MotionValue<number>;
  sunAzimuth: MotionValue<number>;
  sunAltitude: MotionValue<number>;
}

export function NetCard({
  layout,
  dem,
  surface,
  loading,
  selection,
  sunAzimuth,
  sunAltitude,
}: NetCardProps) {
  const style = {
    width: layout.netCardWidth,
    height: layout.netCardHeight,
    '--inner': `${layout.inner}px`,
  } as CSSProperties;

  return (
    <section
      className="card net-card"
      data-readout={layout.readout}
      style={style}
      aria-label="Net"
      aria-describedby="net-help"
    >
      <div
        className="net"
        data-testid="net"
        style={{ width: layout.netSize, height: layout.netSize }}
      >
        <NetFrame size={layout.netSize} />
        {surface ? (
          <NetCanvas surface={surface} size={layout.netSize} />
        ) : loading ? (
          <div className="skeleton net__skeleton" aria-busy="true" />
        ) : null}
        <NetLabels size={layout.netSize} />
        {/* Below, so it never covers the app name on a phone. */}
        <InfoTip className="net__info" label="How to read the net" text={NET_HELP} side="bottom" />
        {surface && <SunHandle size={layout.netSize} azimuth={sunAzimuth} altitude={sunAltitude} />}
        {surface && <NetMarker surface={surface} size={layout.netSize} selection={selection} />}
      </div>
      <Readout dem={dem} surface={surface} selection={selection} />
      <p id="net-help" className="visually-hidden">
        {NET_HELP}
      </p>
    </section>
  );
}
