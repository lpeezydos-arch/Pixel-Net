# Help and News Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One button in the title bar opens a sheet that says how to use the app and what has changed in it, with a dot on the button while there is news the device has not shown.

**Architecture:** The news is a hand-written JSON list with pure functions over it, and one number in `localStorage` records the newest entry the device has shown. A help button owns the open state and the dot, and renders a Radix Dialog styled as a bottom sheet on a phone and a centered card on a desktop. A Node script writes the same list out as `CHANGELOG.md`, and a unit test fails when the two differ.

**Tech Stack:** Vite 8, React 19, TypeScript 7 (strict), Radix Tooltip and Radix Dialog, lucide-react, Vitest (node environment), Playwright (Chromium, `phone` and `desktop` projects), Node 22.12 or later.

**Spec:** `docs/superpowers/specs/2026-10-03-help-and-news-design.md`. It extends `docs/superpowers/specs/2026-10-01-pixel-net-design.md` and follows `docs/superpowers/specs/2026-10-03-share-and-restore-design.md`. Read the first of these in full.

## Global Constraints

- Work only in the worktree made for this plan (branch `help-and-news`). Never push.
- One new dependency: `@radix-ui/react-dialog`. Nothing else is added.
- Exact words: button name and tooltip "Help and what's new"; the name while the dot shows "Help and what's new, new changes"; dialog title "Help"; headings "How to use it" and "What's new"; close button "Close"; the mark on an unseen entry reads "New. " to assistive technology.
- Exact values: storage key `pixel-net:news-seen`; the sheet shows the latest 3 entries; the desktop card is 420px wide; the sideways card is 680px wide.
- The how-to lines are the twelve sentences in spec section 3, word for word.
- No news entry names the app or the sheet. The app's name is set only in `VITE_APP_NAME`.
- Styles come from `src/styles/tokens.css`. Do not edit `tokens.css`. The accent (`--accent`, rust) is used for the two news dots and nowhere else in this work. The help button itself is not accent-colored.
- The sheet never scrolls. Do not give it `overflow: auto` or a `max-height`.
- TypeScript is strict with `noUnusedLocals` and `noUnusedParameters`; `npm run build` runs `tsc --noEmit` first and must pass after every task.
- Comments are plain sentences that say why, in the voice of the surrounding code. No emoji. One icon family: lucide.
- Unit tests: `npm test` (Vitest, node environment, files `src/**/*.test.ts`; there is no DOM in them).
- Browser tests need Chromium's libraries on this machine. Always run them as:
  `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test <files>`
  Each run builds the app and serves it on port 4173. If the port is taken, wait a minute and run again.
- Browser tests must not import `src/help/news.ts`: the package is an ES module and Playwright's loader does not take the JSON import. They read `src/help/news.json` with `readFileSync`.
- Commits: a sentence-style subject as in `git log` ("Select a pixel and show it on the net"), a body that says why, and this last line exactly:
  `Claude-Session: https://claude.ai/code/session_0188RNZHUPogarCPaaFF2sKe`

## Review Focus

Conditions the spec implies that are most likely to bite a person. Each has a test in the task that owns the code.

1. Storage is closed to the app (a private window): the dot shows, the sheet opens, the dot clears for the visit, and nothing throws. (Task 3)
2. The remembered value is not a whole number, or is higher than any entry (`abc`, `-1`, `1.5`, `9999`): the first three read as nothing remembered, the last shows no dot. (Tasks 1 and 3)
3. The sheet closes and hands focus back to the help button: the button's tooltip must not open and stay over the title bar, on a phone above all. (Task 3)
4. A press on the dimmed view to close the sheet: it closes the sheet and does not also select the pixel under it. (Task 3)
5. The phone is turned while the sheet is open: the sheet takes the arrangement for the new size and still fits. (Task 4)

## File Structure

| File | Responsibility |
|---|---|
| `src/help/news.json` (create) | The entries, oldest first. The only place a news sentence is written. |
| `src/help/news.ts` (create) | Pure functions over the list: latest, newest id, unseen, date format. |
| `src/help/newsStore.ts` (create) | Reads and writes the one remembered number, guarded. |
| `src/help/howTo.ts` (create) | The six how-to lines for a touch screen or for a pointer. |
| `scripts/make-changelog.mjs` (create) | Writes `CHANGELOG.md` from the list, or prints it with `--print`. |
| `CHANGELOG.md` (create, generated) | Every entry, newest first, grouped by date. |
| `src/components/HelpSheet.tsx` (create) | The dialog's content: the two parts. |
| `src/components/HelpButton.tsx` (create) | The button, the dot, the open state, what is remembered. |
| `src/components/TitleBar.tsx` (modify) | Gains the help button after the share button. |
| `src/app.css` (modify) | The dot, the scrim, the sheet and its arrangements. |
| `e2e/help.spec.ts` (create) | Browser tests for all of the above. |
| `e2e/polish.spec.ts` (modify) | The Tab order and the 360px title bar now include the help button. |

---

### Task 1: The news list, what is remembered, and the how-to lines

**Files:**
- Modify: `tsconfig.json`
- Create: `src/help/news.json`, `src/help/news.ts`, `src/help/newsStore.ts`, `src/help/howTo.ts`
- Test: `src/help/news.test.ts`, `src/help/newsStore.test.ts`, `src/help/howTo.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface NewsEntry { id: number; date: string; text: string }`
  - `const NEWS: NewsEntry[]` (oldest first)
  - `latest(entries: NewsEntry[], n: number): NewsEntry[]` (newest first)
  - `newestId(entries: NewsEntry[]): number` (0 for an empty list)
  - `isUnseen(entry: NewsEntry, seen: number): boolean`
  - `formatDate(date: string): string` (`"2026-10-03"` to `"3 Oct 2026"`)
  - `const NEWS_SEEN_KEY = 'pixel-net:news-seen'`
  - `parseSeen(raw: string | null): number`, `readSeen(): number`, `writeSeen(id: number): void`
  - `howToLines(coarse: boolean): string[]` (six lines)

- [ ] **Step 1: Let TypeScript read the JSON list**

In `tsconfig.json`, add one line to `compilerOptions`, after `"isolatedModules": true,`:

```json
    "resolveJsonModule": true,
```

- [ ] **Step 2: Write the list**

Create `src/help/news.json`. If this task is done on a day other than 2026-10-03, give entry 4 that day's date instead.

```json
[
  {
    "id": 1,
    "date": "2026-10-02",
    "text": "The first version: a hillshade beside a Schmidt net of every pixel, with a sun you can drag."
  },
  {
    "id": 2,
    "date": "2026-10-03",
    "text": "The app reopens on the DEM, pixel and sun you left."
  },
  {
    "id": 3,
    "date": "2026-10-03",
    "text": "The share button sends a link that reopens this view, with a picture of it."
  },
  {
    "id": 4,
    "date": "2026-10-03",
    "text": "The help button shows how to use the app and what has changed."
  }
]
```

