import { describe, expect, it } from 'vitest';
import { howToLines } from './howTo';

describe('howToLines', () => {
  it('names the gestures of a touch screen', () => {
    expect(howToLines(true)).toEqual([
      'Drag on the terrain to inspect a pixel.',
      'Double-tap the terrain to clear it.',
      'Drag the sun on the net to change the light.',
      'Double-tap the sun to put it back.',
      'The share button sends a link to this view.',
      'The layers button on the net shows density.',
      'The i on the net explains how to read it.',
    ]);
  });

  it('names the mouse and the keys otherwise', () => {
    expect(howToLines(false)).toEqual([
      'Click or drag on the terrain to inspect a pixel.',
      'Arrow keys move one pixel, and Shift moves ten; Escape clears it.',
      'Drag the sun on the net to change the light.',
      'Double-click the sun to put it back.',
      'The share button sends a link to this view.',
      'The layers button on the net shows density.',
      'The i on the net explains how to read it.',
    ]);
  });
});
