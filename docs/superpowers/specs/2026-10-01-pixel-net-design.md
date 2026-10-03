# Pixel Net — design

Date: 2026-10-01
Status: approved 2026-10-01; amended the same day while writing the
implementation plan (see section 12)

"Pixel Net" is a working title. The name is set in one place (the web app
manifest and the title bar) so it can change without touching anything else.

## 1. Purpose

A one-screen web app, for phone and desktop, that shows a hillshade of a DEM
beside a Schmidt net of every pixel in it. Pressing or dragging on the
hillshade highlights that one pixel's point on the net and shows its slope,
aspect and elevation. The user should come away seeing how a place on the
terrain maps to a position on the net.

Success means:

- Dragging across the terrain on a phone feels immediate, and the point on the
  net is easy to follow by eye.
- The net matches the existing reference figure
  (`data/GORE/GORE_stereonet.png`).
- The app opens and works with no signal after the first visit.
- It passes the polish pass in `lauren-frontend-design` (section 10).

### What was asked for and what was assumed

Asked for: works on desktop and mobile; shows a hillshade; tapping the
hillshade shows the pixel in a scatterplot; looks extremely polished; uses the
`lauren-frontend-design` skill's styling; a library for movement if one makes
it really good; a way to adjust the sun.

Decided during brainstorming: the scatterplot is the Schmidt net; the full
cloud stays visible and one pixel is highlighted; DEMs are bundled, not
uploaded; selection is by drag with a loupe; only the scatter net is shown;
the app installs and works offline; no USGS chrome; phone layout has the net
on top and the terrain below; the accent is rust; the sun is dragged on the
net.

Assumed, not confirmed: the net convention in section 4 (inferred from the
reference figure); Horn's method for slope and aspect (the method used for the
reference figure is unknown).

## 2. Scope

In scope:

- One screen: title bar, net card with readout, terrain card.
- Bundled DEMs listed in a manifest file, with a picker when there is more
  than one.
- Pixel selection by touch, mouse and keyboard.
- Sun direction and height, adjusted by dragging a marker on the net.
- Installable, offline-capable web app.

Out of scope:

- Density net, aspect rose, patch or area selection.
- User-supplied DEMs, or fetching DEMs by location.
- Shareable links to a selected pixel.
- Zoom or pan on the terrain.
- Cast shadows, or a sun set by date and time.
- Dark theme.
- USGS VID chrome (banner, header, footer).
- Native app-store builds.
- DEMs larger than about two million pixels (section 5).

## 3. The screen and its behavior

### Layout

Portrait (phone): a title bar of `--header-h` (56px), then the net card, then the terrain card,
then one caption line. The net card holds the net on the left and the readout
stacked on the right. The terrain card sits lowest, in thumb reach, so the
hand never covers the net or the readout while dragging on the terrain.

Wide (viewport at least 720px wide, or landscape): the terrain card on the
left and the net card on the right; the readout runs as a row under the net,
or beside the net when the screen is under 480px tall (a phone on its side).

The screen never scrolls. Both cards scale to fit the viewport height
(`100dvh`), keeping the terrain at the DEM's aspect ratio and the net square.
On a short phone the net shrinks first, to a minimum of 180px.

Safe-area insets are respected on all four sides.

### Title bar

App name on the left. DEM picker on the right: a segmented control when the
manifest lists two to four DEMs; plain text with the DEM's name when it lists
one. More than four DEMs is not supported.

### States

| State | Terrain card | Net card | Readout | Caption |
|---|---|---|---|---|
| Loading a DEM | Skeleton shimmer | Net frame drawn, shimmer in the plot area | Dashes | Empty |
| Ready, nothing selected | Hillshade | Frame, cloud, sun marker | Dashes | "Drag on the terrain to inspect a pixel" |
| Pixel selected | Hillshade and selection ring | Frame, cloud, sun marker, highlighted point | Slope, aspect, elevation | DEM place, pixel size, dimensions |
| Flat pixel selected | Hillshade and ring | Highlighted point at the center, drawn hollow | Slope 0.0°, aspect "Flat", elevation | As above |
| No-data pixel selected | Hillshade and ring | Highlighted point faded out | "No data" for all three | As above |
| DEM failed | Error card: one sentence and a "Try again" button | Frame only | Dashes | Empty |