- [ ] **Step 3: Write the failing tests**

Create `src/help/news.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { NEWS, type NewsEntry, formatDate, isUnseen, latest, newestId } from './news';

const entry = (id: number): NewsEntry => ({ id, date: '2026-10-03', text: `Change ${id}.` });
const five = [1, 2, 3, 4, 5].map(entry);

describe('latest', () => {
  it('gives the last entries, newest first', () => {
    expect(latest(five, 3).map((e) => e.id)).toEqual([5, 4, 3]);
  });

  it('gives what there is when the list is short', () => {
    expect(latest([entry(1), entry(2)], 3).map((e) => e.id)).toEqual([2, 1]);
  });

  it('gives nothing from an empty list, or when asked for none', () => {
    expect(latest([], 3)).toEqual([]);
    expect(latest(five, 0)).toEqual([]);
  });

  it('leaves the list as it was', () => {
    const list = [1, 2, 3].map(entry);
    latest(list, 2);
    expect(list.map((e) => e.id)).toEqual([1, 2, 3]);
  });
});

describe('newestId', () => {
  it('is the highest id', () => {
    expect(newestId(five)).toBe(5);
  });

  it('is 0 for an empty list', () => {
    expect(newestId([])).toBe(0);
  });
});

describe('isUnseen', () => {
  it('is true only for an entry newer than the one remembered', () => {
    expect(isUnseen(entry(3), 2)).toBe(true);
    expect(isUnseen(entry(3), 3)).toBe(false);
    expect(isUnseen(entry(3), 9)).toBe(false);
    expect(isUnseen(entry(1), 0)).toBe(true);
  });
});

describe('formatDate', () => {
  it('writes the day, a short month and the year', () => {
    expect(formatDate('2026-10-03')).toBe('3 Oct 2026');
    expect(formatDate('2027-01-31')).toBe('31 Jan 2027');
    expect(formatDate('2026-12-09')).toBe('9 Dec 2026');
  });
});

describe('the list', () => {
  it('numbers its entries from 1, rising by one', () => {
    expect(NEWS.map((e) => e.id)).toEqual(NEWS.map((_, i) => i + 1));
  });

  it('dates each entry with a real day, never earlier than the entry before', () => {
    for (const { date } of NEWS) {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10)).toBe(date);
    }
    const dates = NEWS.map((e) => e.date);
    expect(dates).toEqual([...dates].sort());
  });

  it('gives each entry one sentence on one line', () => {
    for (const { text } of NEWS) {
      expect(text).toMatch(/^[A-Z].*\.$/);
      expect(text).not.toMatch(/\n/);
    }
  });

  it('does not name the app, which is set in one place', () => {
    for (const { text } of NEWS) expect(text).not.toMatch(/pixel net/i);
  });
});
```

Create `src/help/newsStore.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { NEWS_SEEN_KEY, parseSeen } from './newsStore';

describe('parseSeen', () => {
  it('reads a whole number', () => {
    expect(parseSeen('4')).toBe(4);
    expect(parseSeen('0')).toBe(0);
    expect(parseSeen('9999')).toBe(9999);
  });

  it('reads nothing stored as 0', () => {
    expect(parseSeen(null)).toBe(0);
    expect(parseSeen('')).toBe(0);
  });

  it('reads anything that is not a whole number as 0', () => {
    for (const raw of ['abc', '-1', '1.5', '4 ', ' 4', '4px', '1e3', 'NaN', '99999999999999999999']) {
      expect(parseSeen(raw), raw).toBe(0);
    }
  });
});

describe('the key', () => {
  it('carries the prefix the saved view uses, because the origin is shared', () => {
    expect(NEWS_SEEN_KEY).toBe('pixel-net:news-seen');
  });
});
```

Create `src/help/howTo.test.ts`:

```ts
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
      'The i on the net explains how to read it.',
    ]);
  });
});
```

- [ ] **Step 4: Run the tests to see them fail**

Run: `npx vitest run src/help`
Expected: FAIL. All three files fail to resolve `./news`, `./newsStore` and `./howTo`.

- [ ] **Step 5: Write the modules**

Create `src/help/news.ts`:

```ts
import list from './news.json';

/** One change worth telling a user about. */
export interface NewsEntry {
  /** Rises by one with each entry. Two entries can share a date, so the date cannot say which were seen. */
  id: number;
  /** The day it shipped, as YYYY-MM-DD. */
  date: string;
  /** One plain sentence, written for someone using the app. */
  text: string;
}

/** Every entry, oldest first. `CHANGELOG.md` is written from the same file. */
export const NEWS: NewsEntry[] = list;

/** The last `n` entries, newest first. */
export function latest(entries: NewsEntry[], n: number): NewsEntry[] {
  return n > 0 ? entries.slice(-n).reverse() : [];
}

/** The highest id in the list, or 0 when it is empty. */
export function newestId(entries: NewsEntry[]): number {
  return entries.reduce((highest, entry) => Math.max(highest, entry.id), 0);
}

/** True when the device, having shown everything up to `seen`, has not shown `entry`. */
export function isUnseen(entry: NewsEntry, seen: number): boolean {
  return entry.id > seen;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-03" as "3 Oct 2026". The date is read as it is written, with no time zone. */
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}
```

Create `src/help/newsStore.ts`:

```ts
/**
 * Where the newest news entry this device has shown is kept. The github.io
 * origin is shared with other sites, hence the prefix.
 */
export const NEWS_SEEN_KEY = 'pixel-net:news-seen';

/** The stored text as an entry number. Nothing stored, or anything that is not a whole number, is 0. */
export function parseSeen(raw: string | null): number {
  if (raw === null || !/^\d+$/.test(raw)) return 0;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : 0;
}

/** The newest entry this device has shown, or 0 when there is none or storage is closed to us. */
export function readSeen(): number {
  try {
    return parseSeen(window.localStorage.getItem(NEWS_SEEN_KEY));
  } catch {
    return 0;
  }
}

/** Remembers that every entry up to `id` has been shown. It can be refused (a private window). */
export function writeSeen(id: number): void {
  try {
    window.localStorage.setItem(NEWS_SEEN_KEY, String(id));
  } catch {
    // Nothing is remembered, and the dot comes back on the next visit.
  }
}
```

Create `src/help/howTo.ts`:

