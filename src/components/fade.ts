const EASE_OUT = 'cubic-bezier(0.22, 0.61, 0.36, 1)'; // --ease-out

/** Milliseconds of a duration token such as `--t-base`, as it applies to `element`. */
export function tokenMs(element: Element, token: string): number {
  const raw = getComputedStyle(element).getPropertyValue(token).trim();
  const value = parseFloat(raw);
  if (!Number.isFinite(value)) return 0;
  return raw.endsWith('ms') ? value : value * 1000;
}

/** Fades `element` in over a duration token. Does nothing under reduced motion. */
export function fadeIn(element: HTMLElement, token: string): void {
  const duration = tokenMs(element, token);
  if (duration > 0) {
    element.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing: EASE_OUT });
  }
}

/**
 * Copies what `canvas` shows into `ghost` and fades the ghost out, so that a
 * new drawing on `canvas` appears to crossfade from the old one.
 */
export function leaveGhost(canvas: HTMLCanvasElement, ghost: HTMLCanvasElement, token: string): void {
  if (canvas.width === 0 || canvas.height === 0) return;
  ghost.width = canvas.width;
  ghost.height = canvas.height;
  const context = ghost.getContext('2d');
  if (!context) return;
  context.drawImage(canvas, 0, 0);
  const clear = () => context.clearRect(0, 0, ghost.width, ghost.height);
  const duration = tokenMs(ghost, token);
  if (duration > 0) {
    ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: EASE_OUT }).onfinish = clear;
  } else {
    clear();
  }
}
