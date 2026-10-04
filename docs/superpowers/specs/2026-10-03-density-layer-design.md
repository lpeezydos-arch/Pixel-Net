# Density layer — design

Date: 2026-10-03
Status: written 2026-10-03, awaiting review.

This extends `2026-10-01-pixel-net-design.md`, called "the first spec" below,
and follows `2026-10-03-share-and-restore-design.md`, called "the share spec".
Section numbers here are this document's own.

## 1. Purpose

One button on the net turns a translucent layer on and off. The layer shows
where the cloud is densest: the combinations of slope and aspect the landscape
prefers.

It is for the geoscientist the app already serves. The cloud darkens where
points overlap, but it saturates quickly, so the dense part of the net looks
uniform. On the Gore Range the cloud shows one dark arc; the layer shows that
the arc is a long ridge in the southwest and two separate peaks in the north.

Success means:

- With the layer on, the peaks of the Gore Range net can be told apart at a
  glance, on a phone.
- The dots still show through the layer, and are unchanged where there is no
  layer.
- The selected point is as easy to follow with the layer on as with it off.
- What a line means can be found on the screen, in words, without a legend.
- With the layer off, the screen is as it was, apart from one button.

### What was asked for and what was decided

Asked for, on 2026-10-03, in one sentence: a toggle that turns a translucent
"density" heatmap of the scattered markers on or off.

Decided in conversation the same day:

- This reverses a decision. The first spec and `PRODUCT.md` list a density net
  as out of scope, not to be reintroduced without a new decision. This is that
  decision. The aspect rose and patch selection stay out of scope.
- The layer is for seeing where the peaks are and what shape they have. It is
  not for reading a value at a point or for measuring one DEM against another.
- The quantity is the classic Schmidt count, in times an even spread
  (section 3). Kamb contouring was considered and set aside: its counting
  circle shrinks as the number of points grows, and at a DEM's point count the
  result is ragged and nearly everything is significant.
- The layer is stepped bands with a line at each level, not a smooth blur.
- The layer is drawn over the dots and is see-through, as "translucent" asks.
  Fading the dots under an opaque layer was tried in mockups and set aside.
- The color is blue, `--viz-1`. Ink made the layer look like part of the
  cloud. Rust is the color of the selected point and stays its alone.
- The button sits in the net's top-right corner.
- Whether the layer is on is part of the view: saved on the device, written in
  the link, and drawn in the shared picture.
- There is no legend. A one-line key on the net names the outer and innermost
  levels.

Assumed: the request is the one sentence above, and the choices here were the
owner's to make.

## 2. Scope

In scope:

- The count, and the levels drawn from it.
- The layer on the net, the button that toggles it, and the key.
- One more sentence in the net's tooltip while the layer is on.
- The layer's state in the view: the address, the saved view and shared links.
- The layer and one caption line in the shared picture.
- Updates to `PRODUCT.md`, the README and `docs/polish-pass.md`.

Out of scope:

- A legend with a color bar or ticks.
- The density at the selected pixel, in the readout or anywhere else.
- A choice of counting circle, of levels or of color.
- Kamb contouring, or any measure of significance.
- A density layer on the terrain.
- The aspect rose, and patch or area selection.
- A change to the link-preview image or to the shared text.

## 3. The count

### The quantity

For a position on the net, the density is the share of the DEM's plottable
pixels whose points fall within a circle around that position, divided by the
share of the net the circle covers. The circle covers 1% of the net's area, so
its radius is one tenth of the rim's.

The unit is "times an even spread". At 1× a place holds as many points as it
would if the cloud were spread evenly over the whole net. The largest possible
value is 100×, when every point falls in one circle.

Plottable pixels are the ones the cloud plots: flat pixels and no-data pixels
are left out of both the count and the total.

The net is equal-area, which is what makes this count meaningful: a circle of
one size covers the same share of directions anywhere on the net.

### The grid

The density is computed on a grid of 200 × 200 cells over the square that
bounds the rim. Each point is counted into
its cell, and a cell's density is the sum over the cells whose centers lie
within the circle, divided by the pixel total and by the share of the net those
cells cover.

