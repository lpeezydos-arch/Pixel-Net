# Share and restore — design

Date: 2026-10-03
Status: approved 2026-10-03. The implementation plan is
`docs/superpowers/plans/2026-10-03-share-and-restore.md`

This extends `2026-10-01-pixel-net-design.md`, called "the first spec" below.
Section numbers here are this document's own.

## 1. Purpose

Two additions to the one screen:

- The app reopens where it was left: the same DEM, the same selected pixel
  and the same sun.
- One share button sends a picture of the view and a link that opens the same
  view on another device.

Success means:

- Closing the app and opening it again shows the DEM, pixel and sun it had.
- A link made on one device opens the same DEM, pixel and sun on another.
- One press on a phone opens the share sheet with a picture and the link.
- A link pasted into a message shows a preview card.
- The screen gains one icon button and nothing else.

### What was asked for and what was decided

Asked for, on 2026-10-03, after a comparison with similar apps: remember
where the user left off; one share button that shares a picture of the screen
and a link that restores the DEM, the pixel and the sun; link-preview tags.

Decided in conversation the same day:

- The address bar always shows the current view, so a bookmark, or a copy
  from the address bar, restores it with no button.
- The picture follows the screen's arrangement: stacked when the cards are
  stacked, side by side when they are side by side.
- Where the browser has no share sheet, the button copies the link. No image
  is offered there.
- The share button comes before the terrain in the Tab order.
- The `lauren-frontend-design` skill is not installed on the development
  machine, so the button is built from `tokens.css` and the recipes already
  in `src/app.css`.

This reverses two decisions of the first spec: "Shareable links to a selected
pixel" was out of scope (section 2), and the sun "returns to the default each
time the app opens" (section 3).

## 2. Scope

In scope:

- A text form of the view, kept in the address bar and on the device.
- Restoring the view when the app opens, and when a link is pasted into an
  open tab.
- A share button in the title bar.
- A picture of the view, drawn for sharing.
- Static link-preview tags and one preview image.

Out of scope:

- Saving the picture where there is no share sheet (Firefox on a desktop,
  Chrome on Linux). That would need a menu.
- Short links, QR codes, embeds and buttons for particular social networks.
- A preview card that shows the linked view. Preview tags are static, so
  every link shows the same card.
- Opening a link in the installed app on an iPhone. iOS opens links in
  Safari, which keeps its own saved view; the link carries the whole view for
  that reason.
- Remembering that the "Double-tap to clear" hint has been learned.
- The manifest `id`, install prompts, and notices about offline use or
  updates.

## 3. The view and its link

### The view

| Part | Meaning | Default |
|---|---|---|
| DEM | The `id` of an entry in `dems.json` | The first entry |
| Pixel | Column and row of the selected pixel, counted from 0 at the north-west corner | None selected |
| Sun | Azimuth and height in whole degrees | 315, 45 |

### The string

The view is written as `dem=<id>&px=<column>,<row>&sun=<azimuth>,<height>`,
in that order.

- `sun` is left out when the sun is at its default.
- `px` is left out when nothing is selected.
- When the DEM is the first in the list, nothing is selected and the sun is
  at its default, the string is empty. Any other view names its DEM, so a
  link keeps its meaning if the list is reordered.
- Sun values are rounded to whole degrees, the precision the sun's label
  shows. An azimuth that rounds to 360 is written as 0.

| View | String |
|---|---|
| First DEM, nothing selected, default sun | (empty); `dem=<id>` in a shared link (section 4) |
| Gore, pixel 150, 210 | `dem=gore&px=150,210` |
| Gore, pixel 150, 210, sun from 120° at 35° | `dem=gore&px=150,210&sun=120,35` |
| Gore, nothing selected, sun from 120° at 35° | `dem=gore&sun=120,35` |
| Second DEM, nothing else | `dem=second` |

### Reading a string

A string is read leniently; a part that cannot be used is dropped and the
rest still applies.

- `dem` that names no entry in the list: the first DEM is shown and `px` is
  dropped, because the pixel belonged to another DEM. With no `dem`, the
  first DEM is meant.
- `px` that is not two whole numbers, or lies outside the DEM: dropped.
- `sun` that is not two numbers: the default sun. An azimuth outside 0–360 is
  wrapped; a height outside 10°–90° is limited to that range.
- Unknown parts are ignored.

A string that is read describes the whole view: a part it leaves out takes
its default.

### Where it is kept

- In the address bar, as the fragment after `#`. A fragment is never sent to
  the host or the service worker, so links work on GitHub Pages and offline
  with no further handling. The address is replaced in place; no history
  entry is added, so Back still leaves the app.
- On the device, in `localStorage` under the key `pixel-net:view`. The
  `github.io` origin is shared with the account's other sites, so the key is
  prefixed. An empty view removes the key.

