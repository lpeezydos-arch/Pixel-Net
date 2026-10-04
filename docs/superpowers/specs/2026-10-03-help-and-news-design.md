# Help and news — design

Date: 2026-10-03
Status: approved 2026-10-03. The implementation plan is
`docs/superpowers/plans/2026-10-03-help-and-news.md`

This extends `2026-10-01-pixel-net-design.md`, called "the first spec" below,
and follows `2026-10-03-share-and-restore-design.md`. Section numbers here are
this document's own.

## 1. Purpose

One button in the title bar opens a sheet that says how to use the app and
what has changed in it.

It is for two people:

- A returning user. New versions apply on the next open with no prompt, so
  nothing tells them that sharing and restoring arrived.
- A newcomer who opens a shared link. They are a geoscientist a colleague sent
  a view to; they know what a net is, and do not know this app's gestures.

Success means:

- A newcomer can find, in one press, how to select a pixel and move the sun.
- A returning user learns of a change once, from a dot on the button, and is
  not told again.
- The view is never covered unless the button is pressed.
- The screen gains one icon button and nothing else.

### What was asked for and what was decided

Asked for, on 2026-10-03: a section in the app showing either what is new or
how to use it.

Decided in conversation the same day:

- It serves both needs: returning users who miss changes, and newcomers from a
  shared link.
- It shows only when asked. Nothing opens itself on a first visit or after an
  update. A dot on the button marks unseen news.
- It holds two parts, "How to use it" and "What's new". There is no "About"
  part; how to read the net stays in the net's tooltip.
- It is a sheet: it rises from the bottom on a phone and is a centered card on
  a desktop, over a dimmed view.
- The news is a hand-written list in the source. The same list is written out
  as `CHANGELOG.md`.
- A device with nothing remembered shows the dot. That covers a first-time
  visitor and someone who had the app before this shipped.

## 2. Scope

In scope:

- A help button in the title bar, with a dot for unseen news.
- A sheet with the two parts.
- The news list, and what the device remembers of it.
- A script that writes `CHANGELOG.md` from the list, and a test that keeps the
  two in step.

Out of scope:

- Anything that appears unasked: a first-visit tour, a note after an update.
- An "About" part: the method, credits, or the "not a USGS product" statement.
- The full history inside the app. The sheet shows the latest three entries.
- A link from the sheet to `CHANGELOG.md`. It would need a signal.
- Teaching what a Schmidt net is. Learners are not a target (`PRODUCT.md`).
- A fix for the title bar truncating with three or four DEMs. The new button
  makes that known limit slightly worse; it fits with one or two.

## 3. What a person sees

### The button

- It sits at the end of the title bar, after the share button, built the same
  way and the same size, with a touch target of at least 44px.
- Its icon is a question mark in a circle. Its accessible name is "Help and
  what's new", and "Help and what's new, new changes" while the dot shows.
- The dot is a small circle in the accent color on the button's top corner. It
  shows when the list holds an entry this device has not shown.
- It comes after the share button in the Tab order, before the terrain.
- It is enabled in every state, including loading and the DEM error card.

### The sheet

- Upright phone: it rises from the bottom edge, full width, with its bottom
  padding clear of the safe area. Desktop: a centered card about 420px wide.
- Sideways phone: the two parts sit side by side, since there is not the
  height to stack them.
- The view behind it is dimmed and does not respond.
- It closes by its close button (44px), a press outside it, or Escape. Focus
  moves into the sheet on open and returns to the help button on close.
- It is a modal dialog to assistive technology, titled "Help".
- It never scrolls. Its content fits at every size the app supports.
- It moves over `--t-slow` with `--ease-out`, the duration `tokens.css` gives
  to sheets; with reduced motion it appears and disappears with no movement.
- It is a floating surface: shadow, no border (`tokens.css`).

### "How to use it"

One sentence a line. The lines follow the device, as the caption hint does.

Touch screen:

1. Drag on the terrain to inspect a pixel.
2. Double-tap the terrain to clear it.
3. Drag the sun on the net to change the light.
4. Double-tap the sun to put it back.
5. The share button sends a link to this view.
6. The i on the net explains how to read it.

Mouse and keyboard:

1. Click or drag on the terrain to inspect a pixel.
2. Arrow keys move one pixel, and Shift moves ten; Escape clears it.
3. Drag the sun on the net to change the light.
4. Double-click the sun to put it back.
5. The share button sends a link to this view.
6. The i on the net explains how to read it.

### "What's new"

- The latest three entries, newest first. Each is a date, written like
  "3 Oct 2026", and one sentence.
- An entry this device had not shown before this opening carries the same
  accent dot, and "New" for assistive technology. The marks last while the
  sheet is open and are gone the next time.

## 4. The news list

`src/help/news.json` is an array of entries, oldest first:

