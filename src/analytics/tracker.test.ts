import { describe, expect, it } from 'vitest';
import { type Params, createTracker } from './tracker';

/** A tracker whose sends are kept in a list. */
function tracker() {
  const sent: Array<{ name: string; params: Params }> = [];
  const track = createTracker((name, params) => sent.push({ name, params }));
  return { track, sent };
}

describe('once', () => {
  it('sends the first time and never again for the same name', () => {
    const { track, sent } = tracker();
    track.once('select_pixel');
    track.once('select_pixel');
    expect(sent).toEqual([{ name: 'select_pixel', params: {} }]);
  });
});

describe('event', () => {
  it('sends every time', () => {
    const { track, sent } = tracker();
    track.event('share', { outcome: 'shared' });
    track.event('share', { outcome: 'copied' });
    expect(sent.map((s) => s.params.outcome)).toEqual(['shared', 'copied']);
  });
});

describe('context', () => {
  it('goes with every event, and an event can override a field', () => {
    const { track, sent } = tracker();
    track.setContext({ dem: 'gore' });
    track.once('select_pixel');
    track.event('switch_dem', { dem: 'massanutten' });
    expect(sent).toEqual([
      { name: 'select_pixel', params: { dem: 'gore' } },
      { name: 'switch_dem', params: { dem: 'massanutten' } },
    ]);
  });
});

describe('counts', () => {
  it('are sent as one session_counts event by flush, which then starts over', () => {
    const { track, sent } = tracker();
    track.setContext({ dem: 'gore' });
    track.count('selections');
    track.count('selections');
    track.count('sun_drags');
    track.flush();
    track.count('selections');
    track.flush();
    expect(sent).toEqual([
      { name: 'session_counts', params: { dem: 'gore', selections: 2, sun_drags: 1 } },
      { name: 'session_counts', params: { dem: 'gore', selections: 1, sun_drags: 0 } },
    ]);
  });

  it('send nothing when there is nothing to count', () => {
    const { track, sent } = tracker();
    track.flush();
    expect(sent).toEqual([]);
  });
});