Error card sentences:

- Load or read failure: "This DEM could not be loaded."
- Wrong units or non-square cells: "This DEM is not in meters with square
  cells, so its slopes cannot be computed."

When a DEM fails, the picker stays usable so another DEM can be chosen.

### Selecting a pixel

- Touch: press or drag on the terrain. The pixel under the touch point is
  selected continuously during the drag. The selection stays after release.
- Mouse: click or click-drag, same behavior.
- Keyboard: the terrain is focusable. Arrow keys move the selection one pixel;
  Shift plus an arrow moves ten. With nothing selected, the first arrow press
  selects the center pixel.
- The terrain element sets `touch-action: none` so a drag never scrolls or
  zooms the page.
- Switching DEMs clears the selection.

### Loupe

Shown while a finger or mouse button is down on the terrain; hidden on
release and for keyboard selection.

- A 96px circle with a white ring and `--shadow-2`.
- Shows the terrain at 8 screen pixels per DEM pixel, without smoothing, with
  the selected pixel centered and outlined in the accent.
- Sits 82px above the touch point. If that would leave the terrain card's top
  edge, it sits to the left or right of the touch point instead, on whichever
  side has room. It is kept inside the card's left and right edges. It never
  overlaps the net card and is never clipped.

### Readout

| Value | Format | Example |
|---|---|---|
| Slope | Degrees, one decimal | 36.3° |
| Aspect | Whole degrees and an eight-point compass letter | 264° W |
| Elevation | Whole meters with a thousands separator | 3,874 m |

Values use tabular numerals. During a drag they update every frame. A polite
live region announces the three values when a drag ends or a key press moves
the selection, not on every frame.

### Tooltips

One sentence each, from an `i` icon (Radix Tooltip; 300ms hover delay, instant
on focus, tap to toggle on touch).

