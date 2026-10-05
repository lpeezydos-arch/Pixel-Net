# A second DEM and a new picker — design

Date: 2026-10-04
Status: approved 2026-10-04. The implementation plan is
`docs/superpowers/plans/2026-10-04-second-dem-and-picker.md`

This extends `2026-10-01-pixel-net-design.md`, called "the first spec" below,
and follows `2026-10-03-help-and-news-design.md`. Section numbers here are
this document's own. It answers issue 3, "Add second DEM sample".

## 1. Purpose

The app gains a second sample DEM, Massanutten Mountain in Virginia, and a new
way to switch between DEMs that fits a narrow phone.

The picker in the first spec is a segmented control in the title bar. With two
real names it does not fit: at 412px wide "Gore Range" and "Massanutten" push
the app's name or the picker into an ellipsis. `PRODUCT.md` lists this as a
known limit.

Success means:

- A user can switch between Gore Range and Massanutten on a phone 320px wide
  with nothing in the title bar cut short.
- The title bar gains no new element. The DEM's name, which is already there,
  becomes the control.
- A user can tell the two landscapes apart before switching, by their shape
  and their pixel size.
- Nothing covers the terrain or the net unless the name is pressed.

### What was asked for and what was decided

Asked for, on 2026-10-04: add the new DEM, and find a way to switch DEMs that
keeps the clean, minimal look.

Decided in conversation the same day, with mockups:

- The control is the DEM's name in the title bar, with a small down arrow.
  Two other places were shown and not chosen: a chip on the terrain's corner,
  which hides pixels, and the line under the terrain, which needs 44px where
  the caption has 18px.
- Pressing it opens a sheet of tiles, two across: a hillshade, the name, then
  the region and the pixel size. Two other lists were shown and not chosen:
  names only, and rows with a small thumbnail.
- No more than two DEMs are expected. The limit of four stays.
- The sheet is the one Help uses: it rises from the bottom on a phone held
  upright and is a card in the middle everywhere else.

## 2. Scope

In scope:

- The Massanutten DEM, its entry in the list, and its source files in `data/`.
- The name in the title bar as a button, and the sheet of tiles it opens.
- A thumbnail for each DEM, and a script that makes them.
- Two new optional fields in `dems.json`, and a test that holds the list to
  the files.
- Removing the segmented control.

Out of scope:

- More than four DEMs. The first four in the list are shown, as now.
- A sheet that scrolls. Two tiles fit every supported screen; three or four
  can be taller than a short window (section 4, and the known limit in
  `PRODUCT.md`).
- Thumbnails that follow the sun. They are drawn once, at the default sun.
- Thumbnails drawn in the browser. That would load every DEM each time the
  sheet opens.
- Search, sorting or grouping of DEMs.
- Any change to what a switch does. It still keeps the sun and the density
  layer and clears the selected pixel.
- Any change to links or to the saved view. A link names its DEM by `id`, as
  now.

## 3. The control

With two to four DEMs, the title bar's end holds, in order: the DEM button,
the share button, the help button.

The DEM button:

- Shows the current DEM's `name` and a 16px down arrow (`ChevronDown`).
- Is set as the plain name is now, in `--fs-sm`, but at weight 600 and in
  `--ink-700`, so it reads as a control.
- Has no background at rest. Under the mouse or pressed it has the `--sunken`
  background, in a pill, and its text is `--ink-900`. With keyboard focus it
  has the focus ring.
- Is 40px tall, and 44px on a touch screen, like the icon buttons.
- Cuts a name that does not fit with an ellipsis. The arrow is never cut.
  "Massanutten" fits whole at 320px.
- Is named "DEM: Gore Range" to a screen reader, and says that it opens a
  dialog.
- Stays usable while a DEM loads and when a DEM fails, so a user can leave a
  DEM that will not open.

With one DEM the name is plain text with no arrow, as now. With none, nothing
is shown, as now.

The segmented control and its styles are removed.

## 4. The sheet

