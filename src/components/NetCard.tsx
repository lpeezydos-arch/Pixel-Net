import type { CSSProperties } from 'react';
import type { Layout } from '../layout';
import type { Surface } from '../terrain/types';
import { NetCanvas } from './NetCanvas';
import { NetFrame, NetLabels } from './NetFrame';

interface NetCardProps {
  layout: Layout;
  /** The surface to show, or null while the first DEM loads or after a failure. */
  surface: Surface | null;
  loading: boolean;
}

export function NetCard({ layout, surface, loading }: NetCardProps) {
  const style = {
    width: layout.netCardWidth,
    height: layout.netCardHeight,
    '--inner': `${layout.inner}px`,
  } as CSSProperties;

  return (
    <section className="card net-card" data-readout={layout.readout} style={style} aria-label="Net">
      <div className="net" style={{ width: layout.netSize, height: layout.netSize }}>
        <NetFrame size={layout.netSize} />
        {surface ? (
          <NetCanvas surface={surface} size={layout.netSize} />
        ) : loading ? (
          <div className="skeleton net__skeleton" aria-busy="true" />
        ) : null}
        <NetLabels size={layout.netSize} />
      </div>
    </section>
  );
}