```ts
const SUN = 'Drag the sun on the net to change the light.';
const SHARE = 'The share button sends a link to this view.';
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
        NET,
      ]
    : [
        'Click or drag on the terrain to inspect a pixel.',
        'Arrow keys move one pixel, and Shift moves ten; Escape clears it.',
        SUN,
        'Double-click the sun to put it back.',
        SHARE,
        NET,
      ];
}
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `npx vitest run src/help`
Expected: PASS, three files.

Run: `npm test && npm run build`
Expected: every unit test passes and the build succeeds. If `tsc` rejects `NEWS: NewsEntry[] = list`, the JSON is malformed; fix the JSON, do not add a cast.

- [ ] **Step 7: Commit**

```bash
git add tsconfig.json src/help
git commit -m "Keep a list of what has changed, and what the device has shown

The help sheet and the changelog will both be written from one list, so
a sentence is written once. Entries are numbered because two can share
a date.

Claude-Session: https://claude.ai/code/session_0188RNZHUPogarCPaaFF2sKe"
```

---

### Task 2: The changelog

**Files:**
- Create: `scripts/make-changelog.mjs`, `CHANGELOG.md` (generated)
- Modify: `package.json` (scripts), `README.md`
- Test: `src/help/changelog.test.ts`

**Interfaces:**
- Consumes: `src/help/news.json` (Task 1); `NEWS` and `formatDate` from `src/help/news.ts` (Task 1), in the test only.
- Produces: `npm run changelog`, which writes `CHANGELOG.md`; `node scripts/make-changelog.mjs --print`, which writes the same text to standard output and leaves the file alone.

- [ ] **Step 1: Write the failing test**

Create `src/help/changelog.test.ts`:

```ts
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NEWS, formatDate } from './news';

const made = () => execFileSync(process.execPath, ['scripts/make-changelog.mjs', '--print'], { encoding: 'utf8' });

describe('CHANGELOG.md', () => {
  it('is what the list makes; run `npm run changelog` after adding an entry', () => {
    expect(readFileSync('CHANGELOG.md', 'utf8')).toBe(made());
  });

  it('holds every entry, newest first', () => {
    const text = made();
    const places = NEWS.map((entry) => text.indexOf(`- ${entry.text}\n`));
    for (const place of places) expect(place).toBeGreaterThan(-1);
    expect(places).toEqual([...places].sort((a, b) => b - a));
  });

  it('heads each day once, written the way the sheet writes it', () => {
    const text = made();
    for (const date of new Set(NEWS.map((entry) => entry.date))) {
      expect(text.split(`\n## ${formatDate(date)}\n`)).toHaveLength(2);
    }
  });
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `npx vitest run src/help/changelog.test.ts`
Expected: FAIL. Node cannot find `scripts/make-changelog.mjs`.

- [ ] **Step 3: Write the script**

Create `scripts/make-changelog.mjs`:

```js
// Writes CHANGELOG.md from the app's news list, so the help sheet and the
// file cannot say different things. With --print the text goes to standard
// output and the file is left alone; the unit test uses that to check that
// the file is up to date.
import { readFileSync, writeFileSync } from 'node:fs';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2026-10-03" as "3 Oct 2026", as src/help/news.ts writes it in the sheet.
function formatDate(date) {
  const [year, month, day] = date.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

const entries = JSON.parse(readFileSync(new URL('../src/help/news.json', import.meta.url), 'utf8'));
const newestFirst = [...entries].sort((a, b) => b.id - a.id);

const lines = [
  '# Changelog',
  '',
  'What has changed in the app, newest first. This file is written from',
  '`src/help/news.json` by `npm run changelog`. To add an entry, add it there',
  'and run the command; do not edit this file.',
];
let heading = '';
for (const entry of newestFirst) {
  if (entry.date !== heading) {
    heading = entry.date;
    lines.push('', `## ${formatDate(heading)}`, '');
  }
  lines.push(`- ${entry.text}`);
}
const text = `${lines.join('\n')}\n`;

if (process.argv.includes('--print')) {
  process.stdout.write(text);
} else {
  writeFileSync(new URL('../CHANGELOG.md', import.meta.url), text);
  console.log('Wrote CHANGELOG.md');
}
```

- [ ] **Step 4: Add the command and write the file**

In `package.json`, add to `scripts`, after the `preview-image` line (and add a comma to that line):

```json
    "changelog": "node scripts/make-changelog.mjs"
```

Run: `npm run changelog`
Expected: `Wrote CHANGELOG.md`. The file reads:

```markdown
# Changelog

What has changed in the app, newest first. This file is written from
`src/help/news.json` by `npm run changelog`. To add an entry, add it there
and run the command; do not edit this file.

## 3 Oct 2026

- The help button shows how to use the app and what has changed.
- The share button sends a link that reopens this view, with a picture of it.
- The app reopens on the DEM, pixel and sun you left.

## 2 Oct 2026

- The first version: a hillshade beside a Schmidt net of every pixel, with a sun you can drag.
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `npx vitest run src/help/changelog.test.ts`
Expected: PASS, three tests.

Then prove the check catches a forgotten run: append a blank line to `CHANGELOG.md`, run the test again and see the first test FAIL, then run `npm run changelog` and see it PASS.

- [ ] **Step 6: Document it in the README**

In `README.md`, add a row to the command table under "Run it", after the `npm run preview-image` row:

```markdown
| `npm run changelog` | Rewrite `CHANGELOG.md` from the news list, `src/help/news.json` |
```

Add this section before `## Deploy`:

```markdown
## Tell users what changed

The help button in the title bar opens a sheet with how to use the app and the
latest three changes. A dot on the button marks changes a device has not shown.

To announce a change:

1. Add an entry at the end of `src/help/news.json`: the next `id`, the date as
   `YYYY-MM-DD`, and one sentence written for someone using the app. Do not
   name the app in it.
2. Run `npm run changelog`. It rewrites `CHANGELOG.md` from the list.
3. Commit both files. `npm test` fails if `CHANGELOG.md` is out of step, and
   the deploy runs `npm test` first.

A change that is not worth telling a user about gets no entry, and raises no
dot.
```

- [ ] **Step 7: Run everything and commit**

Run: `npm test && npm run build`
Expected: all pass.

```bash
git add scripts/make-changelog.mjs CHANGELOG.md package.json README.md src/help/changelog.test.ts
git commit -m "Write the changelog from the news list

One list feeds the help sheet and CHANGELOG.md. A unit test compares
the file with what the list makes, so a forgotten run stops the deploy.

Claude-Session: https://claude.ai/code/session_0188RNZHUPogarCPaaFF2sKe"
```

---

### Task 3: The help button and the sheet

**Files:**
- Modify: `package.json` and `package-lock.json` (by `npm install`), `src/components/TitleBar.tsx`, `src/app.css`, `e2e/polish.spec.ts`
- Create: `src/components/HelpSheet.tsx`, `src/components/HelpButton.tsx`
- Test: `e2e/help.spec.ts`

