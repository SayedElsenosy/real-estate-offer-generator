# Cairo Plaza — Floorplan SVG coverage and verification

Last audited baseline: **89 DRAFT polygons**. Original PDF: `cairo plaza floors printing copy(3).pdf` (8 pages); readonly inventory: `Price List.xlsx` Sheet1.

| Floor | Proposed unit boundaries | Extracted text-label markers | Untraced extracted labels | State |
|---|---:|---:|---:|---|
| Basement (-1) | 9 | 17 | 8 | DRAFT |
| Ground (0) | 0 | 0 | N/A — vector glyphs | DRAFT |
| First (1) | 0 | 0 | N/A — vector glyphs | DRAFT |
| Second (2) | 51 | 67 | 16 | DRAFT |
| Third (3) | 0 | 0 | N/A — vector glyphs | DRAFT |
| Fourth (4) | 0 | 0 | N/A — vector glyphs | DRAFT |
| Fifth (5) | 0 | 0 | N/A — vector glyphs | DRAFT |
| Sixth (6) | 29 | 37 | 8 | DRAFT |
| **Total** | **89** | **121** | **32** | **NOT APPROVED** |

All eight original floor images are loaded in Neon. The latest eight irregular office polygons, traced with the original vector PDF and a calibrated 10-point coordinate grid, add six on floor 2 and two on floor 6 to the prior set of 81.

**Geometric QA**: 89/89 candidate polygons are valid, contain the extracted source label center, fit inside the PDF's viewBox (2267.72 × 1700.79), and have no overlap greater than 1 square PDF point with other candidates in the same floor.

**Inventory QA**: of 89 traced unit codes, 14 appear in the reference inventory snapshot and 75 do not. The latter are **SOLD OUT** by the adopted mapping rule and cannot be offered. A source drawing's historic red fill does not override live stock status. Recheck inventory on every quotation.

**Safety gate**: each floor remains DRAFT. Client clicking / final PDF maps must use only APPROVED geometric boundaries. Current untraced labels (32) and the five other floors with vector-only glyph codes prevent architectural completeness; do not claim all units are mapped or grant automatic approval.

Trace source: `assets/cairo-plaza/trace-drafts-89.json`; original earlier milestones `trace-drafts-51.json`, `-69.json`, `-81.json`. A ZIP review package with eight overlay images and row-by-row audit is also generated.

**Note**: the geometry is suitable for informed architectural review, but not a substitute for signed-off source CAD or detailed boundary signoff. No original file was edited.
