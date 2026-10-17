# Analytics

The deployed build loads Google Analytics 4 to answer three questions: who
uses the app, when, and how far into it they get.

## What is sent

Analytics collects page views, sessions, country, device, new versus
returning and engagement time on its own. The app adds:

| Event | When | Fields |
|---|---|---|
| `app_open` | the first DEM is on screen | `source`: `link`, `saved` or `default` |
| `select_pixel`, `drag_sun`, `density_on`, `open_help` | first time each happens in a visit | |
| `switch_dem` | the user picks another DEM | `dem`: the one picked |
| `share` | the share button finishes | `outcome`: `shared`, `copied`, `cancelled` or `failed` |
| `session_counts` | the page is hidden or closed | `selections`, `sun_drags`: how many so far |

Every event carries `dem`, the DEM on screen. Two user properties are set at
load: `display_mode` (`standalone` or `browser`) and `pointer` (`coarse` or
`fine`).

Good to know:

- A view restored from a link or the device counts nothing.
- `sun_drags` counts drags only; arrow keys fire `drag_sun` but are not counted.
- One visit can send `session_counts` more than once. Add them up.
- Nothing is sent offline, and nothing is queued for later.
- Analytics shows groups, never a person.

## How it is wired

| Where | What |
|---|---|
| `src/analytics/tracker.ts` | The core: once-events, every-time events, counters. Unit tested. |
| `src/analytics/index.ts` | Loads the tag and sets the user properties. |
| `src/analytics/arrival.ts` | Decides `source`. |
| `.github/workflows/deploy.yml` | The only place `VITE_GA_ID` is set. |

Without the ID nothing loads, so a dev server, a local build and the browser
tests send nothing. To try it locally:

```bash
VITE_GA_ID=G-XXXXXXXXXX npm run build && npm run preview
```

**Keep your own devices out.** Once per device, in the browser console on the
live site:

```js
localStorage.setItem('pixel-net:no-analytics', '1')
```

**Add a field.** Admin (the gear) > Data display > Custom definitions. Type
the parameter name by hand, exactly as the code sends it, the same day it
deploys: nothing earlier is backfilled. The seven fields above were
registered on 2026-10-16.

## Reading it

Open analytics.google.com, pick the Pixel Net property. Reports are the
ready-made views; Explore is where you build your own. If a report name
below is missing, the search box at the top of Reports finds it. Custom
fields appear in reports a day or two after registration.

### Is it working?

**Reports > Realtime.** Open the live site, touch the terrain, and
`select_pixel` appears within a minute. Click an event to see its fields.

### Who

| Question | Where |
|---|---|
| Where are they? | Reports > User > Demographic details. Country or City. |
| Phone or desktop? | Reports > User > Tech details. Device category. |
| Installed, or in a tab? | Explore > Free form: Display mode in Rows, Active users in Values. |
| Do they come back? | Reports > Retention. |
| How did they arrive? | Explore > Free form: Arrival source in Rows, filter Event name = `app_open`. |

### When

| Question | Where |
|---|---|
| Over days and weeks | Reports > Engagement > Overview. The date picker compares two ranges. |
| Hour of day | Explore > Free form: Hour in Rows, Active users in Values. Day of week is next to it. |
| Right now | Reports > Realtime, last 30 minutes. |

Hours use the property's time zone: Admin > Property details.

### How engaged

| Question | Where |
|---|---|
| How long? | Reports > Engagement > Overview. Average engagement time is time with the page in front of them. |
| What did they touch? | Reports > Engagement > Events. Compare each event's users to `app_open`'s. |
| How much? | Explore > Free form: filter Event name = `session_counts`, Selections and Sun drags in Values. |
| How far, in order? | Explore > Funnel: `app_open` → `select_pixel` → `drag_sun` → `share`. Make it open. |
| Did sharing work? | Explore > Free form: Share outcome in Rows, filter Event name = `share`. |
| Which DEM? | Add DEM as a column to any of these. |

**One table for most of it.** Explore > Free form with Event name in Rows,
DEM in Columns, and Event count, Active users, Selections and Sun drags in
Values. Name it and it stays in the Explore list.