**Interfaces:**
- Consumes (Task 1): `NEWS`, `NewsEntry`, `latest`, `newestId`, `isUnseen`, `formatDate` from `src/help/news`; `readSeen`, `writeSeen` from `src/help/newsStore`; `howToLines` from `src/help/howTo`. Existing: `useCoarsePointer` from `src/hooks/useCoarsePointer`; the `.icon-btn`, `.tooltip` and `.visually-hidden` classes in `src/app.css`.
- Produces:
  - `HelpButton()` with no props, rendered by `TitleBar`.
  - `HelpSheet({ entries, seen, coarse, onReturnFocus })`.
  - Test ids: `help` (the button), `help-dot`, `help-sheet`, `help-how` and `help-news` (the two lists).
  - CSS classes `.help-btn`, `.help-btn__dot`, `.scrim`, `.sheet`, `.sheet__close`, `.sheet__parts`, `.sheet__part`, `.sheet__heading`, `.sheet__list`, `.news`, `.news__dot`, `.news__date`. Task 4 adds the arrangements and the motion to these.

This task gives the sheet its upright-phone and desktop forms with no motion. Task 4 adds the sideways form, the motion, and the tests that it fits.

- [ ] **Step 1: Install the dialog**

Run: `npm install @radix-ui/react-dialog`
Expected: `package.json` gains `@radix-ui/react-dialog` under `dependencies`, beside `@radix-ui/react-tooltip`.

- [ ] **Step 2: Write the failing browser tests**

Create `e2e/help.spec.ts`:

```ts
import { readFileSync } from 'node:fs';
import { type Page, expect, test } from '@playwright/test';
import { caption, hint, openApp, stage } from './helpers';

// The list is read as a file: the app's module imports it as JSON, which
// Playwright's loader does not take.
const NEWS: { id: number; date: string; text: string }[] = JSON.parse(
  readFileSync('src/help/news.json', 'utf8'),
);
const NEWEST = NEWS[NEWS.length - 1].id;
const SHOWN = NEWS.slice(-3).reverse();
const SEEN = 'pixel-net:news-seen';

const NAME = "Help and what's new";
const NAME_WITH_NEWS = "Help and what's new, new changes";

const help = (page: Page) => page.getByTestId('help');
const dot = (page: Page) => page.getByTestId('help-dot');
const sheet = (page: Page) => page.getByTestId('help-sheet');
const howTo = (page: Page) => page.getByTestId('help-how').getByRole('listitem');
const news = (page: Page) => page.getByTestId('help-news').getByRole('listitem');
const remembered = (page: Page) => page.evaluate((key) => window.localStorage.getItem(key), SEEN);
const remember = (page: Page, value: string) =>
  page.addInitScript(([key, seen]) => window.localStorage.setItem(key, seen), [SEEN, value]);

test('a device that has shown nothing gets the dot, and opening the sheet clears it for good', async ({ page }) => {
  await openApp(page);
  await expect(dot(page)).toBeVisible();
  await expect(help(page)).toHaveAttribute('aria-label', NAME_WITH_NEWS);

  await help(page).click();
  await expect(sheet(page)).toBeVisible();
  await expect(dot(page)).toHaveCount(0);
  await expect(help(page)).toHaveAttribute('aria-label', NAME);
  expect(await remembered(page)).toBe(String(NEWEST));

  await page.reload();
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(dot(page)).toHaveCount(0);
  await expect(help(page)).toHaveAttribute('aria-label', NAME);
});

test('the sheet is a dialog named Help with the two parts', async ({ page }, testInfo) => {
  await openApp(page);
  await help(page).click();

  const dialog = page.getByRole('dialog', { name: 'Help' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'How to use it' })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: "What's new" })).toBeVisible();

  // The first line names the gesture the screen has, as the caption does.
  await expect(howTo(page)).toHaveCount(6);
  await expect(howTo(page).first()).toHaveText(`${hint(testInfo.project.name)}.`);
  await expect(howTo(page).nth(1)).toHaveText(
    testInfo.project.name === 'phone'
      ? 'Double-tap the terrain to clear it.'
      : 'Arrow keys move one pixel, and Shift moves ten; Escape clears it.',
  );

  // The latest three, newest first, each with its date for assistive technology.
  await expect(news(page)).toHaveCount(SHOWN.length);
  for (const [i, entry] of SHOWN.entries()) {
    await expect(news(page).nth(i)).toContainText(entry.text);
    await expect(news(page).nth(i).locator('time')).toHaveAttribute('datetime', entry.date);
  }
});

test('on a device that has shown nothing, every entry is marked new while the sheet is open', async ({ page }) => {
  await openApp(page);
  await help(page).click();
  for (let i = 0; i < SHOWN.length; i++) {
    await expect(news(page).nth(i)).toHaveAttribute('data-new', 'true');
    await expect(news(page).nth(i)).toContainText('New. ');
  }

  // The marks are for this opening only.
  await page.keyboard.press('Escape');
  await expect(sheet(page)).toBeHidden();
  await help(page).click();
  for (let i = 0; i < SHOWN.length; i++) {
    await expect(news(page).nth(i)).toHaveAttribute('data-new', 'false');
  }
});

test('a device that has shown all but the newest entry gets the dot and one mark', async ({ page }) => {
  await remember(page, String(NEWEST - 1));
  await openApp(page);
  await expect(dot(page)).toBeVisible();

  await help(page).click();
  await expect(news(page).first()).toHaveAttribute('data-new', 'true');
  for (let i = 1; i < SHOWN.length; i++) {
    await expect(news(page).nth(i)).toHaveAttribute('data-new', 'false');
    await expect(news(page).nth(i)).not.toContainText('New. ');
  }
});

test('a device that has shown everything gets no dot and no marks', async ({ page }) => {
  await remember(page, String(NEWEST));
  await openApp(page);
  await expect(dot(page)).toHaveCount(0);
  await expect(help(page)).toHaveAttribute('aria-label', NAME);

  await help(page).click();
  await expect(sheet(page).locator('[data-new="true"]')).toHaveCount(0);
});

test('a remembered value higher than any entry gives no dot and is left alone', async ({ page }) => {
  await remember(page, '9999');
  await openApp(page);
  await expect(dot(page)).toHaveCount(0);

  await help(page).click();
  await expect(sheet(page)).toBeVisible();
  expect(await remembered(page)).toBe('9999');
});

for (const junk of ['abc', '-1', '1.5']) {
  test(`a remembered value of "${junk}" reads as nothing shown`, async ({ page }) => {
    await remember(page, junk);
    await openApp(page);
    await expect(dot(page)).toBeVisible();
    await help(page).click();
    await expect(news(page).first()).toHaveAttribute('data-new', 'true');
  });
}

test('with storage closed to the app, the dot clears for the visit and comes back on the next', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const refuse = () => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    };
    Storage.prototype.getItem = refuse;
    Storage.prototype.setItem = refuse;
    Storage.prototype.removeItem = refuse;
  });
  await openApp(page);
  await expect(dot(page)).toBeVisible();

  await help(page).click();
  await expect(sheet(page)).toBeVisible();
  await expect(dot(page)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(sheet(page)).toBeHidden();
  await expect(dot(page)).toHaveCount(0);

  await page.reload();
  await expect(stage(page)).toHaveAttribute('data-status', 'ready');
  await expect(dot(page)).toBeVisible();
  expect(errors).toEqual([]);
});

test('Escape closes the sheet and returns focus to the help button', async ({ page }) => {
  await openApp(page);
  await help(page).click();
  // Focus moves into the sheet when it opens.
  await expect(page.getByRole('button', { name: 'Close' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(sheet(page)).toBeHidden();
  await expect(help(page)).toBeFocused();
});

test('the close button closes the sheet and returns focus to the help button', async ({ page }) => {
  await openApp(page);
  await help(page).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(sheet(page)).toBeHidden();
  await expect(help(page)).toBeFocused();
});

test('the close button is a 44px target on a touch screen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'A mouse gets the 40px button.');
  await openApp(page);
  await help(page).click();
  const box = (await page.getByRole('button', { name: 'Close' }).boundingBox())!;
  expect(Math.round(box.width)).toBeGreaterThanOrEqual(44);
  expect(Math.round(box.height)).toBeGreaterThanOrEqual(44);
});

test('a press on the dimmed view closes the sheet and selects nothing', async ({ page }, testInfo) => {
  await openApp(page);
  await help(page).click();
  await expect(sheet(page)).toBeVisible();

  // A point on a card and clear of the sheet: the net at the top of a phone,
  // the terrain at the left of a desktop.
  const target = testInfo.project.name === 'phone' ? page.getByTestId('net-cloud') : page.getByTestId('terrain-area');
  const box = (await target.boundingBox())!;
  const sheetBox = (await sheet(page).boundingBox())!;
  const point = { x: box.x + 24, y: box.y + 24 };
  const inSheet =
    point.x >= sheetBox.x &&
    point.x <= sheetBox.x + sheetBox.width &&
    point.y >= sheetBox.y &&
    point.y <= sheetBox.y + sheetBox.height;
  expect(inSheet, 'the test point must be outside the sheet').toBe(false);

  await page.mouse.click(point.x, point.y);
  await expect(sheet(page)).toBeHidden();
  await expect(help(page)).toBeFocused();
  // The press went to the sheet, not through it.
  await expect(page.getByTestId('selection-ring')).toHaveAttribute('data-visible', 'false');
  await expect(caption(page)).toHaveText(hint(testInfo.project.name));
});

test('the tooltip does not open when the sheet hands focus back', async ({ page }) => {
  await openApp(page);
  for (const close of [
    () => page.keyboard.press('Escape'),
    () => page.getByRole('button', { name: 'Close' }).click(),
  ]) {
    await help(page).click();
    await expect(sheet(page)).toBeVisible();
    await close();
    await expect(sheet(page)).toBeHidden();
    await expect(help(page)).toBeFocused();
    // Longer than the tooltip's delay.
    await page.waitForTimeout(500);
    await expect(page.locator('.tooltip')).toHaveCount(0);
  }
});

test('a mouse over the help button shows its name', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'A touch screen has no hover.');
  await openApp(page);
  await help(page).hover();
  await expect(page.locator('.tooltip')).toHaveText(NAME);
});

test('the help button works while the DEM cannot be loaded', async ({ page }) => {
  await page.route('**/dems/gore.tif', (route) => route.abort());
  await page.goto('/');
  await expect(stage(page)).toHaveAttribute('data-status', 'error');

  await expect(help(page)).toBeEnabled();
  await help(page).click();
  await expect(sheet(page)).toBeVisible();
  await expect(howTo(page)).toHaveCount(6);
});

test('the help button sits after the share button and is a 44px target on a touch screen', async ({ page }, testInfo) => {
  await openApp(page);
  const shareBox = (await page.getByTestId('share').boundingBox())!;
  const helpBox = (await help(page).boundingBox())!;
  expect(helpBox.x).toBeGreaterThanOrEqual(shareBox.x + shareBox.width);
  expect(helpBox.x + helpBox.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  if (testInfo.project.name === 'phone') {
    expect(Math.round(helpBox.width)).toBeGreaterThanOrEqual(44);
    expect(Math.round(helpBox.height)).toBeGreaterThanOrEqual(44);
  }
});
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test e2e/help.spec.ts`
Expected: FAIL in both projects. Nothing has the test id `help`.

