/** What goes with an event. */
export type Params = Record<string, string | number | boolean>;

/** Where events go: Google Analytics, or a list in a test. */
export type Send = (name: string, params: Params) => void;

/** The things counted between flushes. */
export type Counter = 'selections' | 'sun_drags';

export interface Tracker {
  /** Fields that go with every event from now on, such as which DEM is on screen. */
  setContext(context: Params): void;
  /** Sends `name` the first time it is asked to; later calls do nothing. */
  once(name: string, params?: Params): void;
  /** Sends `name` every time. */
  event(name: string, params?: Params): void;
  /** Adds one to a counter. */
  count(counter: Counter): void;
  /** Sends the counters as one `session_counts` event and starts them over. Nothing is sent while they are all 0. */
  flush(): void;
}

const fresh = (): Record<Counter, number> => ({ selections: 0, sun_drags: 0 });

export function createTracker(send: Send): Tracker {
  const sent = new Set<string>();
  let context: Params = {};
  let counts = fresh();
  const event = (name: string, params: Params = {}) => send(name, { ...context, ...params });
  return {
    setContext(next) {
      context = next;
    },
    event,
    once(name, params) {
      if (sent.has(name)) return;
      sent.add(name);
      event(name, params);
    },
    count(counter) {
      counts[counter] += 1;
    },
    flush() {
      if (Object.values(counts).every((n) => n === 0)) return;
      event('session_counts', counts);
      counts = fresh();
    },
  };
}
