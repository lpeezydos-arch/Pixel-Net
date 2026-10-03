# Polish pass

The twenty-item checklist from the `lauren-frontend-design` skill, with how
each item is met. "Test" names a test that fails if the item regresses.

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Tooltips on every non-obvious control and metric | Met | Tests: "explains the net and its three values from one info button, below the button", "explains the sun from its tooltip", "the info dot is help for the net, not a tab stop". The sun also states its own position at rest ("the sun states its position at rest, and keeps stating it after a drag") and, on a touch screen, says what it does when tapped ("a tap on the sun at its default says how to move it") and stirs once at first open ("the sun stirs once at first open on a touch screen, and never on a desktop"). |
| 2 | Skeletons for anything over 300ms; chart frame first | Met | Tests: "nothing moves when the DEM arrives", "the loading shimmer shows the net frame through it" |
| 3 | No snap-in; nothing reflows on load | Met | Test: "nothing moves when the DEM arrives". Terrain and cloud fade in. |
| 4 | Copy-link button for linkable state | Not applicable | The app has no linkable state |
| 5 | Legends | Not applicable | No legend |
| 6 | Map controls never overlap | Not applicable | No map controls |
| 7 | 44px hit targets; selection visible | Met | Test: "touch targets are at least 44px". The selected point has a 3px halo. |
| 8 | Popups never clipped | Not applicable | No popups. The loupe is kept inside the terrain: test "is never clipped by the top of the box". |
| 9 | Mobile: safe areas respected | Pending phone check | `env(safe-area-inset-*)` on the title bar and stage. Check on a phone with a notch. The footer, sheet and datepicker parts do not apply. |
| 10 | Touch targets 44px; inputs 16px | Met | Test: "touch targets are at least 44px". No text inputs. |
| 11 | Spacing on the scale; nothing accidentally full-width | Met | Tests: "fits a … without scrolling or overlap" at seven sizes; `src/layout.test.ts` for the readout moving under the net on a tall phone, the shared column on an upright tablet, and sixteen sizes that must fit |
| 12 | Empty, error and loading states | Met | Tests: "shows dashes until a pixel is chosen", "shows an error card…", "nothing moves when the DEM arrives", "a flat pixel plots at the center of the net as a hollow point", "Escape clears the selection and says so" |
| 13 | One monochrome icon family; no emoji | Met | lucide-react `Sun` and `Info` only |
| 14 | Favicon, title, theme-color | Met | Test: "can be installed: manifest, icons and a white status bar" |
| 15 | Focus rings; full keyboard path | Met | Tests: "every control can be reached by keyboard, in reading order, and shows a focus ring" (the terrain comes first when the cards sit side by side), "key presses raise the label for a moment and announce where the sun ended up", "tells a keyboard user how to choose a pixel while the terrain has focus", "Escape clears the selection and says so", "pressing the same pixel again is announced again" |
| 16 | Contrast 4.5:1 text, 3:1 controls | Met | The focus ring is the accent at 80%, overridden in `src/app.css`, because the design system's 60% ring only reaches 3:1 with a dark accent. Test: `src/styles/contrast.test.ts` tests it, along with the text and control colors; the sun's resting label and the DEM's name are `--ink-500` on `--paper`, which it covers. |
| 17 | Reduced motion honored, springs included | Met | Test: "with reduced motion the point jumps and nothing animates" |
| 18 | VID chrome intact | Not applicable | Not an official USGS app |
| 19 | Buttons are pills with verb labels | Met | The one button reads "Try again" |
| 20 | Accent only on the primary action and selection | Met | Accent appears on the selection ring, the net point, the loupe outline, the focus ring and the retry button |

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