- [ ] **Step 4: Write the sheet**

Create `src/components/HelpSheet.tsx`:

```tsx
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { howToLines } from '../help/howTo';
import { type NewsEntry, formatDate, isUnseen } from '../help/news';

interface HelpSheetProps {
  /** The entries to show, newest first. */
  entries: NewsEntry[];
  /** The newest entry the device had shown before this opening. Later ones are marked new. */
  seen: number;
  /** True on a touch screen, which is told about taps rather than clicks and keys. */
  coarse: boolean;
  /** Called as the sheet closes, just before it gives focus back to the button. */
  onReturnFocus: () => void;
}

/**
 * How to use the app, and what has changed in it. It goes inside a
 * `Dialog.Root`, which holds whether it is open. It is shown only when asked
 * for, and it never scrolls: three entries are all it has room for.
 */
export function HelpSheet({ entries, seen, coarse, onReturnFocus }: HelpSheetProps) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="scrim" />
      <Dialog.Content
        className="sheet"
        data-testid="help-sheet"
        // The two headings say what is here; there is no one description.
        aria-describedby={undefined}
        onCloseAutoFocus={onReturnFocus}
      >
        <Dialog.Title className="visually-hidden">Help</Dialog.Title>
        <Dialog.Close asChild>
          <button type="button" className="icon-btn sheet__close" aria-label="Close">
            <X size={20} aria-hidden="true" />
          </button>
        </Dialog.Close>
        <div className="sheet__parts">
          <section className="sheet__part" aria-labelledby="help-how-heading">
            <h2 id="help-how-heading" className="sheet__heading">
              How to use it
            </h2>
            <ul className="sheet__list" data-testid="help-how">
              {howToLines(coarse).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
          {entries.length > 0 && (
            <section className="sheet__part" aria-labelledby="help-news-heading">
              <h2 id="help-news-heading" className="sheet__heading">
                {"What's new"}
              </h2>
              <ul className="sheet__list" data-testid="help-news">
                {entries.map((entry) => {
                  const unseen = isUnseen(entry, seen);
                  return (
                    <li key={entry.id} className="news" data-new={unseen}>
                      <span className="news__dot" aria-hidden="true" />
                      <time className="news__date" dateTime={entry.date}>
                        {formatDate(entry.date)}
                      </time>
                      <span>
                        {unseen && <span className="visually-hidden">New. </span>}
                        {entry.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
```

