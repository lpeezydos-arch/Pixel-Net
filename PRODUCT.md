# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: geoscientists reading a landscape. Hydrologists, geomorphologists,
and the author, using the net as a quick summary of a DEM's slope and aspect
while thinking about a site. They come back to it, on a phone or at a desk.
Confirmed 2026-10-02.

No other audience is confirmed. Learners being taught the net was offered and
not chosen; it is not a target.

## Product Purpose

One screen: a hillshade of a DEM beside a Schmidt net of every pixel in it.
Pressing or dragging on the terrain highlights that pixel's point on the net
and shows its slope, aspect and elevation. Dragging the sun on the net
re-lights the terrain. A button on the net lays a see-through density layer
over the cloud, which shows where its pixels crowd together. The app installs
to a phone's home screen and works with no signal after the first visit. It
reopens on the DEM, pixel, sun and density layer it was left on, and one button shares a link
that restores the view, with a picture of it where the share sheet takes one.

It exists so a geoscientist can see how a place on the terrain maps to a
position on the net, and read the net as a portrait of the landscape's slope
and aspect, without opening a GIS.

Success, from the approved spec (`docs/superpowers/specs/2026-10-01-pixel-net-design.md`):

- Dragging across the terrain on a phone feels immediate, and the point on the
  net is easy to follow by eye.
- The net matches the reference figure `data/GORE/GORE_stereonet.png`.
- The app opens and works with no signal after the first visit.
- All twenty items of the `lauren-frontend-design` polish pass are met
  (`docs/polish-pass.md`).

## Positioning

The live pixel-to-net link, in the hand. Touch a place and its point appears
on the net at once, with the sun adjustable, with no GIS and no setup.
Confirmed 2026-10-02 as the claim future work must protect.

A desktop GIS can compute slope and aspect for the same DEM but gives no live
correspondence between a place and its point. A static stereonet figure shows
the cloud with no way back to the terrain. Pixel Net is the two joined by a
finger.

## Operating Context

- Phones held upright or sideways, and desktop browsers. The screen never
  scrolls; both cards scale to the viewport.
- DEMs are bundled, not uploaded. Adding one is a GeoTIFF in `public/dems/`
  plus an entry in `public/dems/dems.json` and a thumbnail from
  `npm run thumbs`, usually after a `gdalwarp` step (README, "Add a DEM"). The
  app ships with two: Gore Range, Colorado, 288 × 294 pixels at 5 m, and
  Massanutten Mountain, Virginia, 390 × 390 pixels at 100 m.
- Deployed to GitHub Pages at https://lpeezydos-arch.github.io/Pixel-Net/ on
  every push to `main` (`.github/workflows/deploy.yml`); unit tests gate the
  deploy. Any static HTTPS host works with `BASE_PATH` set and
  `VITE_SITE_URL` changed to the new address, so the link-preview tags point
  at it.
- Development: `npm run dev` on :5173. Vitest covers terrain math, layout and
  formatting; Playwright runs at phone and desktop sizes against a production
  build, Chromium only. Safari and Firefox are checked by hand.
- The spec and its amendments are the design record; `docs/polish-pass.md`
  is the quality record, with a list of checks still to do on a real phone.

## Capabilities and Constraints

Confirmed functionality (spec §2–3):

- Pixel selection by touch, mouse and keyboard (arrows move one pixel, Shift
  plus an arrow moves ten). A loupe shows while pressing. The selection stays
  after release and clears when the DEM changes.
- Readout: slope in degrees to one decimal; aspect as whole degrees plus an
  eight-point compass letter; elevation in whole meters with a thousands
  separator. Flat pixels read "Flat"; no-data pixels read "No data".
- Sun: a draggable marker on the net. Default azimuth 315°, height 45°; height
  limited to 10°–90°; double-tap resets; keyboard adjustable. Persists across a
  DEM switch and is restored when the app reopens.
- Density layer: a button in the net's top-right corner turns on a translucent
  blue layer over the cloud. It is the Schmidt count: the share of plottable
  pixels in a circle covering 1% of the net, in times an even spread. Bands
  with a line at each level; levels are whole multiples of the smallest of 1,
  2, 5, 10 and 20 that gives six or fewer, starting at 2× when the step is 1.
  A one-line key on the net names the first level and the last. On a net
  under 240px, where it would cross the rim, the key is the last line of the
  readout beside the net. The net's tooltip says how it is counted. Off by
  default; kept across a DEM switch
  (`docs/superpowers/specs/2026-10-03-density-layer-design.md`).
- DEM picker: with two to four DEMs, the DEM's name in the title bar is a
  button with a small arrow. It opens a sheet of tiles, two across: a
  hillshade thumbnail, the name, then the region and the pixel size. The
  current DEM has a ring in the accent color. The sheet is the one Help uses
  and never scrolls. One DEM is plain text. More than four is unsupported
  (`docs/superpowers/specs/2026-10-04-second-dem-and-picker-design.md`).
- States: loading (skeletons), ready, selected, flat, no-data, and a DEM error
  card with "Try again".
- Offline: the shell, font, manifest, every `.tif` and the picker's thumbnails
  (`public/dems/*.png`) are precached (25 MB per file); new versions apply on
  the next open with no prompt.
- View: the DEM, the selected pixel, the sun and whether the density layer is
  on are written into the address
  (`#dem=gore&px=150,210&sun=120,35&density=1`, with an unselected pixel, a
  default sun and a layer that is off left out) and saved on the device; the
  app reopens on them, and a link that names a view wins over the saved view;
  a bare address opens the saved view
  (`docs/superpowers/specs/2026-10-03-share-and-restore-design.md`).
