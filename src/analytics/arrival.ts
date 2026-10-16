import { namesView } from '../state/view';

/** How the app was opened: from a link that names a view, from the view saved on the device, or fresh. */
export type Arrival = 'link' | 'saved' | 'default';

/** The storage key that keeps a device out of the numbers. The github.io origin is shared, hence the prefix. */
export const OPT_OUT_KEY = 'pixel-net:no-analytics';

export function arrivalSource(fragment: string, saved: string): Arrival {
  if (namesView(fragment)) return 'link';
  if (saved) return 'saved';
  return 'default';
}