- [ ] **Step 5: Write the button**

Create `src/components/HelpButton.tsx`:

```tsx
import * as Dialog from '@radix-ui/react-dialog';
import * as Tooltip from '@radix-ui/react-tooltip';
import { CircleQuestionMark } from 'lucide-react';
import { useRef, useState } from 'react';
import { NEWS, latest, newestId } from '../help/news';
import { readSeen, writeSeen } from '../help/newsStore';
import { useCoarsePointer } from '../hooks/useCoarsePointer';
import { HelpSheet } from './HelpSheet';

const LABEL = "Help and what's new";
const SHOWN = 3; // how many entries the sheet has room for without scrolling
const NEWEST = newestId(NEWS);

/**
 * The help button and its sheet. Nothing opens unasked: a dot on the button
 * is the only sign that there is news this device has not shown, and opening
 * the sheet clears it.
 */
export function HelpButton() {
  const coarse = useCoarsePointer();
  const [open, setOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  // The newest entry this device has shown, and what that was when the sheet
  // last opened: the sheet marks the entries that were new at that moment.
  const [seen, setSeen] = useState(readSeen);
  const [seenAtOpen, setSeenAtOpen] = useState(seen);
  // True while the closing sheet hands focus back to the button.
  const returning = useRef(false);

  const hasNews = NEWEST > seen;

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) return;
    setSeenAtOpen(seen);
    // A remembered value above the newest entry is left as it is.
    if (hasNews) {
      setSeen(NEWEST);
      writeSeen(NEWEST);
    }
  };

  // Focus opens a tooltip. The focus the sheet hands back was not asked for,
  // and on a touch screen the tooltip it opened would stay until the next tap.
  const onTipOpenChange = (next: boolean) => {
    if (next && returning.current) return;
    setTipOpen(next);
  };

  const onReturnFocus = () => {
    returning.current = true;
    // The button is focused in this same turn; after it, hovering works again.
    queueMicrotask(() => {
      returning.current = false;
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Tooltip.Root open={tipOpen && !open} onOpenChange={onTipOpenChange}>
        <Tooltip.Trigger asChild>
          <Dialog.Trigger asChild>
            <button
              type="button"
              className="icon-btn help-btn"
              aria-label={hasNews ? `${LABEL}, new changes` : LABEL}
              data-testid="help"
            >
              <CircleQuestionMark size={20} aria-hidden="true" />
              {hasNews && <span className="help-btn__dot" data-testid="help-dot" />}
            </button>
          </Dialog.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="tooltip" side="bottom" align="end" sideOffset={6} collisionPadding={8}>
            {LABEL}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      <HelpSheet entries={latest(NEWS, SHOWN)} seen={seenAtOpen} coarse={coarse} onReturnFocus={onReturnFocus} />
    </Dialog.Root>
  );
}
```

- [ ] **Step 6: Put the button in the title bar**

In `src/components/TitleBar.tsx`, add the import after the `ShareButton` import:

```tsx
import { HelpButton } from './HelpButton';
```

and render it after the share button:

```tsx
        <ShareButton disabled={shareDisabled} onShare={onShare} />
        <HelpButton />
```

In `src/app.css`, change the comment above `.titlebar__end` to:

```css
/* The DEM's name or the picker, then the share button and the help button. */
```

- [ ] **Step 7: Style the dot and the sheet**

In `src/app.css`, add this block at the end of the file:

```css
/* ---------- Help ---------- */

.help-btn {
  position: relative;
}

/* News this device has not shown. It sits on the icon's upper right, with a
   ring of paper between it and the icon's stroke. */
.help-btn__dot {
  position: absolute;
  top: calc(50% - 12px);
  right: calc(50% - 12px);
  width: 8px;
  height: 8px;
  border-radius: var(--r-pill);
  background: var(--accent);
  box-shadow: 0 0 0 2px var(--paper);
}

.scrim {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: color-mix(in srgb, var(--ink-900) 40%, transparent);
}

/* A floating surface: shadow, no border. On a phone it stands on the bottom
   edge, clear of the home indicator. It never scrolls, so what it holds is
   kept short enough to fit. */
.sheet {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: var(--z-modal);
  padding: var(--sp-4) calc(var(--sp-4) + env(safe-area-inset-right))
    calc(var(--sp-5) + env(safe-area-inset-bottom)) calc(var(--sp-4) + env(safe-area-inset-left));
  border-radius: var(--r-lg) var(--r-lg) 0 0;
  background: var(--paper);
  box-shadow: var(--shadow-3);
}

.sheet__close {
  position: absolute;
  top: var(--sp-2);
  right: calc(var(--sp-2) + env(safe-area-inset-right));
}

.sheet__parts {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.sheet__part {
  min-width: 0;
}

.sheet__heading {
  margin: 0 0 var(--sp-2);
  /* The first heading shares its row with the close button. */
  padding-right: var(--touch);
  font-size: var(--fs-sm);
  font-weight: 600;
  line-height: var(--lh-snug);
  color: var(--ink-900);
}

.sheet__list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--fs-sm);
  line-height: var(--lh-snug);
  color: var(--ink-700);
}

.news {
  position: relative;
  display: grid;
  grid-template-columns: 5.5em 1fr;
  column-gap: var(--sp-3);
}

.news__date {
  color: var(--ink-500);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* The mark on an entry this device had not shown. It hangs in the sheet's
   padding so the dates stay in line with the lines above them. */
.news__dot {
  position: absolute;
  top: 0.5em;
  left: -11px;
  width: 6px;
  height: 6px;
  border-radius: var(--r-pill);
}

.news[data-new='true'] .news__dot {
  background: var(--accent);
}

/* Wider than a phone held upright: a card in the middle of the window. */
@media (min-width: 521px) {
  .sheet {
    inset: 0;
    width: min(420px, calc(100vw - 2 * var(--sp-4)));
    height: fit-content;
    margin: auto;
    padding: var(--sp-5);
    border-radius: var(--r-lg);
  }

  .sheet__close {
    top: var(--sp-3);
    right: var(--sp-3);
  }
}
```

- [ ] **Step 8: Bring the title bar's own tests up to date**

In `e2e/polish.spec.ts`, in the test `every control can be reached by keyboard, in reading order, and shows a focus ring`, add a name after `shareName` and put it in both orders. The browser is fresh, so the dot is showing and the name says so:

```ts
  const shareName = 'Share this view';
  const helpName = "Help and what's new, new changes";
```

