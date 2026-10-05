# Pixel Net

A one-screen web app that shows a hillshade of a DEM beside a Schmidt net of
every pixel in it. Press or drag on the terrain and that pixel's point is
highlighted on the net, with its slope, aspect and elevation. Drag the sun on
the net to change the lighting. It installs to a phone's home screen and works
with no signal after the first visit. It reopens where it was left, and the
share button sends a link that restores the view, with a picture of it where
the share sheet takes one.

The design is in `docs/superpowers/specs/2026-10-01-pixel-net-design.md`;
sharing and restoring are in
`docs/superpowers/specs/2026-10-03-share-and-restore-design.md`.

## Run it

Needs Node 22.12 or later.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm test` | Unit tests for the terrain math, layout and formatting |
| `npm run test:e2e` | Browser tests at phone and desktop sizes, against a production build |
| `npm run build` | Type-check and build into `dist/` |
| `npm run preview` | Serve `dist/` at http://localhost:4173 |
| `npm run icons` | Redraw the app icons in `public/icons/` |
| `npm run preview-image` | Redraw the link-preview image, `public/preview.png`; needs Chromium |
| `npm run thumbs` | Write each DEM's thumbnail for the picker, `public/dems/<id>.png`; needs Chromium |
| `npm run changelog` | Rewrite `CHANGELOG.md` from the news list, `src/help/news.json` |

### Browser tests need Chromium's system libraries

Once per machine:

```bash
npx playwright install chromium
sudo npx playwright install-deps chromium
```

Without `sudo` on Ubuntu, unpack the three missing libraries somewhere and
point the tests at them:

```bash
mkdir -p ~/.cache/pixel-net-libs && cd ~/.cache/pixel-net-libs
apt-get download libnspr4 libnss3 libasound2t64
for deb in *.deb; do dpkg -x "$deb" root; done
export LD_LIBRARY_PATH=~/.cache/pixel-net-libs/root/usr/lib/x86_64-linux-gnu
```

## Add a DEM

1. Check the file. It must be a GeoTIFF in a projected coordinate system in
   meters, with square cells, and elevations in meters. `gdalinfo your.tif`
   should show `UNIT["metre"...]` and a pixel size with two equal numbers. To
   convert one that is in degrees or feet (pick the UTM zone for your area):

   ```bash
   gdalwarp -t_srs EPSG:32613 -tr 5 5 -r bilinear input.tif output.tif
   ```

2. Copy it into `public/dems/`.
3. Add an entry to `public/dems/dems.json`:

   ```json
   {
     "id": "short-id",
     "name": "Name in the picker",
     "place": "Place shown under the terrain",
     "region": "Short place name on the picker's tile",
     "file": "your.tif",
     "width": 288,
     "height": 294,
     "cell": 5
   }
   ```

   `region`, `width`, `height` and `cell` are all optional. `width` and
   `height` are the DEM's pixel dimensions and `cell` is its pixel size in
   meters. With the dimensions the screen does not shift when the DEM
   finishes loading; `region` and `cell` make the line under the DEM's name in
   the picker. `npm test` fails if any of the three differs from the file.

4. Make its thumbnail for the picker:

   ```bash
   npm run thumbs
   ```

   This writes `public/dems/short-id.png` for every DEM in the list. It needs
   Playwright's Chromium, as the browser tests do.

A DEM that does not meet the requirements shows an error card in the app
rather than a wrong net.

Limits: the picker shows the first four DEMs in the list, as tiles in a sheet
that does not scroll. The app is built for DEMs up to about two million pixels;
a much larger one will make dragging the sun feel slow.

## Rename the app

Change `VITE_APP_NAME` in `.env`. The title bar, the browser tab and the
installed app's name all come from it.

## Links, sharing and the saved view

The address always holds the view, for example
`#dem=gore&px=150,210&sun=120,35&density=1`: the DEM's `id`, the selected
pixel's column and row, the sun's azimuth and height, and `density=1` when the
density layer is on. Opening such a link opens that view. The pixel is left
out when nothing is selected, the sun when it is at its default, and the layer
when it is off. At the default view (the first DEM, nothing selected, the sun
in the northwest) nothing is written and the address is bare.

The same string is saved on the device under `pixel-net:view`, so the app
reopens where it was left. A link that names a view wins over the saved view.
A bare address names none, so it opens the saved view if there is one.

A shared link always names its DEM, and leaves out any query, so it opens the
view it was shared from.

The share button sends a picture of the view with its link. Where the share
sheet takes no files, the link goes alone; where there is no share sheet, the
link is copied.

A link pasted into a message shows a preview card. Its tags are in
`index.html` and need the site's whole address, which is `VITE_SITE_URL` in
`.env`.

## The density layer

The button in the net's top-right corner turns on a see-through blue layer
that shows where the cloud is densest. The cloud itself darkens where points
overlap, but it saturates quickly, so its dense part looks uniform.

It is the classic Schmidt count. For each position on the net, the app takes
the share of plottable pixels inside a circle covering 1% of the net, and
divides by 1%. The unit is times an even spread: at 1× a place holds as many
points as it would if the cloud were spread evenly over the whole net. The
net is equal-area, so one circle covers the same share of directions
everywhere on it.

The first level is 2× when levels rise by 1 or 2, and otherwise the step itself; bands are drawn from there up, with a line at each level. The Gore Range peaks
at about 6.5× on its southwest slopes, so its lines are at 2×, 3×, 4×, 5× and
6×. A gentler landscape crowds toward the center and peaks far higher; its
levels rise by 2, 5, 10 or 20, whichever is the smallest step that gives six
levels or fewer. The key in the net's bottom-left corner names the first
level and the last. The count runs once per DEM, on the main thread, when the
layer is first shown: instant for the Gore Range, and it may take a moment for
a DEM near the two-million-pixel limit.

Near the rim part of the circle lies outside the net, and the density there
reads low. It is not corrected: only ground steeper than about 80° plots
there.

The code is `src/terrain/density.ts`.

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

## Deploy

Every push to `main` builds and deploys to GitHub Pages at
https://lpeezydos-arch.github.io/Pixel-Net/ through
`.github/workflows/deploy.yml`. The unit tests run first; a failing test stops
the deploy.

To host it anywhere else, `npm run build` and put `dist/` on any static host
that serves HTTPS. Offline install only works over HTTPS. For a host that
serves from a sub-path, set `BASE_PATH` to that path:

```bash
BASE_PATH=/Pixel-Net/ npm run build
```

For another host, also change `VITE_SITE_URL` in `.env` to the new address,
ending in a slash, so the link-preview tags point at it.

## AI use

This app was produced with AI. The code, tests and documentation were written
with Claude Code, Anthropic's coding assistant, under the author's direction.

## Design system

Styles follow the `lauren-frontend-design` skill. `src/styles/tokens.css` is
that skill's `assets/tokens.css` with only the accent changed to rust
(`--accent: #b84a00`, `--accent-strong: #8f3900`). Four deliberate departures:
there is no agency identity chrome, because this is not an official app; the
phone status bar is white so that rust stays reserved for the selection (and
for unseen news: the dot on the help button and beside an unseen entry); the
focus ring is the accent at 80% (set in `src/app.css`), because at the
design system's 60% a rust ring is under 3:1; and the one info dot is not a
Tab stop, because it is help for the net rather than a control, so its text
is also the net's accessible description and the keyboard reaches the terrain
and the sun first.
