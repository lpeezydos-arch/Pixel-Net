import * as Tooltip from '@radix-ui/react-tooltip';
import { useMotionValue } from 'motion/react';
import { type CSSProperties, useCallback, useRef, useState } from 'react';
import { NetCard } from './components/NetCard';
import { TerrainCard } from './components/TerrainCard';
import { TitleBar } from './components/TitleBar';
import { useCoarsePointer } from './hooks/useCoarsePointer';
import { useElementSize } from './hooks/useElementSize';
import { computeLayout } from './layout';
import { useDems } from './state/useDems';
import { describeReadout, readoutFor } from './terrain/format';
import { DEFAULT_SUN } from './terrain/net';

// The hint names the gesture the screen has, and the keys once the terrain
// has keyboard focus.
const TOUCH_HINT = 'Drag on the terrain to inspect a pixel';
const POINTER_HINT = 'Click or drag on the terrain to inspect a pixel';
const KEYBOARD_HINT = 'Arrow keys choose a pixel · Shift moves ten';

export function App() {
  const { entries, active, state, select, retry } = useDems();
  const stageRef = useRef<HTMLElement>(null);
  const stage = useElementSize(stageRef);
  const coarse = useCoarsePointer();
  const selection = useMotionValue(-1); // index of the selected pixel, or −1
  const sunAzimuth = useMotionValue(DEFAULT_SUN.azimuth);
  const sunAltitude = useMotionValue(DEFAULT_SUN.altitude);
  const [hasSelection, setHasSelection] = useState(false);
  const [terrainFocused, setTerrainFocused] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  // While another DEM loads, the one before it stays on screen.
  const shown =
    state.status === 'ready' ? state : state.status === 'loading' ? state.previous : undefined;
  const surface = shown?.surface ?? null;

  const sized =
    state.status === 'ready' ? state.dem : active?.width && active.height ? active : shown?.dem;
  const aspect = sized?.width && sized.height ? sized.width / sized.height : 1;
  const layout = computeLayout(stage.width, stage.height, aspect);

  const facts =
    state.status === 'ready' && active
      ? `${active.place} · ${Number(state.dem.cellSize.toFixed(2))} m pixels · ${state.dem.width} × ${state.dem.height}`
      : '';
  const hint = terrainFocused ? KEYBOARD_HINT : coarse ? TOUCH_HINT : POINTER_HINT;
  const caption = state.status !== 'ready' ? '' : hasSelection ? facts : hint;

  const selectDem = useCallback(
    (id: string) => {
      if (id === active?.id) return;
      selection.set(-1);
      setHasSelection(false);
      setAnnouncement('');
      select(id);
    },
    [active?.id, selection, select],
  );

  const handlePress = useCallback(() => setHasSelection(true), []);

  // Announce where a drag ended or a key press landed, not every pixel on the way.
  const handleSettle = useCallback(() => {
    setHasSelection(true);
    if (state.status === 'ready') {
      setAnnouncement(describeReadout(readoutFor(state.dem, state.surface, selection.get())));
    }
  }, [state, selection]);

  const netCard = (
    <NetCard
      key="net"
      layout={layout}
      dem={shown?.dem ?? null}
      surface={surface}
      loading={state.status === 'loading'}
      selection={selection}
      sunAzimuth={sunAzimuth}
      sunAltitude={sunAltitude}
    />
  );
  const terrainColumn = (
    <div key="terrain" className="terrain-col">
      <TerrainCard
        width={layout.terrainWidth}
        height={layout.terrainHeight}
        surface={surface}
        error={state.status === 'error' ? state.reason : null}
        onRetry={retry}
        sunAzimuth={sunAzimuth}
        sunAltitude={sunAltitude}
        selection={selection}
        interactive={state.status === 'ready'}
        onPress={handlePress}
        onSettle={handleSettle}
        onFocusVisible={setTerrainFocused}
      />
      <p className="caption" data-testid="caption">
        {caption}
      </p>
    </div>
  );

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="app">
        <TitleBar entries={entries} activeId={active?.id ?? null} onSelect={selectDem} />
        <main
          ref={stageRef}
          className="stage"
          data-mode={layout.mode}
          data-status={state.status}
          data-dem={active?.id}
          style={{ '--gap': `${layout.gap}px` } as CSSProperties}
        >
          {/* Reading order follows the eye: the net above the terrain when
              stacked, the terrain left of the net when side by side. */}
          {layout.mode === 'wide' ? [terrainColumn, netCard] : [netCard, terrainColumn]}
        </main>
        <p className="visually-hidden" aria-live="polite" data-testid="announcement">
          {announcement}
        </p>
      </div>
    </Tooltip.Provider>
  );
}
