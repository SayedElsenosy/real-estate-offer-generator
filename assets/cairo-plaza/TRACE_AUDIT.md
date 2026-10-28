# Cairo Plaza — architectural SVG geometry audit

Original sources: `cairo plaza floors printing copy(3).pdf` (8 pages), and `Price List.xlsx` Sheet1 read only.

## Current mapped source-based draft boundaries

| Floor | Draft SVG polygons | PDF labels recovered | Stock matches traced |
| --- | ---: | ---: | ---: |
| Basement (-1) | 4 | 17 | 4 |
| Ground (0) | 0 | 0 | 0 |
| First (1) | 0 | 0 | 0 |
| Second (2) | 45 | 67 | 8 |
| Third (3) | 0 | 0 | 0 |
| Fourth (4) | 0 | 0 | 0 |
| Fifth (5) | 0 | 0 | 0 |
| Sixth (6) | 2 | 37 | 2 |
| **Total** | **51** | **121** | **14** |

The 51 polygons were copied from trace measurements against actual PDF architectural partition lines, not text-label rectangles. Exactly 37 corresponding codes are currently absent from the 153-unit inventory snapshot and must render **SOLD OUT** according to the approved business rule.

The remaining 70 identifiable PDF text-label locations do not yet have a reviewed unit footprint. Pages with flattened vector-glyph labels (ground, first, third, fourth and fifth) require distinct layout/code reconciliation; they must not receive inferred codes or be approved automatically.

The full-size background artwork for all eight floors is in Neon `FloorPlan.backgroundData`. These polygons are in `FloorPlan.shapes` with `reviewStatus='DRAFT'`; no polygons are approved for customer offers or PDFs.

## Safety rules

- A source-PDF red ink region expresses the status at printing, not live sales inventory.
- The source stock sheet is read-only and must be re-read when issuing an offer.
- A drawing-only code absent from live stock is displayed Sold Out and cannot be selected.
- Draft paths are previewed with blue dashed strokes, but are not clickable. Approval requires all identifiable source labels and live stock units to have reviewed geometry.
- Irregular corner bays are NOT approximated to rectangles.

## Reproducible geometry

- `trace-drafts-31.json` — first reviewed source-wall candidates.
- `trace-drafts-43.json` — side F&B bays added.
- `trace-drafts-51.json` — straight-wing bays added.

These are intentionally labeled as DRAFT geometry and are only fit for human architectural boundary review. They are not accurate-enough to represent every unit in the project.
