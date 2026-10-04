import list from './news.json';

/** One change worth telling a user about. */
export interface NewsEntry {
  /** Rises by one with each entry. Two entries can share a date, so the date cannot say which were seen. */
  id: number;
  /** The day it shipped, as YYYY-MM-DD. */
  date: string;
  /** One plain sentence, written for someone using the app. */
  text: string;
}

/** Every entry, oldest first. `CHANGELOG.md` is written from the same file. */
export const NEWS: NewsEntry[] = list;

/** The last `n` entries, newest first. */
export function latest(entries: NewsEntry[], n: number): NewsEntry[] {
  return n > 0 ? entries.slice(-n).reverse() : [];
}

/** The highest id in the list, or 0 when it is empty. */
export function newestId(entries: NewsEntry[]): number {
  return entries.reduce((highest, entry) => Math.max(highest, entry.id), 0);
}

/** True when the device, having shown everything up to `seen`, has not shown `entry`. */
export function isUnseen(entry: NewsEntry, seen: number): boolean {
  return entry.id > seen;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-03" as "3 Oct 2026". The date is read as it is written, with no time zone. */
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}
