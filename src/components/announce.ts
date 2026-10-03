const ANNOUNCE_GAP_MS = 60; // the region must be seen empty before the words return
const pending = new WeakMap<HTMLElement, number>();

/**
 * Writes `text` into a live region so that it is spoken even when it is the
 * same text as last time: a live region only speaks when its text changes,
 * so the region is emptied first and the words written back a moment later.
 * An empty `text` just clears it.
 */
export function announce(region: HTMLElement | null, text: string): void {
  if (!region) return;
  const timer = pending.get(region);
  if (timer !== undefined) window.clearTimeout(timer);
  region.textContent = '';
  if (!text) return;
  pending.set(
    region,
    window.setTimeout(() => {
      pending.delete(region);
      region.textContent = text;
    }, ANNOUNCE_GAP_MS),
  );
}