The sheet is a dialog named "DEM". It uses the `.sheet` and `.scrim` styles
Help uses, and holds:

- The heading "DEM", set as Help's headings are.
- A close button in the top right corner.
- One tile for each DEM, in the order of the list.

A tile is a button. It holds:

- The DEM's thumbnail, square, with `--r-md` corners. A thumbnail that is not
  square is cut to a square about its center. While it loads, or if it is
  missing, the square is `--sunken`.
- The `name`, in `--fs-sm` at weight 600.
- A line in `--fs-xs` and `--ink-500`: the `region`, a middle dot, and the
  pixel size, as in "Virginia · 100 m". A part the entry does not give is left
  out. With neither, there is no line.

The current DEM's thumbnail has a 2px ring in the accent color, with a 2px gap
of paper between the ring and the picture. Its tile is marked current for a
screen reader. A tile under the mouse has the same ring in `--line-strong`. A
tile with keyboard focus has the focus ring round its thumbnail.

Behavior:

- Opening the sheet puts focus on the current DEM's tile.
- Pressing a tile switches to that DEM and closes the sheet. Pressing the
  current DEM's tile closes the sheet and changes nothing.
- Escape, the close button and a press outside the sheet close it with no
  change.
- When the sheet closes, focus goes back to the DEM button.
- The sheet opens and closes with the motion Help's sheet has, and honors
  reduced motion as it does.

Layout:

| Screen | Sheet | Tiles |
|---|---|---|
| Phone upright (up to 520px wide) | Rises from the bottom edge, full width | Two across, sharing the width |
| Wider than 520px | A card 420px wide in the middle | Two across |
| Wider than 520px and up to 520px tall (a phone on its side) | A card in the middle, as wide as its tiles | One row, each tile 150px |

Gaps between tiles are `--sp-3`. On a phone on its side the card is never
wider than the screen less `--sp-4` each side; four tiles shrink equally to
fit a screen too narrow for them.

The sheet never scrolls. Four tiles upright on a phone 320px wide and 568px
tall take about 440px, and fit there. Three or four tiles are taller than a
short window: upright the sheet needs the window's width plus about 121px of
height, and as a card it needs 533px. Two DEMs, which is what the app ships,
fit everywhere. The known limit is in `PRODUCT.md`.

## 5. Data

### The DEM

`data/MASS/MASS_DEM_100m.tif` is 390 × 390 pixels at 100 m, in NAD83 / UTM
zone 17N, in meters, with square cells and no missing pixels. Its elevations
run from 140 m to 1,065 m. Its center is at 38.81°N, 78.43°W. It passes the
app's checks as it is, with no `gdalwarp` step.

It is copied to `public/dems/massanutten.tif`. The list becomes:

```json
[
  {
    "id": "gore",
    "name": "Gore Range",
    "place": "Gore Range, Colorado",
    "region": "Colorado",
    "file": "gore.tif",
    "width": 288,
    "height": 294,
    "cell": 5
  },
  {
    "id": "massanutten",
    "name": "Massanutten",
    "place": "Massanutten Mountain, Virginia",
    "region": "Virginia",
    "file": "massanutten.tif",
    "width": 390,
    "height": 390,
    "cell": 100
  }
]
```

Gore Range stays first, so it is still what a new visitor sees.

The folder `data/MASS/` is tracked, as `data/GORE/` is: the source DEM and its
four reference figures. `data/MASS.zip` is not tracked. The figure
All four figures are titled "Gore Range 05m" by mistake; their data is
Massanutten's. `PRODUCT.md` records this.

### The new fields

- `region`: a short name for where the DEM is, for the tile. Optional.
- `cell`: the pixel size in meters. Optional. The tile writes it as the
  caption writes the pixel size, without the word "pixels": "5 m", "2.5 m".

The caption under the terrain still takes the pixel size from the file.

### Thumbnails

A thumbnail is `public/dems/<id>.png`: the DEM's hillshade at the default sun
(azimuth 315°, height 45°), scaled so its shorter side is 360px. That is twice
a tile in the desktop card (180px), and still more than a tile at any size.

