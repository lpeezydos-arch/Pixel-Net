# Analytics

The deployed build loads Google Analytics 4 to answer three questions: who
uses the app, when, and how far into it they get. This file says what is
sent, how it is wired, and where to read each answer on the Analytics site.

## What is sent

Analytics collects the usual things on its own: page views, sessions,
country and city, device, browser, new versus returning, and engagement
time. On top of that, `src/analytics/` sends:

| What | When | Fields |
|---|---|---|
| user properties `display_mode`, `pointer` | at load | `standalone` or `browser`; `coarse` or `fine` |
| `app_open` | the first DEM is on screen | `source`: `link`, `saved` or `default` |
| `select_pixel`, `drag_sun`, `density_on`, `open_help` | the first time each happens in a visit | |
| `switch_dem` | the user picks another DEM | `dem`: the one picked |
| `share` | the share button has finished | `outcome`: `shared`, `copied`, `cancelled` or `failed` |
| `session_counts` | the page is hidden or closed | `selections`, `sun_drags`: how many since the last time |

Every event also carries `dem`, the DEM on screen.

Some things to know when reading them:

- A view restored from a link or from the device counts nothing: `switch_dem`
  and `density_on` fire only from the title bar and the net's button.
- `select_pixel` counts a tap, the end of a drag, or an arrow key landing on
  a pixel. `drag_sun` fires for a drag or an arrow key, but `sun_drags`
  counts drags only.
- The counts go out when the page is hidden, which on a phone is when the
  user switches apps, and start over when it comes back. One visit can send
  more than one `session_counts`; add them up.
- Hits are only sent while online. An installed app used with no signal is
  invisible, and `gtag` does not queue for later.
- Analytics shows aggregates, never a person. "Who" means country, city,
  device and the two user properties, not names.

## How it is wired

- `src/analytics/tracker.ts` is the core: first-time events, every-time
  events, the `dem` field on every event, and the counters with their flush.
  It is unit tested with a fake send.
- `src/analytics/index.ts` loads the tag and sets the user properties. It
  does nothing without a measurement ID, and nothing on a device that has
  the opt-out key in storage.
- `src/analytics/arrival.ts` decides `source` the same way the app decides
  its starting view.
- The measurement ID is `VITE_GA_ID`, set only in
  `.github/workflows/deploy.yml`. A dev server, a local build and the
  browser tests load no tag; `e2e/analytics.spec.ts` checks that a test
  build asks nothing of Google. To try it locally:

  ```bash
  VITE_GA_ID=G-XXXXXXXXXX npm run build && npm run preview
  ```

### Keep your own devices out

In the browser console on the live site, once per device:

```js
localStorage.setItem('pixel-net:no-analytics', '1')
```

The tag does not load on that device from the next open until the key is
removed. With a handful of users, your own visits would otherwise be most
of the numbers.

### Add a field

A new event parameter or user property is invisible in reports until it is
registered: Admin (the gear, bottom left) > Data display > Custom
definitions > Create custom dimension or Create custom metric. Type the
parameter name by hand, exactly as the code sends it. Nothing from before
the registration is backfilled, so register the same day it deploys. A
property allows 50 event-scoped dimensions, 25 user-scoped and 50 metrics.

The seven fields above were registered on 2026-10-16: `dem`, `source` and
`outcome` as event-scoped dimensions (DEM, Arrival source, Share outcome);
`display_mode` and `pointer` as user-scoped dimensions (Display mode,
Pointer); `selections` and `sun_drags` as metrics (Selections, Sun drags).

## Reading it on the Analytics site

Open analytics.google.com and pick the Pixel Net property. Everything below
is in the left rail: Reports for the ready-made views, Explore for your
own. Report names can differ a little between properties, because the
collection is editable, but the search box at the top of Reports finds
any of them by name.

Custom fields show up in Reports and Explore a day or two after they are
registered. Realtime shows raw events within a minute.

### Is it working right now

Reports > Realtime. Open the live site on a phone, touch the terrain, drag
the sun, and `app_open`, `select_pixel` and `drag_sun` appear in the event
card. Click an event to see its parameters.

### Who

- **Where they are.** Reports > User > User attributes > Demographic
  details. Switch the table's first column between Country and City.
- **What they are on.** Reports > User > Tech > Tech details. Device
  category (mobile, desktop, tablet), browser and operating system.
- **Installed or in a browser tab.** Explore > Free form. Drag Display mode
  (under Custom, User) into Rows, and Active users into Values. Pointer
  works the same way and splits touch from mouse.
- **New or returning.** Reports > Retention. The overview shows new versus
  returning users over the period; the cohort table shows whether anyone
  came back in the weeks after their first visit.
- **How they arrived.** Explore > Free form with Event name in Rows filtered
  to `app_open`, Arrival source in Columns, and Event count in Values. A
  `link` opened a shared link; `saved` reopened the app on the device;
  `default` is a first visit or a cleared browser.

### When

- **Over days and weeks.** Reports > Engagement > Overview, or Reports >
  Acquisition > Overview. The chart at the top shows users per day; the
  date picker at the top right sets the range and can compare two ranges.
- **Time of day and day of week.** Explore > Free form. Put Hour (under
  Time) in Rows and Active users in Values; Day of week is in the same
  group. Hours are in the property's time zone, set under Admin > Property
  details, so set that to yours.
- **At this moment.** Reports > Realtime shows the last 30 minutes.

### How engaged

- **How long.** Reports > Engagement > Overview. Average engagement time
  per active user is the time the page was in the foreground, which for a
  one-screen app is the time spent using it. Engaged sessions are those
  over ten seconds, with an event, or with a second page view.
- **What they touched.** Reports > Engagement > Events. One row per event
  name with its count and how many users sent it. Because `select_pixel`,
  `drag_sun`, `density_on` and `open_help` fire once per visit, their user
  counts next to `app_open` say what share of visits reached each thing.
- **How much they touched.** Explore > Free form with Event name in Rows
  filtered to `session_counts`, and Selections and Sun drags (under Custom)
  in Values. Add Active users to get the average per person, or DEM in
  Columns to compare the two DEMs.
- **How far they get, in order.** Explore > Funnel exploration. Steps:
  `app_open`, `select_pixel`, `drag_sun`, `share`. The chart shows the
  share of users who reached each step and where they stopped. Make it an
  open funnel so a step out of order still counts.
- **Sharing.** Explore > Free form with Event name filtered to `share` and
  Share outcome in Rows. `shared` went through a share sheet, `copied` is a
  desktop with no sheet, `cancelled` closed the sheet, `failed` could not
  even copy.
- **Which DEM.** Add DEM as a column to any of the above. `switch_dem` in
  the Events report says how often people change DEM at all.

### A saved exploration

Explore keeps what you build. One free-form table with Event name in Rows,
DEM in Columns, and Event count, Active users, Selections and Sun drags in
Values answers most of the questions above at a glance. Build it once, name
it, and it stays in the Explore list.
