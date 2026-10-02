import { useCallback, useEffect, useState } from 'react';
import { DemError, type DemErrorReason, loadDem } from '../terrain/dem';
import { computeSurface } from '../terrain/surface';
import type { Dem, Surface } from '../terrain/types';

/** One entry of public/dems/dems.json. */
export interface DemEntry {
  id: string;
  name: string;
  place: string;
  file: string;
  /** Optional pixel dimensions. They let the layout settle before the file loads. */
  width?: number;
  height?: number;
}

export interface LoadedDem {
  dem: Dem;
  surface: Surface;
}

export type DemState =
  | { status: 'loading'; previous?: LoadedDem }
  | ({ status: 'ready' } & LoadedDem)
  | { status: 'error'; reason: DemErrorReason };

export const MAX_DEMS = 4;
const DEM_FOLDER = `${import.meta.env.BASE_URL}dems/`;

async function fetchEntries(): Promise<DemEntry[]> {
  let list: unknown;
  try {
    const response = await fetch(`${DEM_FOLDER}dems.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    list = await response.json();
  } catch {
    throw new DemError('load', 'Could not read the DEM list.');
  }
  if (!Array.isArray(list) || list.length === 0) {
    throw new DemError('load', 'The DEM list is empty.');
  }
  if (list.length > MAX_DEMS) {
    console.warn(`dems.json lists ${list.length} DEMs; only the first ${MAX_DEMS} are shown.`);
  }
  return list.slice(0, MAX_DEMS) as DemEntry[];
}

/** Loads the DEM list and the selected DEM, and reloads when the selection changes. */
export function useDems() {
  const [entries, setEntries] = useState<DemEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [state, setState] = useState<DemState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Set when the selection changes again, so a slow earlier load cannot
    // replace the DEM chosen last.
    let cancelled = false;
    setState((current) => ({
      status: 'loading',
      previous:
        current.status === 'ready'
          ? { dem: current.dem, surface: current.surface }
          : current.status === 'loading'
            ? current.previous
            : undefined,
    }));

    (async () => {
      try {
        let list = entries;
        if (list.length === 0) {
          list = await fetchEntries();
          if (cancelled) return;
          setEntries(list);
        }
        const entry = list.find((item) => item.id === activeId) ?? list[0];
        const dem = await loadDem(DEM_FOLDER + entry.file);
        const surface = computeSurface(dem);
        if (!cancelled) setState({ status: 'ready', dem, surface });
      } catch (error) {
        if (cancelled) return;
        setState({ status: 'error', reason: error instanceof DemError ? error.reason : 'load' });
      }
    })();

    return () => {
      cancelled = true;
    };
    // `entries` is read, not watched: it only changes inside this effect.
  }, [activeId, attempt]);

  const active = entries.find((item) => item.id === activeId) ?? entries[0] ?? null;
  const select = useCallback((id: string) => setActiveId(id), []);
  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  return { entries, active, state, select, retry };
}
