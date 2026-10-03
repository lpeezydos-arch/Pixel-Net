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
