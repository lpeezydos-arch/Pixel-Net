# Polish pass

The twenty-item checklist from the `lauren-frontend-design` skill, with how
each item is met. "Test" names a test that fails if the item regresses.

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Tooltips on every non-obvious control and metric | Met | Tests: "explains the net and its three values from one info button, below the button", "explains the sun from its tooltip", "the info dot is help for the net, not a tab stop". The sun also states its own position at rest ("the sun states its position at rest, and keeps stating it after a drag") and, on a touch screen, says what it does when tapped ("a tap on the sun at its default says how to move it") and stirs once at first open ("the sun stirs once at first open on a touch screen, and never on a desktop"). The density button is named by its tooltip ("the button is named by its tooltip"), and the net's own tooltip says what the layer shows while it is on ("the net's explanation says what the layer shows while it is on"). |
| 2 | Skeletons for anything over 300ms; chart frame first | Met | Tests: "nothing moves when the DEM arrives", "the loading shimmer shows the net frame through it" |
| 3 | No snap-in; nothing reflows on load | Met | Test: "nothing moves when the DEM arrives". Terrain and cloud fade in. |
| 4 | Copy-link button for linkable state | Met | The view is linkable: the address holds it. The share button shares the link where there is a share sheet and copies it where there is none. Tests: "the address follows the view, and is bare again at the default view", "a link opens its pixel and its sun", "with no share sheet, a press copies the link and says so" |
| 5 | Legends | Met | The density layer has a one-line key on the net that names its first and last levels (shortened to `2×–6×` on a net under 240px), and its method is in the net's tooltip. A color bar was decided against (`docs/superpowers/specs/2026-10-03-density-layer-design.md`). Tests: "the density button turns the layer on and off", "the button and the key sit in the net's corners, clear of the rim". |
| 6 | Map controls never overlap | Not applicable | No map controls |
| 7 | 44px hit targets; selection visible | Met | Test: "touch targets are at least 44px", which covers the share button too. The selected point has a 3px halo. A finger can let go of it: "a double-tap on the terrain clears the selection, and the caption says so once". The density button is 28px with a 44px target, covered by the same test, and shows that it is pressed. |
| 8 | Popups never clipped | Not applicable | The loupe is kept inside the terrain: test "is never clipped by the top of the box". The help sheet is a dialog on the bottom edge or centered, and tests check that all of it is on the screen at several sizes (`e2e/help.spec.ts`). The help tooltip is placed by Radix with collision padding. |
| 9 | Mobile: safe areas respected | Pending phone check | `env(safe-area-inset-*)` on the title bar, the stage and the help sheet (padding on all three sides it can touch). Check on a phone with a notch, upright and sideways. The footer and datepicker parts do not apply. |
| 10 | Touch targets 44px; inputs 16px | Met | Test: "touch targets are at least 44px". No text inputs. |
| 11 | Spacing on the scale; nothing accidentally full-width | Met | Tests: "fits a … without scrolling or overlap" at seven sizes; `src/layout.test.ts` for the readout moving under the net on a tall phone, the shared column on an upright tablet with both cards the same width, the cards growing to 760px on a monitor, and nineteen sizes that must fit; "the readout columns hold still while the values change"; "the resting label stays inside the net and clear of the ring labels" |
| 12 | Empty, error and loading states | Met | Tests: "shows dashes until a pixel is chosen", "shows an error card…", "nothing moves when the DEM arrives", "a flat pixel plots at the center of the net as a hollow point", "Escape clears the selection and says so" |
| 13 | One monochrome icon family; no emoji | Met | lucide-react `Sun`, `Info`, `Layers`, `Share`, `Check`, `CircleQuestionMark` and `X` only |
| 14 | Favicon, title, theme-color | Met | Test: "can be installed: manifest, icons and a white status bar" |
| 15 | Focus rings; full keyboard path | Met | Tests: "every control can be reached by keyboard, in reading order, and shows a focus ring" (the terrain comes first when the cards sit side by side), "key presses raise the label for a moment and announce where the sun ended up", "tells a keyboard user how to choose a pixel while the terrain has focus", "Escape clears the selection and says so", "pressing the same pixel again is announced again" |
| 16 | Contrast 4.5:1 text, 3:1 controls | Met | The focus ring is the accent at 80%, overridden in `src/app.css`, because the design system's 60% ring only reaches 3:1 with a dark accent. Test: `src/styles/contrast.test.ts` tests it, along with the text and control colors; the sun's resting label and the DEM's name are `--ink-500` on `--paper`, which it covers. |
| 17 | Reduced motion honored, springs included | Met | Test: "with reduced motion the point jumps and nothing animates"; "the sheet moves into place, and with reduced motion it does not move" |
| 18 | VID chrome intact | Not applicable | Not an official USGS app |
| 19 | Buttons are pills with verb labels | Met | The one text button reads "Try again" (the picker's segments are tabs); the share button is an icon in a pill, named "Share this view"; the help button is an icon in a pill, named "Help and what's new" |
| 20 | Accent only on the primary action and selection | Met | Accent appears on the selection ring, the net point, the loupe outline, the focus ring, the retry button, and the two news dots (on the help button and beside an unseen entry). The news dots are a recorded exception, decided in `docs/superpowers/specs/2026-10-03-help-and-news-design.md`. The density layer, its key and its pressed button are `--viz-1`, a data color, so that rust stays the selection's alone. |

## Checked by hand on a phone

- [ ] Dragging on the terrain feels immediate; the net point keeps up. If it
      trails, raise `stiffness` and `damping` in `src/components/motion.ts`.
- [ ] The loupe is not hidden by the finger, and moves aside near the top edge.
- [ ] Dragging the sun re-lights the terrain smoothly.
- [ ] "Add to Home Screen" gives the icon and opens full-screen.
- [ ] With airplane mode on, the installed app opens and works.
- [ ] On a phone with a notch, nothing sits under the notch or home indicator.
- [ ] Safari and Firefox are not covered by the automated tests (only Chromium
      runs here). Check on an iPhone in Safari.
- [ ] The cloud shows the same dense southwest and northeast clusters as
      `data/GORE/GORE_stereonet.png`.
- [ ] The share button opens the share sheet with the picture and the link.
- [ ] The installed app reopens on the pixel and the sun it was left on.
- [ ] A link sent to another phone opens the same view there.
- [ ] Share, close the share sheet, and share again: the button still works.
- [ ] After a tap, the share button's ground does not stay shaded.
- [ ] The help sheet's bottom edge clears the home indicator, and its close
      button is easy to reach with a thumb.
- [ ] Sideways on a phone with a notch, the help card is clear of the notch.
- [ ] After closing the help sheet with a tap, no tooltip stays over the title bar.
- [ ] With the density layer on, the three peaks of the Gore Range (a ridge in
      the southwest, a peak in the northeast, a smaller one in the northwest)
      can be told apart at arm's length.
- [ ] With the layer on, the rust point is as easy to follow during a drag as
      with it off.
- [ ] The density button is easy to press with a thumb, beside the readout,
      and a press never moves the sun.
- [ ] The key is readable and does not touch the rim.