Both are written 400 ms after the last change to the DEM, the selection or
the sun, so nothing is written during a drag. They are written at once when
the page is hidden or closed, so a tab killed within that 400 ms keeps its
place. Safari refuses more than 100 address changes in 10 seconds; writing
only when the view settles stays far below that.

If storage or the address cannot be written (a private window, the Safari
limit), the failure is ignored and the app carries on.

### Opening

1. If the address has a fragment that names any of `dem`, `px` and `sun`, it
   is the view. Otherwise the saved string is. Otherwise the defaults.
2. The sun and the DEM take their values before the first paint, so the
   terrain is lit correctly from the first frame and nothing moves.
3. The pixel is selected when its DEM has loaded. The ring, the point and the
   readout appear as they do after a press, and the point pulses once as on
   any first selection. Nothing is announced: no one asked for it to be
   spoken.
4. Once the first DEM has loaded, the address and the saved string are
   rewritten to the view shown, so a link with an unusable part is corrected.

A link therefore wins over the saved view, and opening a link makes it the
saved view.

### While the app is open

- Changing the fragment of an open tab, by pasting another link or editing
  the address, applies that view: the DEM switches if it differs, the pixel
  is selected once its DEM has loaded, and the sun moves without a glide.
- A fragment that is emptied by hand, or that names none of `dem`, `px` and
  `sun` (such as `#top`), is ignored; the address is filled in again at the
  next change.
- Switching DEMs with the picker still clears the selection and keeps the
  sun, as in the first spec.

## 4. The share button

### Placement and look

At the right end of the title bar, after the DEM's name or the picker.

- An icon button: lucide `Share`, 20px, in `--ink-700` on a transparent
  ground; `--sunken` behind it on hover; a pill; the standard focus ring.
- 40px square, and `--touch` (44px) on a touch screen.
- Not accent-colored. Rust stays reserved for the selection.
- Accessible name and tooltip: "Share this view".
- Disabled, in `--ink-400`, until a DEM is ready; disabled again while a DEM
  is loading or has failed.

Known limit: with three or four DEMs on a phone the picker and the app name
are cut shorter than before, by the width of the button.

### What a press does

The picture (section 5) and the link are made inside the press itself, with
no waiting step, because Safari can refuse a share that starts after one.

1. If the browser can share files, the share sheet opens with the picture,
   the link, the app's name as the title and one line of text.
2. Otherwise, if it has a share sheet, the sheet opens with the link, the
   title and the text.
3. Otherwise the link is copied.

If the share sheet fails for a reason other than the user closing it, the
link is copied. If the picture cannot be made, the link is shared without it.

| Outcome | What the user sees and hears |
|---|---|
| Shared | Nothing more; the share sheet has said so |
| Share sheet closed | Nothing |
| Link copied | The icon becomes a check mark and the tooltip reads "Link copied" for 1.6 s; a polite live region says "Link copied" |
| Copy refused | The tooltip reads "Could not copy the link" for 1.6 s, and the live region says so; the address bar still holds the link |

### Words

- Title: the app's name.
- Text with a pixel selected: "Gore Range, Colorado: slope 36.0°, aspect
  259° W, elevation 3,874 m". On a no-data pixel: "Gore Range, Colorado: no
  data at this pixel". With nothing selected: "Gore Range, Colorado".
- Link: the page's address, without any query, with the view as its
  fragment. A link always names its DEM, so the default view is written
  `dem=<id>` here rather than left empty.

## 5. The picture

A figure drawn for sharing at a fixed size. It is not a screenshot: it has no
title bar, no buttons, and is the same on every screen.

### Arrangement and sizes

Sizes are in image pixels. The net is a 720 square in both arrangements.

| | Side by side (the cards sit side by side) | Stacked (the cards are stacked) |
|---|---|---|
| Order | Terrain left, net right | Net above, terrain below |
| Terrain | 720 high, width from the DEM's shape, at most 1440 | 720 wide, height from the DEM's shape, at most 1440 |
| Space | 48 around, 40 between | 48 around, 40 between |

A terrain that reaches the 1440 limit is scaled to fit and centered beside,
or under, the net. For Gore Range, with a pixel selected, the picture is
1561 × 940 side by side and 816 × 1715 stacked.

### What is drawn

On white (`--paper`):

- The terrain: the hillshade under the current sun, with rounded corners
  (square where the canvas has no `roundRect`), and the selection ring if a
  pixel is selected.
- The net: rim, rings, cross, compass letters and ring labels; the cloud; the
  sun marker; the selected pixel's point, drawn over the sun. A flat pixel's
  point is hollow at the center, and a no-data pixel has none, as on screen.
- Lines, dots and letters are the screen's, enlarged one and a half times, in
  the same token colors. The accent appears only on the ring and the point.