It is computed once per DEM, the first time the layer is shown for that DEM,
and kept while the DEM is loaded.

### Known limit

Near the rim, part of the circle lies outside the net, and the density there
reads low. It is not corrected. Ground plots there only when it is steeper
than about 80°.

### The levels

The levels are whole multiples of a step. The first level is the step itself,
except that when the step is 1× the first level is 2×, because 1× is only an
even spread.

The step is the smallest of 1, 2, 5, 10 and 20 for which no more than six
levels are at or below the DEM's peak density.

| Peak density | Step | Levels |
|---|---|---|
| below 2× | 1 | none |
| 2× to below 8× | 1 | 2×, 3×, … |
| 8× to below 14× | 2 | 2×, 4×, … |
| 14× to below 35× | 5 | 5×, 10×, … |
| 35× to below 70× | 10 | 10×, 20×, … |
| 70× to 100× | 20 | 20×, 40×, … |

The Gore Range peaks at about 6.5×, near slope 35° and aspect 236°. Its levels
are 2×, 3×, 4×, 5× and 6×.

## 4. The layer

A band is the part of the net at or above one level and below the next. Bands
are filled in `--viz-1`. The outermost band is filled at about 8% opacity and
each band inward at about 7% more, so the sixth is at about 43%. A line about
1px wide on screen, at about 85% opacity, runs where one band meets the next
and where the outermost band meets the rest of the net.

Between grid cells the density is read by bilinear interpolation, so the lines
are smooth at any size.

The layer is drawn over the cloud. The dots show through it, and outside the
outermost line there is no layer and the dots are untouched. The compass
letters, the ring labels, the sun and the selected point are above the layer.

The layer fades in and out over `--t-base`. With reduced motion it appears and
disappears at once. When the DEM changes with the layer on, the layer changes
with the cloud, by the same crossfade.

A DEM whose peak is below 2×, or which has no plottable pixels, has an empty
layer.

## 5. The button and the key

### The button

An icon button in the top-right corner of the square that holds the net,
mirroring the `i` button in the top-left. Its icon is lucide's `Layers`.

- It is a toggle button named "Density". `aria-pressed` says whether the layer
  is on.
- When the layer is on the button looks pressed: a filled ground under the
  icon.
- It is a control, not help. It is in the Tab order, beside the sun, and Enter
  and Space press it.
- Its touch target is at least 44px and its focus ring is the app's.
- It shows whenever a net is drawn. It is absent while the first DEM loads and
  on the error card.

### The key

While the layer is on, one line of text sits in the bottom-left corner of the
square that holds the net, in `--viz-1` at `--fs-xs`:

- `2× to 6× even` when there are levels: the first level and the last.
- `2× even` when there is one level.
- `Below 2× even` when the peak is below 2×.
- Nothing when the DEM has no plottable pixels.

The corner is outside the rim, so no dots lie under the key. On the smallest
phone layout there is room for about 110px of text beside the rim.

The key fades with the layer.

### The tooltip

While the layer is on, the net's tooltip and its hidden description gain one
sentence, after the existing text, with the DEM's own levels in it. For the
Gore Range:

> Blue shading shows where pixels crowd together, counted in circles covering
> 1% of the net. The outer line is 2 times an even spread, and each line inward
> adds 1 more.

With one level the second sentence is "The line is 2 times an even spread."
With an empty layer there is no second sentence.

## 6. The view

The view gains one part: whether the layer is on. It is off by default.

- In the address, the saved view and a shared link, a layer that is on is
  written `density=1`, after the sun: `#dem=gore&px=150,210&sun=120,35&density=1`.
- A layer that is off is left out. A view with the first DEM, no pixel, the
  default sun and the layer off is still the empty string.
- Reading is lenient, as it is for the other parts: any value but `1`, or no
  `density` at all, reads as off. A link made before this change opens as it
  did.
- A string that has `density` names a view, as one with `dem`, `px` or `sun`
  does.
- Turning the layer on or off writes the view after the same 400 ms as any
  other change.
- A link pasted into the open tab sets the layer to what the link says. A link
  with no `density` turns it off.
