import type { MotionValue } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';
import { toIndex } from '../terrain/pick';
import type { DemEntry } from './useDems';
import { type View, pixelInside } from './view';

/** The DEM on screen, once it has loaded. */
export interface LoadedView {
  id: string;
  width: number;
  height: number;
}

interface ViewPersistenceOptions {
  /** The view to open on. */
  start: View;
  /** The DEMs in the list; empty until the list has loaded. */
  entries: DemEntry[];
  /** The DEM being shown or loaded, or null before the list has loaded. */
  activeId: string | null;
  /** The DEM on screen, or null while one loads or after a failure. */
  loaded: LoadedView | null;
  /** Index of the selected pixel, or −1. */
  selection: MotionValue<number>;
  /** A view was applied; `selected` says whether it selected a pixel. */
  onRestore: (selected: boolean) => void;
}

/**
 * Opens the app on a view: selects the view's pixel once the DEM it belongs
 * to has loaded. The sun and the DEM are given their starting values by the
 * caller, before the first paint.
 */
export function useViewPersistence(options: ViewPersistenceOptions): void {
  const { start, selection, loaded, activeId } = options;
  // What `settle` reads, kept current without rebuilding it.
  const latest = useRef(options);
  latest.current = options;
  // The view still to be applied, while its DEM is on the way.
  const waiting = useRef<View | null>(start);

  const settle = useCallback(() => {
    const view = waiting.current;
    const { entries, activeId, loaded, onRestore } = latest.current;
    // Nothing to apply, or the DEM on screen is not yet the one being opened.
    if (!view || !loaded || loaded.id !== activeId) return;
    waiting.current = null;
    // A pixel belongs to the DEM its view names; with no name, to the first.
    // If the user has chosen another DEM since, the pixel is not theirs.
    const pixel = (view.dem ?? entries[0]?.id) === loaded.id ? view.pixel : null;
    if (pixel && pixelInside(pixel, loaded.width, loaded.height)) {
      selection.set(toIndex(pixel, loaded.width));
      onRestore(true);
    } else {
      if (selection.get() >= 0) selection.set(-1);
      onRestore(false);
    }
  }, [selection]);

  useEffect(settle, [settle, loaded, activeId]);
}