- The info dot, the sun's label and the loupe are not drawn.

### Caption

Under the terrain and the net, left-aligned, 28 below them:

| Line | Text | Style | Line height |
|---|---|---|---|
| Readout, only with a pixel selected | "Slope 36.0° · Aspect 259° W · Elevation 3,874 m", or "No data at this pixel" | 30px, 600, `--ink-900` | 40 |
| Facts | "Gore Range, Colorado · 5 m pixels · 288 × 294" | 20px, 400, `--ink-500` | 28 |
| Source | "Sun 315° NW · 45° high · lpeezydos-arch.github.io/Pixel-Net" | 20px, 400, `--ink-500` | 28 |

The source line names the sun, then the page's host and path, so a picture
pasted into a report still says what it is and where it came from. With the
sun overhead it reads "Sun overhead". A line too long for the picture is set
smaller until it fits.

The typeface is the page's own, Source Sans 3, which is already loaded when
the button is pressed.

### File

A PNG named after the app and the DEM, for example `pixel-net-gore.png`.

## 6. Link preview

`index.html` gains static Open Graph and Twitter tags: type, title (the app's
name), description, address, image with its size and alternative text, and a
large-image card.

- The image is `public/preview.png`, 1200 × 630: the app at that size with
  the Gore Range and a pixel selected. `npm run preview-image` redraws it, as
  `npm run icons` redraws the icons. It is committed.
- Preview tags need absolute addresses, so the site's address is set in
  `.env` as `VITE_SITE_URL`, beside the app's name. A deployment to another
  host changes that one line.
- The preview image is left out of the offline cache; the app never shows it.

## 7. Architecture

### New units

| Unit | Job | Interface | Depends on |
|---|---|---|---|
| `state/view` | The view and its string | `encodeView(view, firstDemId) → string`, `encodeSharedView(view, firstDemId) → string`, `decodeView(string) → View`, `namesView(string) → boolean`, `pixelInside(pixel, width, height) → boolean` | `terrain/net` for the default sun |
| `state/viewStore` | Read and write the string in the address bar and on the device | `readFragment() → string`, `readSaved() → string`, `writeView(string)`, `shareLink(string) → string` | the browser |
| `state/useViewPersistence` | Apply a view to the app; write the view when it settles | a hook given the DEM list, the loaded DEM, the motion values and a way to switch DEMs | `state/view`, `state/viewStore` |
| `share/cardLayout` | Where everything goes in the picture | `cardLayout({ mode, aspect, lines }) → boxes and size` | nothing |
| `share/text` | The share text, the caption lines and the file name | plain functions of the place, the readout, the DEM and the sun | `terrain/format`, `terrain/net` |
| `share/drawCard` | Draw the picture and turn it into a file | `drawCard(input) → canvas`, `cardFile(canvas, name) → File` | `share/cardLayout`, `terrain/hillshade`, `terrain/cloud`, `terrain/net` |
| `share/share` | Choose share sheet or copy | `shareView({ title, text, url }, file) → 'shared' \| 'cancelled' \| 'copied' \| 'failed'` | the browser |
| Share button | The button, its tooltip, check mark and announcement | props: `disabled`, `onShare` | Radix Tooltip, lucide-react |

`state/view`, `share/cardLayout` and `share/text` are plain functions with no
screen code, tested in Vitest. The rest touch the browser and are tested in
Playwright.

### Changes to existing units

- `state/useDems` takes the DEM to open first, and a loaded DEM carries its
  `id`, so a pixel waiting to be restored is applied to the DEM it belongs to
  and never to the one still on screen during a switch.
- `App` reads the starting view once, gives the sun's motion values and
  `useDems` their starting values, and passes the share button what it needs.
- `TitleBar` groups the DEM's name or picker with the share button at its
  right end.
- `vite.config.ts` leaves `preview.png` out of the offline cache.

### Data flow

1. On open, `App` reads the fragment if it names a view, or else the saved
   string, and decodes it.
2. The sun and the starting DEM come from it. The pixel waits.
3. When a DEM finishes loading, a waiting pixel that belongs to it and lies
   inside it is selected.
4. Any change to the DEM, the selection or the sun starts a 400 ms timer.
   When it ends, the view is encoded and written to the address bar and the
   device.
5. A `hashchange` event whose fragment names a view decodes it and goes to
   step 2.
6. A press on the share button encodes the view as a shared link writes it,
   draws the picture if the share sheet says it takes a PNG, and hands both
   to `share/share`.

Per-frame values stay in motion values, as in the first spec. The hook
listens to them; nothing here re-renders during a drag.

## 8. Limits and failures

- Storage blocked or full, or the address refused: ignored; the app works
  without restoring.
- A link from an older list of DEMs: section 3, "Reading a string".
- The picture is about one and a half million pixels and is drawn and encoded
  inside the press. On a slow phone that is a pause of a few tenths of a
  second before the share sheet appears.