```ts
  const expected =
    testInfo.project.name === 'phone'
      ? ['Gore Range', 'Second', shareName, helpName, sunName, terrainName]
      : ['Gore Range', 'Second', shareName, helpName, terrainName, sunName];
```

In the test `four DEMs with two-word names stay inside a phone screen`, after the three lines that check `shareBox`, add:

```ts
  const helpBox = (await page.getByTestId('help').boundingBox())!;
  expect(helpBox.x).toBeGreaterThanOrEqual(shareBox.x + shareBox.width);
  expect(helpBox.x + helpBox.width).toBeLessThanOrEqual(width);
```

In the test that checks touch targets (the one that ends with the `shareBox` width and height at 44), after those lines add:

```ts
  const helpBox = (await page.getByTestId('help').boundingBox())!;
  expect(Math.round(helpBox.width)).toBeGreaterThanOrEqual(44);
  expect(Math.round(helpBox.height)).toBeGreaterThanOrEqual(44);
```

- [ ] **Step 9: Run the tests to see them pass**

Run: `npm run build`
Expected: succeeds. If `tsc` says `lucide-react` has no export `CircleQuestionMark`, the installed version names it `CircleHelp`; check `node_modules/lucide-react/dist/esm/icons/` and use the name that exists.

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test e2e/help.spec.ts e2e/polish.spec.ts`
Expected: PASS in both projects.

If `the tooltip does not open when the sheet hands focus back` fails, the tooltip's request to open arrived after the microtask cleared `returning`. Replace `queueMicrotask(...)` in `onReturnFocus` with clearing the flag where the request is refused, and on the button's `onBlur`:

```tsx
  const onTipOpenChange = (next: boolean) => {
    if (next && returning.current) {
      returning.current = false;
      return;
    }
    setTipOpen(next);
  };

  const onReturnFocus = () => {
    returning.current = true;
  };
```

and add `onBlur={() => { returning.current = false; }}` to the button. Run the tests again.

- [ ] **Step 10: Run every test**

Run: `npm test`
Expected: PASS.

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test`
Expected: PASS. A test elsewhere that fails because it counts buttons or tooltips now sees the help button; change that test to name the control it means, and say so in the commit body.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json src/components/HelpSheet.tsx src/components/HelpButton.tsx src/components/TitleBar.tsx src/app.css e2e/help.spec.ts e2e/polish.spec.ts
git commit -m "Open a help sheet from one button in the title bar

It says how to use the screen and lists the latest three changes. A dot
on the button marks news the device has not shown, and opening the
sheet clears it. Nothing opens unasked, so a shared link still lands on
the view it was sent for.

Claude-Session: https://claude.ai/code/session_0188RNZHUPogarCPaaFF2sKe"
```

---

### Task 4: The sheet's arrangements, its motion, and the records

**Files:**
- Modify: `src/app.css`, `e2e/help.spec.ts`, `PRODUCT.md`, `docs/polish-pass.md`
- Test: `e2e/help.spec.ts`

**Interfaces:**
- Consumes (Task 3): the classes `.scrim`, `.sheet`, `.sheet__parts`, `.sheet__part`; the test ids `help`, `help-sheet`, `help-how`, `help-news`; the `help`, `sheet`, `howTo` and `news` locators at the top of `e2e/help.spec.ts`.
- Produces: nothing later tasks use.

- [ ] **Step 1: Write the failing tests**

Append to `e2e/help.spec.ts`:

```ts
/** Waits until the sheet has finished moving. */
const settled = (page: Page) =>
  sheet(page).evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));

/** Opens the sheet and checks that all of it is on the screen and nothing scrolls. */
async function expectSheetFits(page: Page) {
  await help(page).click();
  await expect(sheet(page)).toBeVisible();
  await settled(page);

  const viewport = page.viewportSize()!;
  const box = (await sheet(page).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 0.5);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 0.5);

  const overflow = await sheet(page).evaluate((element) => ({
    sheet: element.scrollHeight - element.clientHeight,
    page: document.documentElement.scrollHeight - window.innerHeight,
    wide: document.documentElement.scrollWidth - window.innerWidth,
  }));
  expect(overflow.sheet).toBeLessThanOrEqual(0);
  expect(overflow.page).toBeLessThanOrEqual(0);
  expect(overflow.wide).toBeLessThanOrEqual(0);

  // Every line is inside the sheet, not hanging out of it.
  for (const item of [...(await howTo(page).all()), ...(await news(page).all())]) {
    const line = (await item.boundingBox())!;
    expect(line.x).toBeGreaterThanOrEqual(box.x);
    expect(line.x + line.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
    expect(line.y + line.height).toBeLessThanOrEqual(box.y + box.height + 0.5);
  }
  return box;
}

const parts = (page: Page) => sheet(page).locator('.sheet__part');

test('on an upright phone the sheet stands on the bottom edge and spans the screen', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 839 });
  await openApp(page);
  const box = await expectSheetFits(page);
  expect(Math.round(box.x)).toBe(0);
  expect(Math.round(box.width)).toBe(412);
  expect(Math.round(box.y + box.height)).toBe(839);
  // The parts are stacked.
  const [how, whatsNew] = [(await parts(page).nth(0).boundingBox())!, (await parts(page).nth(1).boundingBox())!];
  expect(whatsNew.y).toBeGreaterThanOrEqual(how.y + how.height);
});

test('the sheet fits a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await openApp(page);
  await expectSheetFits(page);
});

test('on a desktop the sheet is a 420px card in the middle of the window', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openApp(page);
  const box = await expectSheetFits(page);
  expect(Math.round(box.width)).toBe(420);
  expect(Math.abs(box.x + box.width / 2 - 640)).toBeLessThanOrEqual(1);
  expect(Math.abs(box.y + box.height / 2 - 400)).toBeLessThanOrEqual(1);
});

for (const size of [
  { width: 839, height: 412 },
  { width: 640, height: 360 },
]) {
  test(`on a sideways phone, ${size.width} × ${size.height}, the two parts sit side by side`, async ({ page }) => {
    await page.setViewportSize(size);
    await openApp(page);
    await expectSheetFits(page);
    const [how, whatsNew] = [(await parts(page).nth(0).boundingBox())!, (await parts(page).nth(1).boundingBox())!];
    expect(Math.abs(how.y - whatsNew.y)).toBeLessThanOrEqual(1);
    expect(whatsNew.x).toBeGreaterThanOrEqual(how.x + how.width);
  });
}

