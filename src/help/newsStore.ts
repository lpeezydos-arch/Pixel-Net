/**
 * Where the newest news entry this device has shown is kept. The github.io
 * origin is shared with other sites, hence the prefix.
 */
export const NEWS_SEEN_KEY = 'pixel-net:news-seen';

/** The stored text as an entry number. Nothing stored, or anything that is not a whole number, is 0. */
export function parseSeen(raw: string | null): number {
  if (raw === null || !/^\d+$/.test(raw)) return 0;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : 0;
}

/** The newest entry this device has shown, or 0 when there is none or storage is closed to us. */
export function readSeen(): number {
  try {
    return parseSeen(window.localStorage.getItem(NEWS_SEEN_KEY));
  } catch {
    return 0;
  }
}

/** Remembers that every entry up to `id` has been shown. It can be refused (a private window). */
export function writeSeen(id: number): void {
  try {
    window.localStorage.setItem(NEWS_SEEN_KEY, String(id));
  } catch {
    // Nothing is remembered, and the dot comes back on the next visit.
  }
}
