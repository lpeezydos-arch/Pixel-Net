import { useSyncExternalStore } from 'react';

const QUERY = '(pointer: coarse)';

const subscribe = (onChange: () => void) => {
  const media = matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};

/** True on a touch screen, where a drag is the gesture and a tap the idiom. */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(subscribe, () => matchMedia(QUERY).matches, () => false);
}