- The layer's state is kept across a DEM switch, as the sun is.

## 7. The shared picture

When the layer is on, the picture draws it over the cloud and under the
letters, the sun and the point, with the same fills and lines as the screen.

The caption gains one line, in `ink-500`, after the sun's line:

- `Density: lines from 2× to 6× an even spread`
- `Density: a line at 2× an even spread`, with one level.
- No line when the layer is empty or off.

The picture's layout already takes its height from the caption's lines.

## 8. How it is built

### `src/terrain/density.ts`, new

Pure functions, with no DOM:

- The field: from a `Surface`, the grid of densities and the peak.
- The levels: from a peak, the list of levels by the rule in section 3.
- The image: from a field, its levels and a size, the opacity of each cell of
  a `size` × `size` image, fills and lines together. The screen and the picture
  both draw from this, as both draw the cloud from `cloudAlpha`.
- The words: from the levels, the key's text, the caption's line and the
  tooltip's sentence, so the three cannot disagree.

### Components

- `DensityCanvas`, new: a canvas over the cloud. It draws when the layer is on
  and the DEM or the size changes, in the color it reads from `--viz-1`.
  `NetCanvas` does not change.
- `DensityToggle`, new: the button.
- `NetCard` places the canvas, the button and the key, and passes the extra
  sentence to the tooltip.
- `App` holds whether the layer is on, starting from the view it opens on.

### The view

- `View` in `src/state/view.ts` gains `density: boolean`. `encodeView`,
  `decodeView` and `namesView` change as section 6 says.
- `useViewPersistence` takes the layer's state and a way to set it, writes on
  a change, and applies it from a pasted link.

### The picture

- `drawCard` takes whether the layer is on and draws it. `CardPalette` gains
  the layer's color.
- `captionLines` in `src/share/text.ts` takes the caption's line.

### Errors

The count cannot fail on a `Surface` the app has accepted. If the canvas gives
no 2D context the layer is not drawn and the button still toggles, as the
cloud does today. In the picture, a failure is caught where every other
failure of the picture is, and the link is shared alone.

## 9. Tests

Unit, `src/terrain/density.test.ts`:

- Points spread evenly over the net read about 1× away from the rim.
- Every point at one position reads 100× there.
- The levels follow the table in section 3 at each boundary, and never number
  more than six.
- The Gore Range peaks at about 6.5× near slope 35°, aspect 236°, and its
  levels are 2× to 6×.
- The image has no opacity outside the outermost level, and its fills rise
  inward.
- The key, the caption line and the tooltip sentence for no levels, one level
  and several.

Unit, elsewhere:

- `view.test.ts`: `density=1` round-trips; off is left out; the default view
  is still empty; a link without `density` reads as off; other values read as
  off; a string with only `density` names a view.
- `text.test.ts`: the caption has the line when the layer is on and not when
  it is off.
- `contrast.test.ts`: the key's text is at 4.5:1 on paper, and the button
  meets 3:1 in both states.

End to end, at phone and desktop sizes:

- The button turns the layer on and off, and `aria-pressed` follows.
- The key shows `2× to 6× even` for the Gore Range while the layer is on.
- A reload restores the layer; the address has `density=1`.
- A link with `density=1` opens with the layer on.
- The layer is still on after a DEM switch.
- The button and the key lie inside the net's square and outside the rim.

By hand on a real phone, added to `docs/polish-pass.md`: that the peaks can be
told apart, that the point is easy to follow with the layer on, and that the
button is easy to press beside the readout.

## 10. Records and order of work

- `PRODUCT.md`: the density net leaves the out-of-scope list, with the date;
  the layer joins the confirmed functionality and the view; "the density
  layer", "times an even spread" and "the key" join the terminology.
  `GORE_stereonet_density.png` is described as a Kamb figure of the same data,
  not the reference for this layer.
- `README.md`: what the layer shows and how it is counted.
- This is built in its own worktree off `main`.
- The `help-and-news` branch is unmerged and holds the news list. The news
  line for this change, "A button on the net shows where pixels crowd
  together.", is added in whichever of the two branches merges second.
