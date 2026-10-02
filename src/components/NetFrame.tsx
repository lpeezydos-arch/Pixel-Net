import { NET_RIM } from '../terrain/cloud';
import { toNet } from '../terrain/net';

const RING_30 = toNet(30, 0).y;
const RING_60 = toNet(60, 0).y;

interface NetLayerProps {
  /** Side of the square the net is drawn in, in CSS pixels. */
  size: number;
}

/** The rim, the 30° and 60° slope rings and the compass cross. Sits under the cloud. */
export function NetFrame({ size }: NetLayerProps) {
  if (size <= 0) return null;
  const c = size / 2;
  const rim = c * NET_RIM;
  return (
    <svg className="net-frame" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle className="net-frame__rim" cx={c} cy={c} r={rim} />
      <circle className="net-frame__line" cx={c} cy={c} r={rim * RING_30} />
      <circle className="net-frame__line" cx={c} cy={c} r={rim * RING_60} />
      <line className="net-frame__line" x1={c} y1={c - rim} x2={c} y2={c + rim} />
      <line className="net-frame__line" x1={c - rim} y1={c} x2={c + rim} y2={c} />
    </svg>
  );
}

/** Compass letters and ring labels. Sits over the cloud. */
export function NetLabels({ size }: NetLayerProps) {
  if (size <= 0) return null;
  const c = size / 2;
  const rim = c * NET_RIM;
  return (
    <svg className="net-labels" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <text x={c} y={c - rim + 16}>N</text>
      <text x={c} y={c + rim - 7}>S</text>
      <text x={c + rim - 10} y={c + 4}>E</text>
      <text x={c - rim + 10} y={c + 4}>W</text>
      <text className="net-labels__ring" x={c + rim * RING_30 + 3} y={c + 14}>30°</text>
      <text className="net-labels__ring" x={c + rim * RING_60 + 3} y={c + 14}>60°</text>
    </svg>
  );
}
