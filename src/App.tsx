import * as Tooltip from '@radix-ui/react-tooltip';
import { useMotionValue } from 'motion/react';
import { type CSSProperties, useCallback, useMemo, useRef, useState } from 'react';
import { NetCard } from './components/NetCard';
import { TerrainCard } from './components/TerrainCard';
import { TitleBar } from './components/TitleBar';
import { announce } from './components/announce';
import { useCoarsePointer } from './hooks/useCoarsePointer';
import { useElementSize } from './hooks/useElementSize';
import { computeLayout } from './layout';
import { useDems } from './state/useDems';
import { useViewPersistence } from './state/useViewPersistence';
import { decodeView } from './state/view';
import { readFragment, readSaved } from './state/viewStore';
import { describeReadout, readoutFor } from './terrain/format';

// The hint names the gesture the screen has, and the keys once the terrain
// has keyboard focus. A touch screen is told how to let go of a selection
// until it has done so once.
const TOUCH_HINT = 'Drag on the terrain to inspect a pixel';
const POINTER_HINT = 'Click or drag on the terrain to inspect a pixel';
const KEYBOARD_HINT = 'Arrow keys choose a pixel · Shift moves ten';
const CLEAR_HINT = 'Double-tap to clear';

export function App() {
  // The view to open on: the one in the link, or else the one saved on this device.
  const [start] = useState(() => decodeView(readFragment() || readSaved()));
  const { entries, active, state, select, retry } = useDems(start.dem);
  const stageRef = useRef<HTMLElement>(null);
  const stage = useElementSize(stageRef);
  const coarse = useCoarsePointer();
  const selection = useMotionValue(-1); // index of the selected pixel, or −1
  const sunAzimuth = useMotionValue(start.sun.azimuth);
  const sunAltitude = useMotionValue(start.sun.altitude);
  const [hasSelection, setHasSelection] = useState(false);
  const [clearedOnce, setClearedOnce] = useState(false);
  const [terrainFocused, setTerrainFocused] = useState(false);
  const announceRef = useRef<HTMLParagraphElement>(null);

  // While another DEM loads, the one before it stays on screen.
  const shown =
    state.status === 'ready' ? state : state.status === 'loading' ? state.previous : undefined;
  const surface = shown?.surface ?? null;

  const sized =
    state.status === 'ready' ? state.dem : active?.width && active.height ? active : shown?.dem;
  const aspect = sized?.width && sized.height ? sized.width / sized.height : 1;
  const layout = computeLayout(stage.width, stage.height, aspect);

  const ready = state.status === 'ready' && active ? { place: active.place, dem: state.dem } : null;
  const cell = ready ? `${Number(ready.dem.cellSize.toFixed(2))} m pixels` : '';
  const facts = ready ? `${ready.place} · ${cell} · ${ready.dem.width} × ${ready.dem.height}` : '';
  // The clear hint takes the place of the dimensions, so the line still fits a phone.
  const factsWithClearHint = ready ? `${CLEAR_HINT} · ${ready.place} · ${cell}` : '';
  const hint = terrainFocused ? KEYBOARD_HINT : coarse ? TOUCH_HINT : POINTER_HINT;
  const caption = !ready ? '' : hasSelection ? (coarse && !clearedOnce ? factsWithClearHint : facts) : hint;

  const selectDem = useCallback(
    (id: string) => {
      if (id === active?.id) return;
      selection.set(-1);
      setHasSelection(false);
      announce(announceRef.current, '');
      select(id);
    },
    [active?.id, selection, select],
  );

  const handlePress = useCallback(() => setHasSelection(true), []);

  // Announce where a drag ended or a key press landed, not every pixel on the way.
  const handleSettle = useCallback(() => {
    setHasSelection(true);
    if (state.status === 'ready') {
      announce(announceRef.current, describeReadout(readoutFor(state.dem, state.surface, selection.get())));
    }
  }, [state, selection]);

  const handleClear = useCallback(() => {
    setHasSelection(false);
    setClearedOnce(true);
    announce(announceRef.current, 'Selection cleared');
  }, []);

  // A pixel from a link, or from the saved view, is selected once its DEM has loaded.
  const loaded = useMemo(
    () => (state.status === 'ready' ? { id: state.id, width: state.dem.width, height: state.dem.height } : null),
    [state],
  );
  useViewPersistence({
    start,
    entries,
    activeId: active?.id ?? null,
    loaded,
    selection,
    onRestore: setHasSelection,
  });

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
        onClear={handleClear}
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
        <p ref={announceRef} className="visually-hidden" aria-live="polite" data-testid="announcement" />
      </div>
    </Tooltip.Provider>
  );
}
