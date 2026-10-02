# Pixel Net

A one-screen web app that shows a hillshade of a DEM beside a Schmidt net of
every pixel in it. Press or drag on the terrain and that pixel's point is
highlighted on the net, with its slope, aspect and elevation. Drag the sun on
the net to change the lighting. It installs to a phone's home screen and works
with no signal after the first visit.

The design is in `docs/superpowers/specs/2026-10-01-pixel-net-design.md`.

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
     "file": "your.tif",
     "width": 288,
     "height": 294
   }
   ```

   `width` and `height` are the DEM's pixel dimensions. They are optional, but
   with them the screen does not shift when the DEM finishes loading.

A DEM that does not meet the requirements shows an error card in the app
rather than a wrong net.

Limits: the picker shows the first four DEMs in the list. The app is built for
DEMs up to about two million pixels; a much larger one will make dragging the
sun feel slow.

## Rename the app

Change `VITE_APP_NAME` in `.env`. The title bar, the browser tab and the
installed app's name all come from it.

## Deploy

`npm run build` and put `dist/` on any static host that serves HTTPS. Offline
install only works over HTTPS.

For a host that serves from a sub-path, such as GitHub Pages:

```bash
BASE_PATH=/pixel-net/ npm run build
```

## Design system

Styles follow the `lauren-frontend-design` skill. `src/styles/tokens.css` is
that skill's `assets/tokens.css` with only the accent changed to rust
(`--accent: #b84a00`, `--accent-strong: #8f3900`). Three deliberate departures:
there is no USGS VID chrome, because this is not an official USGS app, the
phone status bar is white so that rust stays reserved for the selection, and
the focus ring is the accent at 80% (set in `src/app.css`), because at the
design system's 60% a rust ring is under 3:1.
