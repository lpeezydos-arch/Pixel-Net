import type { MotionValue } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';
import { toIndex, toPixel } from '../terrain/pick';
import type { DemEntry } from './useDems';
import { type View, decodeView, encodeSharedView, encodeView, namesView, pixelInside } from './view';
import { readFragment, writeView } from './viewStore';

const WRITE_AFTER_MS = 400; // quiet time after the last change before the view is written

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
  sunAzimuth: MotionValue<number>;
  sunAltitude: MotionValue<number>;
  /** Whether the density layer is on. */
  density: boolean;
  /** Turns the density layer on or off, as its button does. */
  onDensity: (on: boolean) => void;
  /** Switches to another DEM, as the picker does. */
  onSelectDem: (id: string) => void;
  /** A view was applied; `selected` says whether it selected a pixel. */
  onRestore: (selected: boolean) => void;
}

/**
 * Keeps the view (which DEM, which pixel, where the sun is, whether the
 * density layer is on) in step with the
 * address bar and with what is saved on the device.
 *
 * Reading: the view to open on has its pixel selected once its DEM has
 * loaded, and a link pasted into the open tab is applied the same way.
 * Writing: 400 ms after the last change, so never during a drag, and at once
 * when the page is hidden.
 *
 * Returns a function that gives the view as text, or null before the list
 * of DEMs has loaded. Asked for the `shared` form, it gives the view as a
 * shared link writes it, which always names its DEM.
 */
export function useViewPersistence(options: ViewPersistenceOptions): (shared?: boolean) => string | null {
  const { start, selection, sunAzimuth, sunAltitude } = options;
  // What the callbacks below read, kept current without rebuilding them.
  const latest = useRef(options);
  latest.current = options;
  // The view still to be applied, while its DEM is on the way.
  const waiting = useRef<View | null>(start);
  const timer = useRef<number | undefined>(undefined);

  const viewText = useCallback(
    (shared = false): string | null => {
      const { entries, activeId, loaded, density } = latest.current;
      if (!activeId || entries.length === 0) return null;
      const index = selection.get();
      // While another DEM loads there is no pixel to name: the switch cleared it.
      const pixel = index >= 0 && loaded?.id === activeId ? toPixel(index, loaded.width) : null;
      const encode = shared ? encodeSharedView : encodeView;
      return encode(
        { dem: activeId, pixel, sun: { azimuth: sunAzimuth.get(), altitude: sunAltitude.get() }, density },
        entries[0].id,
      );
    },
    [selection, sunAzimuth, sunAltitude],
  );

  const write = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    // A view still waiting for its DEM must not be overwritten by what is on screen.
    if (waiting.current) return;
    const text = viewText();
    if (text !== null) writeView(text);
  }, [viewText]);

  const schedule = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(write, WRITE_AFTER_MS);
  }, [write]);

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
    // The address and the saved view now say what is shown, which corrects
    // a link with a part that could not be used.
    write();
  }, [selection, write]);

  /** Applies a view read from the address while the app is open. */
  const apply = useCallback(
    (view: View) => {
      const { entries, activeId, onSelectDem, onDensity } = latest.current;
      sunAzimuth.set(view.sun.azimuth);
      sunAltitude.set(view.sun.altitude);
      onDensity(view.density);
      // The view is written below, before the next render brings the new
      // value: without this it would be written with the layer as it was.
      latest.current = { ...latest.current, density: view.density };
      waiting.current = view;
      // A DEM that is not in the list means the first, as it does on opening.
      const wanted = entries.find((entry) => entry.id === view.dem)?.id ?? entries[0]?.id;
      if (wanted && wanted !== activeId) onSelectDem(wanted); // the pixel waits for its DEM
      else settle();
    },
    [sunAzimuth, sunAltitude, settle],
  );

  // The waiting view is applied when its DEM arrives.
  useEffect(settle, [settle, options.loaded, options.activeId]);

  // Whatever changes the view starts the timer: a drag, a key, a reset.
  useEffect(() => {
    const stops = [
      selection.on('change', schedule),
      sunAzimuth.on('change', schedule),
      sunAltitude.on('change', schedule),
    ];
    return () => {
      for (const stop of stops) stop();
      window.clearTimeout(timer.current);
    };
  }, [selection, sunAzimuth, sunAltitude, schedule]);

  // So does a switch of DEM.
  useEffect(() => {
    if (options.activeId) schedule();
  }, [options.activeId, schedule]);

  // And so does the density layer turning on or off.
  useEffect(() => {
    schedule();
  }, [options.density, schedule]);

  // A page that is hidden or closed may never run its timer: write now.
  useEffect(() => {
    const flush = () => {
      if (timer.current !== undefined) write();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [write]);

  // Another link pasted into the open tab, or the address edited by hand.
  // Our own writes replace the address in place and do not fire this.
  useEffect(() => {
    const onHashChange = () => {
      const text = readFragment();
      // An emptied address, or one that names no view (such as `#top`), is
      // left alone; the next change fills it in again.
      if (namesView(text)) apply(decodeView(text));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [apply]);

  return viewText;
}
