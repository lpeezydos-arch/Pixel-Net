/**
 * Where the view's string is kept: after `#` in the address, and on the
 * device. The github.io origin is shared with other sites, hence the prefix.
 */
export const VIEW_KEY = 'pixel-net:view';

/** The view written after `#` in the address, or '' when there is none. */
export function readFragment(): string {
  return window.location.hash.replace(/^#/, '');
}

/** The view saved on this device, or '' when there is none or storage is closed to us. */
export function readSaved(): string {
  try {
    return window.localStorage.getItem(VIEW_KEY) ?? '';
  } catch {
    return '';
  }
}

/** The page's address with `view` as its fragment: the link that reopens the view. */
export function linkTo(view: string): string {
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}${view ? `#${view}` : ''}`;
}

/**
 * Puts the view in the address bar, in place, and saves it on this device.
 * Either can be refused (a private window, Safari's limit on address
 * changes); the app carries on without it.
 */
export function writeView(view: string): void {
  try {
    if (readFragment() !== view) window.history.replaceState(window.history.state, '', linkTo(view));
  } catch {
    // The address stays as it was.
  }
  try {
    if (view) window.localStorage.setItem(VIEW_KEY, view);
    else window.localStorage.removeItem(VIEW_KEY);
  } catch {
    // Nothing is saved.
  }
}