- Net (icon in the top-left corner of the net's square): "Each dot is one
  pixel: its direction from the center is the way the slope faces, and its
  distance from the center is how steep it is."
- Slope: "How steep the ground is at this pixel, from 0° for flat to 90° for
  vertical."
- Aspect: "The compass direction this slope faces, looking downhill."
- Elevation: "The height stored in the DEM at this pixel."
- Sun marker (on hover and focus): "Drag to move the light, or double-tap to
  reset it."

### Sun

- A neutral marker on the net: a white disc with an ink sun icon and a soft
  shadow, at least a 44px hit area. It is not accent-colored.
- Default: light from azimuth 315° (northwest), 45° above the horizon.
- Dragging the marker re-lights the terrain every frame. A small dark label
  beside the marker shows direction and height while dragging, for example
  "ENE · 35° high", or "Overhead" at the center. The label replaces the
  tooltip while dragging.
- Height is limited to 10°–90°. Dragging to the center of the net puts the sun
  overhead; dragging past the 10° limit holds the marker at the limit.
- Only the marker is draggable. Pressing elsewhere on the net does nothing.
- Double-tap or double-click the marker to reset; it glides back and the
  terrain re-lights along the way.
- Keyboard: the marker is focusable. Left and right arrows change azimuth by
  5°; up and down change height by 5°; Home resets.
- The sun position persists when switching DEMs and returns to the default
  each time the app opens.
- The sun changes only the terrain image. The net cloud, the highlighted point
  and the readout do not depend on it.
- If the highlighted point and the sun marker overlap, the highlighted point
  is drawn on top.

## 4. Terrain math

All of this lives in plain functions with no screen code.

### DEM requirements

A DEM is accepted when its GeoTIFF keys say it is projected
(`GTModelTypeGeoKey` = 1) with linear units of meters
(`ProjLinearUnitsGeoKey` = 9001), and its pixel scale is equal in x and y to
within 0.1%. Anything else produces the wrong-units error card, including a
projected file that omits the units key: the app cannot tell meters from
feet. Elevation is assumed to be in meters. The no-data value comes from the
GDAL no-data tag; NaN also counts as no data. Integer elevations are
accepted.

`GORE_DEM_5m.tif` meets this: 288 × 294, 5 m cells, float32, projected Albers
NAD83 in meters, no-data −9999 with no such pixels present. Grid north is
within about 0.2° of true north there, and no correction is applied.

### Slope and aspect

Horn's 3×3 method, as used by GDAL and ArcGIS. With the window

```
a b c
d e f
g h i
```

and cell size `s`:

```
dz/dx (east)  = ((c + 2f + i) − (a + 2d + g)) / (8s)
dz/dy (north) = ((a + 2b + c) − (g + 2h + i)) / (8s)
slope  = atan( hypot(dz/dx, dz/dy) )
aspect = atan2( −dz/dx, −dz/dy ), in degrees clockwise from north, 0–360
```

Aspect is the downhill direction.

- Edge pixels: beyond an edge the surface is continued in a straight line
  from the two pixels nearest that edge, so a uniform slope measures the same
  at the edge as in the middle.
- A no-data neighbor takes the center pixel's value. A no-data center makes
  the pixel no-data.
- A pixel is flat when the gradient magnitude is below 1e-6. Flat pixels have
  no aspect.

### Net projection

A pixel with slope `σ` and aspect `α` plots at

```
r = √2 · sin(σ / 2)        (0 at the center, 1 at the rim)
x = r · sin α              (east is right)
y = r · cos α              (north is up)
```

This is the equal-area (Schmidt) projection of the upward surface normal. It
agrees with the reference figure, whose axes run to ±1.41 because it does not
normalize the rim to 1. The rings at 30° and 60° slope are at r = 0.366 and
r = 0.707.

Flat and no-data pixels are left out of the cloud.

### Hillshade

For a sun at azimuth `A` and height `h`:

```
light  = (cos h · sin A, cos h · cos A, sin h)
normal = (−dz/dx, −dz/dy, 1) / length
shade  = max(0, normal · light)
gray   = 40 + 215 · shade
```

The floor of 40 keeps shaded slopes readable; it matches the approved mockups.
There is no cast shadow. No-data pixels are transparent.

The sun marker's position on the net is the net projection with `σ = 90° − h`
and `α = A`. The inverse of the projection turns a drag position back into
azimuth and height.

## 5. Architecture

Vite, React and TypeScript. Vanilla CSS over `tokens.css`.

### Units

| Unit | Job | Interface | Depends on |
|---|---|---|---|
| `terrain/dem` | Fetch and read a GeoTIFF; validate it | `loadDem(url) → Dem` (width, height, cell size, elevations, no-data mask) or a typed error | `geotiff` |
| `terrain/surface` | Slope, aspect, unit normals and flat/no-data flags per pixel | `computeSurface(dem) → Surface` | nothing |
| `terrain/hillshade` | Gray value per pixel for a sun | `shade(surface, sun, out)` writing into a reused buffer | nothing |
| `terrain/net` | Projection and its inverse; compass letters | `toNet(slope, aspect) → {x, y}`, `fromNet(x, y) → {slope, aspect}`, `compass(aspect) → string` | nothing |
| Terrain canvas | Draw the gray buffer; redraw when the sun changes | props: surface, sun | `terrain/hillshade` |
| Net canvas | Draw the cloud once per DEM and on resize | props: surface | `terrain/net` |
| Net frame | Circle, cross, rings and labels as SVG | none | nothing |
| Moving pieces | Selection ring, loupe, highlighted point, sun marker; positioned by `transform` only | Motion values | `motion` |
| Pixel drag | Pointer and key events on the terrain → selected pixel | hook returning the selection and handlers | nothing |
| Sun drag | Pointer and key events on the sun marker → sun | hook returning the sun and handlers | `terrain/net` |
| App shell | Title bar, picker, readout, tooltips, caption, error card, state | React state | Radix Tooltip, lucide-react |

### Data flow

1. The manifest is fetched; the first DEM in it is loaded.
2. `loadDem` → `computeSurface`, once per DEM.
3. The net canvas draws the cloud. The terrain canvas shades and draws.
4. A pointer on the terrain becomes a column and row. Slope, aspect and
   elevation for that pixel are array lookups.
5. The selection ring and loupe move to the pointer. The highlighted point's
   target on the net is set and a spring moves it there. The readout text is
   written directly.
6. A pointer on the sun marker becomes azimuth and height. The gray buffer is
   re-shaded and redrawn on the next animation frame.

Per-frame values (pointer position, highlighted point, sun) are held in Motion
values and written straight to the moving pieces and the readout's text nodes.
React state changes only on DEM load, DEM switch, and selection start and end.

### Drawing

- Terrain canvas: backing store at DEM resolution, scaled by CSS with
  smoothing.
- Loupe: a small canvas drawn from the same gray buffer with smoothing off.
- Net canvas: backing store at CSS size × device pixel ratio, and never less
  than 2×. Each plotted pixel adds to a per-cell count `k`; the cell is drawn
  in `--ink-900` with alpha `1 − 0.7^k`, so overlapping points darken. That
  formula holds for a 640px image; at other sizes each point counts in
  proportion to the area of a cell, so the cloud is equally dark on every
  screen.
- The cloud is never redrawn during a drag.

### Size limit

Shading is a single pass over the pixels on the main thread. That is a
millisecond or two for GORE (85 thousand pixels) and acceptable to roughly two
million pixels. Larger DEMs would need shading on the GPU, which is out of
scope.

### DEM manifest

`public/dems/dems.json`, next to the `.tif` files:

```json
[
  { "id": "gore", "name": "Gore Range", "place": "Gore Range, Colorado", "file": "gore.tif" }
]
```

Each entry may also give the DEM's `width` and `height` in pixels, which lets
the layout settle before the file loads. The picker shows the first four
entries.

Adding a DEM is one file and one entry. The app ships with GORE alone until
the second sample is added. The source `data/` folder stays as it is;
`gore.tif` is a copy of `data/GORE/GORE_DEM_5m.tif`.

## 6. Look

From `lauren-frontend-design`:

- `assets/tokens.css` copied verbatim to `src/styles/tokens.css`, with only
  the per-app accent changed: `--accent: #b84a00`, `--accent-strong: #8f3900`.
- Source Sans 3, self-hosted through `@fontsource-variable/source-sans-3`.
- Page on `--surface`. Cards on `--paper` with `--shadow-1` and `--r-md`.
  Title bar on `--paper` with a `--line` hairline beneath.
- Recipes used: segmented control, cards and stat rows, tooltips and info
  dots, skeleton loaders, buttons (the "Try again" pill).
- One icon family, lucide-react: `sun` and `info`.
- Readout labels in `--ink-500`; values at `--fs-lg`, weight 600.
- Terrain in neutral gray. Cloud in ink. Net frame in `--line-strong` and
  `--line`; N, E, S, W and ring labels in `--ink-500` at `--fs-xs`.
- The accent appears only on the selection: the terrain ring, the highlighted
  point with a 3px halo outside it, and the loupe's center outline.
- Touch targets at least `--touch` (44px): picker segments, sun marker.
- Light theme only.

Deviations from the skill, all deliberate:

- No USGS VID chrome; this is not an official USGS app.
- `theme-color` is white, not the accent, so rust stays reserved for the
  selection.
- The focus ring is the accent at 80%, set in `src/app.css`. The design
  system's ring is the accent at 60%, which reaches the required 3:1 only
  with a dark accent; with rust it is about 2.5:1. `tokens.css` is untouched.

Home-screen icon: a net circle with a rust dot on `--surface`, in 192px,
512px and maskable sizes, plus an Apple touch icon.

## 7. Motion

Movement animates only `transform` and `opacity`; nothing animates width,
height or position. Color, background and shadow transitions on controls, and
the skeleton shimmer, follow the design system's recipes as written.

| Piece | Behavior |
|---|---|
| Selection ring, loupe position | Follow the pointer exactly; no easing |
| Loupe enter and exit | Fade and scale from 0.9 over `--t-fast`; exit at 0.7× that |
| Highlighted point | Spring to each new position, no visible overshoot; start from stiffness 300, damping 32 and stiffen until it keeps up with a fast drag on a real phone |
| Highlighted point, first selection | Fade in with one `pulse-once` |
| Highlighted point, flat or no-data pixel | Fade out over `--t-fast`; fade back in on the next plottable pixel |
| Sun marker | Follows the pointer exactly; on reset, springs back while the terrain re-lights each frame |
| Loading | Frame and skeletons at once; terrain fades in over `--t-fast`; cloud fades in once over `--t-slow` |
| DEM switch | Terrain and cloud crossfade over `--t-base` |
| Readout | Changes in place; no animation |

Reduced motion: springs become instant sets (checked with Motion's
`useReducedMotion`), token durations are already zero, and the skeleton
shimmer is static.

## 8. Offline

`vite-plugin-pwa`:

- Precache the app shell, the font, `dems.json` and every `.tif`, so any
  bundled DEM opens offline after the first visit. The precache size limit is
  raised from 2 MB to 25 MB per file so that a larger DEM is not left out.
- `registerType: 'autoUpdate'`: a new version downloads in the background and
  applies the next time the app opens. No prompt.
- Web app manifest: name, short name, `display: standalone`,
  `background_color: #f7f5f1`, `theme_color: #ffffff`, icons.

Hosting is any static host with HTTPS. Vite's `base` is read from an
environment variable so the build works at a domain root or a sub-path such
as GitHub Pages.

Supported browsers: current Safari, Chrome, Firefox and Edge.

## 9. Dependencies

Pre-approved by the skill's dependency policy:

| Package | Version checked 2026-10-01 | License | Use |
|---|---|---|---|
| `@fontsource-variable/source-sans-3` | 5.3.0 | OFL-1.1 | Font |
| `motion` | 13.5.0 | MIT | Springs and drag for the moving pieces. This is framer-motion under its current package name. |
| `@radix-ui/react-tooltip` | 1.2.16 | MIT | Tooltips |
| `lucide-react` | 1.49.0 | ISC | Icons |

Needing their own audit under that policy:

| Package | Version checked 2026-10-01 | License | Why |
|---|---|---|---|
| `geotiff` | 3.0.5 | MIT | Reads the DEMs in the browser; the alternative is a hand-written TIFF reader |
| `vite-plugin-pwa` | 1.3.0 | MIT | Service worker and manifest for offline use |
| `react`, `vite` | 19.3.0, 8.3.2 | MIT | Framework and build |
| `vitest`, `@playwright/test` (dev only) | 5.0.3, 1.63.0 | MIT, Apache-2.0 | Tests |

Versions and advisories are re-checked at install time.

## 10. Testing and definition of done

### Automated: terrain math (Vitest)

- A plane tilted 30° facing east gives slope 30° and aspect 90° at interior
  pixels; the same for the other three cardinal directions.
- A level surface is flagged flat, has no aspect, and is left out of the
  cloud.
- `toNet`: slope 0 plots at the center; slope 90° plots at r = 1; aspect 90°
  plots on the positive x axis. `fromNet(toNet(σ, α))` returns `σ, α`.
- `compass`: 0° is N, 264° is W, 337.5° is N.
- Hillshade, sun at 45°: a 45° slope facing the sun has gray 255; a 45° slope
  facing directly away has gray 40.
- No-data: a no-data center is flagged; a no-data neighbor does not make its
  neighbors no-data.
- `loadDem` on `gore.tif`: 288 × 294, 5 m cells, elevations 3,378.7 to
  4,054.6 m, accepted.
- `loadDem` rejects a small fixture GeoTIFF in degrees with the wrong-units
  error.

### Automated: interaction (Playwright, phone and desktop viewports)

- Dragging on the terrain shows the loupe, moves the highlighted point and
  fills the readout; releasing hides the loupe and keeps the selection.
- Pressing a known flat pixel shows "Flat" and hides the highlighted point.
- Arrow keys step the selection; Shift plus an arrow steps ten.
- Dragging the sun marker changes the terrain image; double-click resets it;
  the readout does not change.
- With two DEMs in a test manifest, switching clears the selection.
- A failing DEM URL shows the error card and "Try again".
- With the network disabled after a first load, the app reloads and works.

Playwright's Chromium does not run on the current development machine until
three system libraries are available: either installed with
`sudo npx playwright install-deps chromium`, or unpacked without root and
found through `LD_LIBRARY_PATH` (the plan and the README give the commands).

### By eye and by hand

- The cloud shows the same dense southwest and northeast clusters as
  `data/GORE/GORE_stereonet.png`.
- On a real phone: drag feel, spring tuning, loupe placement near the top
  edge, install to home screen, and opening in airplane mode.

### Definition of done

The polish pass in `lauren-frontend-design`, all twenty items. These are not
applicable and are recorded as such: item 4 (copy link; no linkable state),
item 5 (legends), item 6 (map controls), item 8 (popups), the datepicker and
VID-footer parts of item 9, and item 18 (VID chrome).

## 11. Open items

None of these blocks implementation.

- The real app name.
- The second sample DEM file and its manifest entry.
- The host, needed before testing installation on a phone.

## 12. Amendments after approval

Made on 2026-10-01 while writing and test-running the implementation plan.
None changes what the user sees in the approved design; each fixes something
found by running the code.

- Section 4: slopes at the edge of the DEM are measured by continuing the
  surface past the edge, not by repeating the edge pixel. Repeating it halved
  the gradient there, which drew a visible strip on the hillshade and a ring
  of wrong points on the net.
- Section 5: the cloud is drawn at no less than 2× and its darkness is scaled
  to the image size. Without this the cloud was much heavier on a desktop
  screen than on a phone.
- Section 4: a projected DEM that omits its units key is rejected; NaN counts
  as no data; integer elevations are accepted.
- Section 5: manifest entries may carry `width` and `height`; the picker shows
  the first four entries.
- Section 3: on a phone turned sideways the readout sits beside the net; the
  loupe is kept inside the card's side edges; the sun's label reads
  "Overhead" at the center and replaces the tooltip while dragging.
- Section 8: the precache size limit is raised to 25 MB per file.
- Section 10: browser tests can run without root.

Made on 2026-10-02 during implementation, from review findings.

- Section 7: "only `transform` and `opacity` animate" is reworded to cover
  movement. The design system's own segmented-control, button and skeleton
  recipes transition color, background and shadow, and section 6 requires
  those recipes.
- Section 6: values that are part of a copied recipe (the 40px button, the
  1.4s shimmer) stay as the design system wrote them. Sizes specific to this
  app use tokens, and the sizes that `layout.ts` and the stylesheet share are
  tied together by a test.
- Section 3: "landscape" is judged on the whole viewport, title bar included.

Made on 2026-10-02 from the whole-branch review.

- Section 6: the focus ring is overridden to the accent at 80% (see the
  deviations list). A test checks its contrast on every ground it appears on.
- Section 4: the no-data value is compared as the float32 the file stores, so
  a tag such as `-9999.9` or a short float32 minimum is recognized.
- Section 3: selecting the DEM already shown does nothing. Arrow keys held
  with Alt, Ctrl or Meta are left to the browser. A drag whose pointer is lost
  ends cleanly, on the terrain and on the sun. The net point pulses on its
  first appearance after the selection was cleared, even if the first pixel
  pressed was flat.
- Section 3, known limit: on a phone the picker stays inside the screen with
  up to four DEMs, but with three or four the names, and the app name, are
  cut short with an ellipsis. Two DEMs fit in full.
- Section 10, known limit: the automated browser tests run in Chromium only.
  Safari and Firefox are checked by hand.

Made on 2026-10-02 from the first design critique (`.impeccable/critique/`),
which found the sun to be a control without a state, the keyboard reaching
the terrain last on a desktop, and the net starved on tall phones and
upright tablets.

- Section 3, layout: the 720px rule is gone. A landscape viewport puts the
  cards side by side; an upright one takes whichever arrangement gives the
  larger smaller card, so a tablet held upright stacks them. On a phone the
  cards span the screen; in an upright window wider than the 520px column
  the column is shared so the net is as large as the terrain allows. The
  readout moves under the net when leaving it beside the net would leave
  more than half a readout row of the screen empty. The net card is never
  wider than the terrain card.
- Section 3, reading order: when the cards sit side by side the terrain
  comes before the net in the document, so Tab reaches it first.
- Section 3, sun: its position is always written beside it: quietly at
  rest, in the net labels' voice with a paper halo, and raised into the
  dark label while it is dragged, for 1.5 s after a key press, and for 2 s
  after a single tap, when it reads "Double-tap to reset" if the sun is off
  its default. The button's accessible name carries the position ("Sun,
  NW · 45° high. Arrow keys move the light; Home resets it."), and a polite
  live region announces it when a drag or a run of key presses ends and
  after a reset. The tooltip reads "Drag, or use the arrow keys, to move
  the light. Double-click or Home resets it." and closes once the keys move
  the sun.
- Section 3, tooltips: the three readout info dots are folded into the
  net's one, which now explains the net and the three values. The dot is
  help, not a control: it is not a Tab stop, its text is also the net
  region's accessible description, and it opens below the dot so it never
  covers the app name on a phone.
- Section 3, caption: the hint names the pointer the screen has ("Click or
  drag…" with a mouse), and while the terrain has keyboard focus with
  nothing selected it reads "Arrow keys choose a pixel · Shift moves ten".
- Section 6: the only DEM's name in the title bar is plain `--ink-500` text
  at 400 weight, so it no longer dresses like the picker. The loading
  shimmer multiplies over the net frame, so the rings and cross show
  through it as section 3 always said they should.

Made on 2026-10-02 from the second critique, which found the sun
undiscoverable as a control on a phone, the lake giving the net nothing
back, two dialects for direction, no way out of a selection, and the
cards stopping at 520px on a monitor.

- Section 3, states: a flat pixel's point is drawn at the center of the net,
  hollow, instead of fading out; flat ground has no direction, and the
  center is where slope 0° plots. A no-data pixel still has no point. The
  cloud is unchanged: flat pixels are still left out of it.
- Section 3, sun: the label, the accessible name and the announcement are
  written the way the aspect readout is, degrees first and then the
  eight-point letter: "315° NW · 45° high". A single tap on the sun at its
  default says "Drag to move the light"; once it has been moved, "Double-tap
  to reset". On a touch screen the disc stirs once, 0.9 s after it appears,
  to say that it can be moved; not under reduced motion.
- Section 3, selecting a pixel: Escape on the terrain clears the selection
  and announces "Selection cleared"; the caption returns to the hint. A live
  region is emptied before its words are written back, so pressing the same
  pixel again, or stepping into the DEM's edge, is spoken again.
- Section 3, layout: the widest a card gets is 760px, not 520px, so a
  laptop's cards are each half its width and a monitor's grow to 760px. A
  screen 520px wide or narrower is still a phone: its cards span it.
- Section 6: the resting sun label's paper stroke is 4px, so it reads over
  the dense arcs of the cloud.