- Share: one button in the title bar opens the share sheet with a picture of
  the view and its link; a share sheet that takes no files gets the link alone,
  and where there is no share sheet the link is copied. A shared link always
  names its DEM, so even the default view opens as itself on a device with a
  saved view.
- Help: one button in the title bar opens a sheet with how to use the screen
  and the latest three changes. A dot in the accent color on the button marks changes the device
  has not shown; opening the sheet clears it. Nothing opens unasked. The
  changes are a hand-written list, `src/help/news.json`, which is also written
  out as `CHANGELOG.md`
  (`docs/superpowers/specs/2026-10-03-help-and-news-design.md`).

Technical constraints:

- A DEM must be a projected GeoTIFF in meters with square cells (equal to
  0.1%), elevations in meters; anything else shows the error card instead of
  a wrong net.
- Up to roughly two million pixels; shading is a single main-thread pass.
- Slope and aspect by Horn's 3×3 method; the net is the equal-area (Schmidt)
  projection of the upward normal; no cast shadows. Aspect is the downhill
  direction.
- With three or four DEMs the picker's sheet, which does not scroll, is taller
  than a short window. Upright it needs the window's width plus about 121px of
  height (441px at 320 wide, 533px at 412, 641px at 520), and as a card it
  needs 533px. Phones held upright have that; a short split-screen or desktop
  window may not, and there the top of the sheet is cut off. Two DEMs, which
  is what the app ships, fit everywhere.

Out of scope by decision (spec §2); do not reintroduce without a new decision:
aspect rose, patch or area selection; user-supplied or fetched DEMs; zoom or
pan; cast shadows or a sun set by date and time; dark theme; agency identity
chrome; native app-store builds. Shareable links left this list on 2026-10-03. The
density net left it the same day, as the density layer; still out of scope for
it: a legend with a color bar, the density at the selected pixel, a choice of
counting circle, levels or color, and Kamb contouring. Out of scope for
sharing (share and restore spec §2): saving the picture where there is no
share sheet; short links, QR codes and embeds; a preview card that shows the
linked view; opening a link in the installed app on an iPhone, where iOS opens
links in Safari.
Out of scope for help (help and news spec §2): anything that appears unasked,
such as a first-visit tour or a note after an update; an "About" part; the
full history inside the app; a link from the sheet to the changelog.

Terminology: DEM; hillshade; the net (Schmidt net); the cloud (every plotted
pixel); the point (the highlighted pixel); the density layer (bands over the
cloud where pixels crowd together); times an even spread (its unit); the key
(the line that names its levels); slope, aspect, elevation; the sun (azimuth
and height); loupe; readout; picker (the DEM's name in the title bar and the
sheet it opens); tile; caption.

Undecided:

- The product's real name. "Pixel Net" is a working title.

## Brand Commitments

- Not an official product of any agency. No agency identity chrome, and
  nothing that implies official status (spec §2, README).
- The name is provisional. "Pixel Net" is set in one place (`VITE_APP_NAME`)
  so it can change; do not build identity around it. Confirmed 2026-10-02.
- Binding visual constraint, recorded as given: styling follows the
  `lauren-frontend-design` skill. `src/styles/tokens.css` is that skill's
  tokens with the accent changed to rust; the three deliberate departures are
  listed in the README under "Design system" and in spec §6.
- Copy is plain and one sentence at a time: the hint, the error sentences and
  each tooltip (spec §3).

## Evidence on Hand

- `data/GORE/GORE_DEM_5m.tif`, the source DEM; `public/dems/gore.tif` is a
  copy of it.
- `data/GORE/GORE_stereonet.png`, the reference net the cloud is checked
  against by eye. Also there: `GORE_hillshade.png`, `GORE_rose.png` and
  `GORE_stereonet_density.png`: reference figures for the hillshade, for a
  view that is out of scope, and a Kamb-contoured figure of the same data. The
  Kamb figure is not the reference for the density layer, which is counted
  another way.
- `data/MASS/MASS_DEM_100m.tif`, the source of the second DEM;
  `public/dems/massanutten.tif` is a copy of it. Beside it are the same four
  reference figures as Gore's. All four are titled "Gore Range 05m" by
  mistake; their data is Massanutten's.
- `screenshots/`, twenty-three captures at phone and desktop sizes. Numbers 09
  and 21–23 show the picker and were taken 2026-10-04 after it was built; the
  rest were taken earlier that day and show the title bar with one DEM, before
  its name became a button.
- Automated tests in `src/**/*.test.ts` and `e2e/*.spec.ts`.
- `docs/polish-pass.md`: twenty items with evidence, plus hand checks on a
  real phone that are still open (safe areas, drag feel, loupe near the top
  edge, home-screen install, airplane mode, Safari and Firefox).
- Absent: no users' quotes, usage data, press or institutional endorsement.
  Do not fabricate any.

## Product Principles

1. The link is the product. Any change must keep the place-to-point
   correspondence immediate and easy to follow, on a phone, with a finger in
   the way.
2. One view, no scrolling. Everything fits the viewport, and the terrain stays
   within thumb reach.
3. Truth from the file. Numbers come from the DEM by a documented method; a
   DEM that cannot be trusted gets an error, never a wrong net.
4. Works with no signal. Data is bundled, the app is installable, and there is
   nothing to set up.
5. A personal tool, not an institution. Quiet, plain-spoken, and never
   mistakable for an official product.

## Accessibility & Inclusion

Established by the spec and the polish pass: a full keyboard path for
selection and the sun; focus rings at 3:1 or better; text at 4.5:1 and
controls at 3:1; touch targets of at least 44px; reduced motion honored,
springs included; a polite live region announces the readout when a drag ends
or a key press moves the selection. No further user-specific need has been
established.
