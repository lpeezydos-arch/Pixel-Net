import type { MotionValue } from 'motion/react';
import type { CSSProperties } from 'react';
import type { Layout } from '../layout';
import { densityKey, densityOf, densitySentence, knownDensity } from '../terrain/density';
import type { Dem, Surface } from '../terrain/types';
import { DensityCanvas } from './DensityCanvas';
import { DensityToggle } from './DensityToggle';
import { InfoTip } from './InfoTip';
import { NetCanvas } from './NetCanvas';
import { NetFrame, NetLabels } from './NetFrame';
import { NetMarker } from './NetMarker';
import { Readout } from './Readout';
import { SunHandle } from './SunHandle';

/** Net width below which the full key, in the net's corner, would cross the rim. */
const SMALL_NET = 240;

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
  /** Whether the density layer is on. */
  density: boolean;
  onDensityChange: (on: boolean) => void;
}

export function NetCard({
  layout,
  dem,
  surface,
  loading,
  selection,
  sunAzimuth,
  sunAltitude,
  density,
  onDensityChange,
}: NetCardProps) {
  // The layer is counted the first time it is shown. Once counted it is kept,
  // so the key still has its words while the layer fades out.
  const field = surface ? (density ? densityOf(surface) : knownDensity(surface)) : null;
  // On a small net the key has no room in the net's corner. It goes under the
  // readout when the readout is beside the net, which is where a small net
  // has it; were the readout ever below, the key would stay in the corner in
  // its short form.
  const small = layout.netSize < SMALL_NET;
  const keyUnderReadout = small && layout.readout === 'side';
  const key = field ? densityKey(field, small && !keyUnderReadout) : '';
  const keyLine = key && (
    <p
      className={keyUnderReadout ? 'readout-col__key' : 'net__key'}
      data-testid="density-key"
      data-on={density}
      aria-hidden={!density}
    >
      {key}
    </p>
  );
  const readout = <Readout dem={dem} surface={surface} selection={selection} />;
  const help = density && field ? `${NET_HELP} ${densitySentence(field)}` : NET_HELP;
  const style = {
    width: layout.netCardWidth,
    height: layout.netCardHeight,
    '--inner': `${layout.inner}px`,
    '--net': `${layout.netSize}px`,
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
          <>
            <NetCanvas surface={surface} size={layout.netSize} />
            <DensityCanvas surface={surface} size={layout.netSize} on={density} />
          </>
        ) : loading ? (
          <div className="skeleton net__skeleton" aria-busy="true" />
        ) : null}
        <NetLabels size={layout.netSize} />
        {/* Below, so it never covers the app name on a phone. */}
        <InfoTip className="net__info" label="How to read the net" text={help} side="bottom" />
        {/* Before the sun, so Tab reaches it first; over the sun, so it can always be pressed. */}
        {surface && <DensityToggle on={density} onChange={onDensityChange} />}
        {!keyUnderReadout && keyLine}
        {surface && <SunHandle size={layout.netSize} azimuth={sunAzimuth} altitude={sunAltitude} />}
        {surface && <NetMarker surface={surface} size={layout.netSize} selection={selection} />}
      </div>
      {keyUnderReadout ? (
        // The column is there whether or not the layer has been counted, so
        // the readout is not rebuilt when the key first appears.
        <div className="readout-col" data-key={density && key !== ''}>
          {readout}
          {keyLine}
        </div>
      ) : (
        readout
      )}
      <p id="net-help" className="visually-hidden">
        {help}
      </p>
    </section>
  );
}
