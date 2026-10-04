const SUN = 'Drag the sun on the net to change the light.';
const SHARE = 'The share button sends a link to this view.';
const DENSITY = 'The layers button on the net shows density.';
const NET = 'The i on the net explains how to read it.';

/**
 * How to use the screen, one sentence a line. Like the caption's hint, the
 * lines name the gestures the device has. How to read the net is left to the
 * net's own tooltip, which the last line points to.
 */
export function howToLines(coarse: boolean): string[] {
  return coarse
    ? [
        'Drag on the terrain to inspect a pixel.',
        'Double-tap the terrain to clear it.',
        SUN,
        'Double-tap the sun to put it back.',
        SHARE,
        DENSITY,
        NET,
      ]
    : [
        'Click or drag on the terrain to inspect a pixel.',
        'Arrow keys move one pixel, and Shift moves ten; Escape clears it.',
        SUN,
        'Double-click the sun to put it back.',
        SHARE,
        DENSITY,
        NET,
      ];
}