```json
{ "id": 3, "date": "2026-10-03", "text": "The share button sends a link that reopens this view, with a picture of it." }
```

- `id` is a whole number that rises by one with each entry. Two entries can
  share a date, so the date cannot say which entries were seen.
- `text` is one plain sentence written for a geoscientist using the app, not
  for a developer.
- An entry is added only for a change worth telling a user about. A change
  with no entry raises no dot.
- No entry names the app or the sheet it is shown in. The name is provisional
  and set in one place, and the same sentence is read in `CHANGELOG.md`.

The first entries:

| id | date | text |
|---|---|---|
| 1 | 2026-10-02 | The first version: a hillshade beside a Schmidt net of every pixel, with a sun you can drag. |
| 2 | 2026-10-03 | The app reopens on the DEM, pixel and sun you left. |
| 3 | 2026-10-03 | The share button sends a link that reopens this view, with a picture of it. |
| 4 | date it ships | The help button shows how to use the app and what has changed. |

`src/help/news.ts` holds pure functions over the list:

- `latest(entries, n)`: the last `n` entries, newest first.
- `newestId(entries)`: the highest `id`, or 0 for an empty list.
- `isUnseen(entry, seen)`: true when `entry.id > seen`.

## 5. What the device remembers

- One value: the highest `id` this device has shown, under
  `pixel-net:news-seen` in local storage. `src/help/newsStore.ts` reads and
  writes it, guarded like `viewStore.ts`. Nothing stored, or a value that is
  not a whole number, reads as 0.
- The dot shows when `newestId` is greater than the remembered value.
- Opening the sheet writes `newestId` and clears the dot. The sheet keeps the
  value it opened with, to mark the entries that were new.
- When storage is closed to the app, the dot shows on each visit and clears
  for that visit when the sheet opens.
- The value is not part of the view. It is not in the address and is not
  shared.

## 6. Components

- `src/components/HelpButton.tsx`: the button, the dot, and the open state. It
  renders the sheet.
- `src/components/HelpSheet.tsx`: the sheet and its two parts. It takes the
  entries to show, the remembered value it opened with, and whether the
  pointer is coarse.
- `src/help/howTo.ts`: `howToLines(coarse)`, the six lines for the device.
- `src/components/TitleBar.tsx` gains the help button after the share button.
- The sheet is built on `@radix-ui/react-dialog`, a new dependency of the same
  family as the tooltip. It supplies the focus trap, Escape, the outside
  press, and the dialog semantics.
- `useCoarsePointer` decides which lines show.
- Styles go in `src/app.css` from `tokens.css`, as the share button's did.
- Everything is bundled and precached with the shell. The service worker does
  not change, and the sheet works with no signal.
- The shared picture is drawn on its own canvas and is not affected.

## 7. The changelog

- `npm run changelog` runs `scripts/make-changelog.mjs`, which reads
  `src/help/news.json` and writes `CHANGELOG.md` at the repository root: every
  entry, newest first, grouped under a heading for each date.
- With `--print` the script writes the text to standard output and leaves the
  file alone. A unit test runs it that way and compares the result with the
  file. The test fails when they differ, and unit tests gate the deploy, so a
  forgotten run is caught before it ships.
- `CHANGELOG.md` says at its top that it is written from the list and how to
  add an entry.

## 8. Edge cases

- Empty list: no dot, and "What's new" is left out of the sheet.
- Fewer than three entries: the sheet shows what there is.
- A remembered value higher than `newestId` (an entry was removed): no dot.
- The pointer type changes while the sheet is open: the lines follow it.
- The sheet is open when the window is resized or the phone is turned: it
  takes the arrangement for the new size.

## 9. Testing

Unit (Vitest):

- `latest`, `newestId` and `isUnseen`, including the empty list.
- The list itself: ids start at 1 and rise by one, dates are valid, and each
  text is non-empty.
- `howToLines` for touch and for pointer.
- `CHANGELOG.md` matches the list.

Browser (Playwright, phone and desktop sizes, `e2e/help.spec.ts`):

- A fresh device shows the dot. Opening the sheet clears it, and it stays
  cleared after a reload.
- A device that remembers an older `id` shows the dot, and only the newer
  entries are marked.
- The close button, a press outside and Escape each close the sheet and
  return focus to the help button.
- Touch shows the touch lines; a mouse shows the pointer lines.
- The sheet fits the viewport with no scrolling, upright, sideways and on a
  desktop.
- Existing specs that count or locate title bar controls still pass.

By hand, added to the list in `docs/polish-pass.md`: the sheet's bottom edge
against the safe area on a real phone.

## 10. Records to update

- `PRODUCT.md`: the help button and sheet under confirmed functionality; the
  items of section 2 under out of scope.
- `README.md`: `npm run changelog` in the command table, and how to add a news
  entry.
