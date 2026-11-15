# Module 4.3 — Dashboard UI: Walkthrough

## What was built
`/dashboard`: a range switch, four KPI tiles, and five charts (new patients over time, patient status, patients per doctor, patients by condition, doctors by specialization). Everything comes from one API call, the layout fills a laptop screen exactly, and the charts are hand-built.

## Choosing each chart (form before colour)
| Data | Its job | Form |
|---|---|---|
| New patients per day / week / month | change over time, one series | area chart (2px line, 10% wash) |
| Patient status | one whole split into 3 parts, read at a glance | tall segmented bar + legend (not a donut: blocks on one line compare better) |
| Patients per doctor, conditions, specializations | compare parts, ranked | horizontal bars, one hue, largest first, value at the tip |
| Totals and the period's new patients | a headline number | stat tiles, no chart |

## Colour, computed rather than eyeballed
The palette was run through the dataviz validator, which checks the lightness band, a chroma floor, colour-blind separation of neighbours, normal-vision separation and 3:1 contrast on the card.
- The light accent passed. The lighter dark-mode indigo (#818cf8) **failed** the dark lightness band, so dark mode uses #6366f1.
- The status fills pass with a colour-blindness warning (7.9). That's allowed only with a second cue, and here every block has its share printed on it (where it fits), a legend line with its name, and a 2px gap from its neighbour.

## Charts without a library
- **Stretchy SVG, crisp lines:** the area path is drawn in a 100×100 viewBox with `preserveAspectRatio="none"`, so it fills any box, even on the server. `vector-effect="non-scaling-stroke"` keeps the line exactly 2px. Anything that must not stretch (labels, gridlines, the hover dot, the tooltip) is HTML positioned in percent on top.
- **Crosshair:** pointer x → nearest bucket index → a vertical hairline, a dot (2px surface ring) and a tooltip that flips to the left past 60% of the width. The same index moves with ← → Home End when the chart has focus.
- **Accessible twin:** a visually hidden `<table>` lists every bucket. Wrap it: `sr-only` on the table itself doesn't work, because a table ignores `height: 1px` and its full length stretched the page.
- **Numbers that count:** `motion`'s `animate(from, to, { onUpdate })` writes straight to the text node (no re-render per frame), only when the value changes, and not at all for reduced-motion users. The first render is already the final number.

## Filling the screen exactly
A flex column from `<main>` down: range row, KPI row, then a grid with `lg:flex-1 lg:min-h-0` and rows `minmax(0,4fr) minmax(0,6fr)`. Each card is a flex column whose body takes what's left, and the ranked lists give each row `flex: 1` with an 18px floor. The checks measure it: neither the window nor `<main>` scrolls at 1280×720, 1366×768 or 1920×1080.

## Checkpoint summary
- 18/18 browser checks, all regressions green, typecheck / lint / build clean.
- **Milestone 4 complete.** Next: **milestone 5, deploy + README**.