test('turning the phone while the sheet is open rearranges it, and it still fits', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 839 });
  await openApp(page);
  await expectSheetFits(page);

  await page.setViewportSize({ width: 839, height: 412 });
  await expect(sheet(page)).toBeVisible();
  const box = (await sheet(page).boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(412.5);
  expect(box.x + box.width).toBeLessThanOrEqual(839.5);
  const [how, whatsNew] = [(await parts(page).nth(0).boundingBox())!, (await parts(page).nth(1).boundingBox())!];
  expect(Math.abs(how.y - whatsNew.y)).toBeLessThanOrEqual(1);

  // And back.
  await page.setViewportSize({ width: 412, height: 839 });
  const upright = (await sheet(page).boundingBox())!;
  expect(Math.round(upright.y + upright.height)).toBe(839);
});

test('the sheet moves into place, and with reduced motion it does not move', async ({ page }) => {
  await openApp(page);
  await help(page).click();
  const moving = await sheet(page).evaluate((element) => getComputedStyle(element).animationName);
  expect(moving).not.toBe('none');
  await page.keyboard.press('Escape');
  await expect(sheet(page)).toBeHidden();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await help(page).click();
  await expect(sheet(page)).toBeVisible();
  expect(await sheet(page).evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  expect(await page.locator('.scrim').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  // With nothing to wait for, it is gone at once.
  await page.keyboard.press('Escape');
  await expect(sheet(page)).toHaveCount(0);
});
```

- [ ] **Step 2: Run the tests to see which fail**

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test e2e/help.spec.ts`
Expected: the two sideways tests and the turning test FAIL (the parts are stacked), and the motion test FAILS (`animationName` is `none`). The upright, small-phone and desktop tests may already pass.

- [ ] **Step 3: Add the sideways arrangement and the motion**

In `src/app.css`, add after the `@media (min-width: 521px)` block that Task 3 put at the end of the Help section:

```css
/* A phone on its side: too short to stack the two parts, so they sit side by
   side in a wider card. */
@media (min-width: 521px) and (max-height: 520px) {
  .sheet {
    width: min(680px, calc(100vw - 2 * var(--sp-4)));
    padding: var(--sp-4) var(--sp-5);
  }

  .sheet__parts {
    flex-direction: row;
    gap: var(--sp-5);
  }

  .sheet__part {
    flex: 1 1 0;
  }
}

/* The sheet rises from the edge it stands on; the card, which stands on
   nothing, fades up a little. Radix keeps both in the page until the closing
   animation ends. */
.scrim {
  animation: scrim-in var(--t-base) var(--ease-out);
}

.scrim[data-state='closed'] {
  animation: scrim-out var(--t-fast) var(--ease-out);
}

.sheet {
  animation: sheet-in var(--t-slow) var(--ease-out);
}

.sheet[data-state='closed'] {
  animation: sheet-out var(--t-base) var(--ease-out);
}

@media (min-width: 521px) {
  .sheet {
    animation-name: card-in;
  }

  .sheet[data-state='closed'] {
    animation-name: card-out;
  }
}

@keyframes scrim-in {
  from {
    opacity: 0;
  }
}

@keyframes scrim-out {
  to {
    opacity: 0;
  }
}

@keyframes sheet-in {
  from {
    transform: translateY(100%);
  }
}

@keyframes sheet-out {
  to {
    transform: translateY(100%);
  }
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

@keyframes card-out {
  to {
    opacity: 0;
    transform: translateY(8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .scrim,
  .scrim[data-state='closed'],
  .sheet,
  .sheet[data-state='closed'] {
    animation: none;
  }
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test e2e/help.spec.ts`
Expected: PASS in both projects.

If a "fits" test fails because a line hangs out of the sheet at 640 × 360, the news sentences are wrapping to more lines than the card has height for. Put the date above its sentence in the sideways arrangement only, by adding inside the `(min-width: 521px) and (max-height: 520px)` block:

```css
  .news {
    grid-template-columns: 1fr;
  }
```

Do not add scrolling and do not shorten the spec's sentences.

- [ ] **Step 5: Look at it**

Run: `npm run dev` and open http://localhost:5173 in a browser at a phone size, sideways, and a desktop size. Check by eye:

- the dot is on the icon's upper right and is gone after the sheet opens;
- the first heading and the close button share a row without touching;
- the new-entry dots sit in the left padding, level with the first line of each entry;
- the sheet rises on a phone, the card fades up on a desktop.

Save three screenshots as `screenshots/14-phone-help.png`, `screenshots/15-phone-help-sideways.png` and `screenshots/16-desktop-help.png`. The `screenshots/` folder is untracked; leave it untracked.

- [ ] **Step 6: Update the records**

In `PRODUCT.md`, under "Confirmed functionality", add this bullet after the "Share:" bullet:

```markdown
- Help: one button in the title bar opens a sheet with how to use the screen
  and the latest three changes. A dot on the button marks changes the device
  has not shown; opening the sheet clears it. Nothing opens unasked. The
  changes are a hand-written list, `src/help/news.json`, which is also written
  out as `CHANGELOG.md`
  (`docs/superpowers/specs/2026-10-03-help-and-news-design.md`).
```

In the "Out of scope by decision" paragraph, add at its end:

```markdown
Out of scope for help (help and news spec §2): anything that appears unasked,
such as a first-visit tour or a note after an update; an "About" part; the
full history inside the app; a link from the sheet to the changelog.
```

In the first sentence of "Product Purpose", nothing changes: the sheet is help, not a second view.

In `docs/polish-pass.md`:

- Row 13, replace the evidence with: ``lucide-react `Sun`, `Info`, `Share`, `Check`, `CircleQuestionMark` and `X` only``.
- Row 17, add to the evidence: `; "the sheet moves into place, and with reduced motion it does not move"`.
- Row 19, add to the evidence: `; the help button is an icon in a pill, named "Help and what's new"`.
- Row 20, replace the evidence with: `Accent appears on the selection ring, the net point, the loupe outline, the focus ring, the retry button, and the two news dots (on the help button and beside an unseen entry)`.
- Under "Checked by hand on a phone", add:

```markdown
- [ ] The help sheet's bottom edge clears the home indicator, and its close
      button is easy to reach with a thumb.
- [ ] Sideways on a phone with a notch, the help card is clear of the notch.
- [ ] After closing the help sheet with a tap, no tooltip stays over the title bar.
```

- [ ] **Step 7: Run every test**

Run: `npm test && npm run build`
Expected: PASS.

Run: `LD_LIBRARY_PATH=$HOME/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu npx playwright test`
Expected: PASS in both projects.

- [ ] **Step 8: Commit**

```bash
git add src/app.css e2e/help.spec.ts PRODUCT.md docs/polish-pass.md
git commit -m "Fit the help sheet to a sideways phone, and let it move

A phone on its side has no height to stack the two parts, so they sit
side by side. The sheet rises over the duration the tokens give to
sheets, and stands still under reduced motion.

Claude-Session: https://claude.ai/code/session_0188RNZHUPogarCPaaFF2sKe"
```
