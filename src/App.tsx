import { useMotionValue } from 'motion/react';
import { type CSSProperties, useRef } from 'react';
import { NetCard } from './components/NetCard';
import { TerrainCard } from './components/TerrainCard';
import { TitleBar } from './components/TitleBar';
import { useElementSize } from './hooks/useElementSize';
import { computeLayout } from './layout';
import { useDems } from './state/useDems';
import { DEFAULT_SUN } from './terrain/net';

const HINT = 'Drag on the terrain to inspect a pixel';

export function App() {
  const { entries, active, state, select, retry } = useDems();
  const stageRef = useRef<HTMLElement>(null);
  const stage = useElementSize(stageRef);
  const sunAzimuth = useMotionValue(DEFAULT_SUN.azimuth);
  const sunAltitude = useMotionValue(DEFAULT_SUN.altitude);

  // While another DEM loads, the one before it stays on screen.
  const shown =
    state.status === 'ready' ? state : state.status === 'loading' ? state.previous : undefined;
  const surface = shown?.surface ?? null;

  const sized =
    state.status === 'ready' ? state.dem : active?.width && active.height ? active : shown?.dem;
  const aspect = sized?.width && sized.height ? sized.width / sized.height : 1;
  const layout = computeLayout(stage.width, stage.height, aspect);

  const caption = state.status === 'ready' ? HINT : '';

  return (
    <div className="app">
      <TitleBar entries={entries} activeId={active?.id ?? null} onSelect={select} />
      <main
        ref={stageRef}
        className="stage"
        data-mode={layout.mode}
        data-status={state.status}
        data-dem={active?.id}
        style={{ '--gap': `${layout.gap}px` } as CSSProperties}
      >
        <NetCard layout={layout} surface={surface} loading={state.status === 'loading'} />
        <div className="terrain-col">
          <TerrainCard
            width={layout.terrainWidth}
            height={layout.terrainHeight}
            surface={surface}
            error={state.status === 'error' ? state.reason : null}
            onRetry={retry}
            sunAzimuth={sunAzimuth}
            sunAltitude={sunAltitude}
          />
          <p className="caption" data-testid="caption">
            {caption}
          </p>
        </div>
      </main>
    </div>
  );
}
