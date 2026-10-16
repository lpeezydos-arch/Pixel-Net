import { OPT_OUT_KEY } from './arrival';
import { type Tracker, createTracker } from './tracker';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * The one tracker. Its events reach Google Analytics once `startAnalytics`
 * has loaded the tag, and go nowhere otherwise: on a dev server, in a test
 * build, on a device that opted out, or where the tag is blocked.
 */
export const analytics: Tracker = createTracker((name, params) => window.gtag?.('event', name, params));

function optedOut(): boolean {
  try {
    return window.localStorage.getItem(OPT_OUT_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Loads the Google tag for `id` and tells it what kind of device this is.
 * Nothing loads without an ID, or on a device that has the opt-out key in
 * storage. The counts go when the page is hidden or closed, which on a
 * phone is the moment the user switches apps.
 */
export function startAnalytics(id: string | undefined): void {
  if (!id || optedOut()) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    // The tag reads the arguments object itself, not a copy of it.
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());
  // Set before `config`, so the first page view carries them too.
  window.gtag('set', 'user_properties', {
    display_mode: matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
    pointer: matchMedia('(pointer: coarse)').matches ? 'coarse' : 'fine',
  });
  window.gtag('config', id);
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') analytics.flush();
  });
  window.addEventListener('pagehide', () => analytics.flush());
}