- Some share targets take only the picture or only the link when given both.
  That is the target's choice; the source line on the picture names the site
  either way.

## 9. Accessibility

- The button has a name, a tooltip on hover and focus, the standard focus
  ring, and a 44px target on a touch screen.
- Tab order: the picker, the share button, then the terrain and the sun in
  the order the first spec gives them.
- "Link copied" and "Could not copy the link" are spoken by a polite live
  region and shown beside the button.
- The check mark replaces the share icon at once, with no animation, so
  reduced motion needs no special case.
- A restored selection is not announced.

## 10. Testing

### Automated: plain functions (Vitest)

- `encodeView`: each row of the table in section 3; sun values are rounded;
  an azimuth of 359.6 is written as 0.
- `decodeView`: every string `encodeView` writes reads back to the same view;
  bad `px` and bad `sun` are dropped; height is limited to 10–90 and azimuth
  wrapped; unknown parts are ignored; literal and percent-encoded commas both
  read.
- `pixelInside`: inside, on each edge, and outside.
- `cardLayout`: both arrangements for Gore Range, with and without the
  readout line; a DEM twice as wide as tall and one twice as tall as wide
  stay within the 1440 limit and are centered; nothing overlaps and
  everything lies inside the picture.
- `share/text`: the three forms of the share text; the caption lines with
  and without a selection, for a no-data pixel and for the sun overhead; the
  file name.

### Automated: the browser (Playwright, phone and desktop)

- Reloading after selecting a pixel and moving the sun shows the same
  readout, ring, point and sun.
- The view is saved when the page is hidden, without waiting for the timer.
- A link with a pixel and a sun opens that view; the terrain is lit by the
  link's sun.
- A link wins over a saved view, and becomes the saved view.
- The address follows the view after a selection settles, and is bare again
  once the selection is cleared and the sun reset.
- Pasting another link into the open tab applies it.
- With two DEMs: a link to the second DEM opens it with its pixel; a link
  whose DEM is unknown opens the first DEM with no pixel and corrects the
  address.
- A pixel outside the DEM is ignored and the address corrected.
- With storage that throws, the app opens and works.
- The share button is disabled while the DEM loads and after it fails, and
  enabled when ready.
- With a share sheet that takes files (a stand-in), a press shares a PNG of
  the size `cardLayout` gives for that screen, with the link, the title and
  the text; the picture is white at its corner and rust at the selected
  point.
- With a share sheet that takes no files, a press shares the link and text
  only.
- With no share sheet, a press copies the link, shows the check mark and
  "Link copied", and announces it; both go back after 1.6 s.
- A share sheet the user closes changes nothing; one that fails copies the
  link.
- The button is a 44px target on the phone, is reached by Tab after the
  picker with a focus ring, and four DEMs still fit a 360px screen.
- The preview tags are present, and `preview.png` is served as a 1200 × 630
  PNG and is not in the offline cache.

### By eye and by hand

- The first real picture, in both arrangements, is shown to the author
  before the work is called done.
- On a real phone: the share sheet opens with the picture and the link; the
  installed app reopens where it was left; a link sent to another phone
  opens the same view.

## 11. Records to amend when this is built

- First spec, section 12: an amendment dated 2026-10-03 that brings shareable
  links into scope, replaces "returns to the default each time the app
  opens", adds lucide `Share` and `Check` to the icons of section 6, and
  makes polish-pass item 4 applicable in section 10.
- `PRODUCT.md`: capabilities (share; the view is restored), the
  out-of-scope list (shareable links removed), and the sun's line.
- `README.md`: the opening paragraph, `VITE_SITE_URL`, and
  `npm run preview-image`.
- `docs/polish-pass.md`: item 4 met, with its tests; item 13's icon list;
  the hand checks above.

## 12. Amendments

Made on 2026-10-03 from the whole-branch review.

- Sections 3 and 4: a shared link always names its DEM. The default view is
  shared as `#dem=<id>`, so it opens as the default view on a device that
  has a saved view. The address bar and the saved string are still empty at
  the default view. Without this, section 1's "a link made on one device
  opens the same DEM, pixel and sun on another" did not hold for the default
  view.
- Section 4: a shared link leaves out any query the address arrived with.
  The address bar keeps it.
- Section 3: a fragment that names none of `dem`, `px` and `sun` is not a
  view. It is ignored on opening and when pasted into an open tab, as an
  emptied fragment is.
- Section 3: a view applied from a link empties the live region, so nothing
  said before it stays behind.
- Section 4: the picture is drawn only where the share sheet says it takes a
  PNG; a file check that throws counts as no.
- Section 5: where the canvas has no `roundRect` (older Safari) the terrain
  has square corners; a picture that cannot be made logs a warning.
