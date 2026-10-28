# Cairo Plaza — SVG draft boundary audit

All eight floor plan images have been imported into Neon. Draft tracing totals **81**:
- Basement (-1): **9** candidate unit polygons from 17 source-text labels.
- Second floor (2): **45** candidate unit polygons from 67 source-text labels.
- Sixth floor (6): **27** candidate unit polygons from 37 source-text labels.
- Ground, first, third, fourth, fifth: artwork only; **0** reviewed polygons.

**No floor is approved.** All 81 shapes represent traced, non-selectable, non-PDF draft candidates. Original drawing walls were used where available; text-label bounding rectangles were never accepted as unit outlines. Some bays with angled or ambiguous walls are intentionally left untraced. The 12 newest sixth-floor side offices are based on PDF horizontal wall y-coordinates 582.53, 646.63, 648.58, 687.43, 689.39, 728.24, 730.12, 768.98, 770.93, 809.78, 811.73, 872.67 with left/right external wall sections.

Rule: if drawn unit code is absent from fresh inventory, render Sold Out, never selectable. Historical red fill in an old PDF is not a substitute for live inventory status.

Candidate geometry source: `trace-drafts-81.json`. The app prohibits approval when identifiable labeled units or current live stock entries lack matching reviewed boundaries.