`npm run thumbs` runs a new script, `scripts/make-thumbs.mjs`. Like
`scripts/make-preview.mjs`, it builds the app and opens it in Playwright's
Chromium. For each entry in the list it opens the app on that DEM and saves
the pixels of the terrain's own canvas. The picture is therefore the app's own
shading, with no selection ring, loupe or rounded corners.

Thumbnails are committed. The service worker already precaches every `.png`
under the build, so they work with no signal.

### Holding the list to the files

A new unit test reads `public/dems/dems.json` and each file it names. It
fails if:

- an entry's `width`, `height` or `cell` differs from the file's;
- an entry has no thumbnail at `public/dems/<id>.png`;
- two entries share an `id`.

Unit tests gate the deploy, so a tile cannot state a wrong pixel size on the
live site.

## 6. Components

- `DemPicker` (new): the DEM button and the dialog's root. It takes the
  entries, the current `id` and `onSelect`. It holds whether the sheet is
  open. `TitleBar` shows it when there are two or more entries.
- `DemSheet` (new): the sheet's contents, inside the dialog root, as
  `HelpSheet` is inside Help's.
- `TitleBar`: loses the segmented control; keeps the plain name for one DEM.
- `DemEntry` in `src/state/useDems.ts`: gains `region?` and `cell?`.
- `src/terrain/format.ts`: gains a function that writes a tile's line from an
  entry.
- Help gains no line about the picker. One was planned, "Press the DEM's name
  to switch DEM.", and was dropped on 2026-10-04: with it the Help sheet, which
  cannot scroll, ran off a 320 × 480 screen. The arrow beside the name and the
  news entry say enough.

`useDems`, the view in the address and the saved view do not change.

## 7. What else changes

- `e2e/`: about twenty steps press the old tabs. They move to one helper that
  opens the sheet and presses a tile. Checks that a tab is selected become
  checks of the DEM button's text.
- `README.md`: "Add a DEM" gains the two fields and the `npm run thumbs` step.
- `PRODUCT.md`: the picker, the DEMs the app ships with, the evidence in
  `data/MASS/`, and the list of what is undecided. The known limit on the
  title bar is removed.
- `src/help/news.json`: one entry, "A second landscape, Massanutten Mountain.
  Press the DEM's name to switch." `CHANGELOG.md` is written out from it.
- `.gitignore`: `data/*.zip` in place of `data/GORE.zip`.
- `screenshots/`: `09-phone-two-dems.png` is retaken, and captures of the open
  sheet are added at phone, sideways and desktop sizes.

## 8. Testing

Unit tests:

- The tile's line: both parts, one part, neither, a pixel size with a
  fraction.
- The list against the files (section 5).

Browser tests, at phone and desktop sizes:

- The DEM button opens the sheet; the sheet is a dialog named "DEM"; the
  current DEM's tile has focus and is marked current.
- Pressing the other tile switches DEM, closes the sheet, and changes the
  button's text; focus is on the button.
- Escape, the close button and a press outside close the sheet with no
  change.
- With one DEM there is no button, only the name.
- With four DEMs the sheet fits the screen at 320 × 568, and on a phone on its
  side.
- At 320px wide with two DEMs, the app's name and "Massanutten" are both
  whole.
- A missing thumbnail leaves a `--sunken` square and a usable tile.
- The tab order: the DEM button, share, help, then the cards as now.
- The existing tests of a switch (sun kept, density kept, selection cleared,
  link and saved view) pass through the new helper.

By eye:

- The Massanutten net against `data/MASS/MASS_stereonet.png`.
- The sheet on a real phone: the thumb reaches both tiles, and the bottom
  safe area is clear.

## 9. Risks

- Massanutten at 100 m has gentle slopes. Its hillshade is paler than Gore's
  and its cloud sits near the center of the net. This is what the file says,
  and is left as it is.
- `npm run thumbs` needs Playwright's Chromium, as the browser tests do.
