# Cairo Plaza — Exact code, floor and architectural PDF trace audit

**Source files used:** `cairo plaza floors printing copy(3).pdf` (eight original floor drawings), `Price List.xlsx` / Sheet1 (private, read-only). Updated 2026-10-28.

## Current cumulative source-based draft geometry

| Floor | Draft SVG boundaries | Stock rows | Exact code+floor stock matches | Unmatched stock |
|---|---:|---:|---:|---:|
| Basement -1 | 17 | 11 | 4 | 7 |
| Ground 0 | 89 | 57 | 48 | 9 |
| First 1 | 65 | 38 | 27 | 11 |
| Second 2 | 67 | 8 | 8 | 0 |
| Third 3 | 25 | 9 | 9 | 0 |
| Fourth 4 | 22 | 10 | 10 | 0 |
| Fifth 5 | 25 | 18 | 18 | 0 |
| Sixth 6 | 37 | 2 | 2 | 0 |
| **Total** | **347** | **153** | **126** | **27** |

51 additional code+floor+gross-area-backed source-wall draft shapes were added after the 296 baseline:
- Fourth and fifth: 19 accurately identified office labels, each source gross-area matched the original inventory.
- Ground: 16 corner retail units, including distinct SR and SH units with identical numbers where applicable.
- First: 12 additional source-confirmed shops and retail units, preserving different types.
- Ground B wing: 4 source-confirmed shops, including a Reserved unit.

Source geometry: `assets/cairo-plaza/trace-drafts-347.json` (all floors); `trace-drafts-296.json` (prior baseline). Eight original artwork backgrounds remain in Neon `FloorPlan.backgroundData`. All 347 path proposals are `reviewStatus='DRAFT'`, **not certified geometric floor outlines**. The automated QA checked distinct full identifiers, valid geometry, PDF page bounds, and no polygon overlap greater than one PDF-page square unit per floor. A shape's PDF area is **not** the architectural GSA.

## Strict rules

- **SR and SH are separate unit types on every floor**, even with the same suffix and area. No automatic swapping, rewriting or aliasing.
- Live source-stock matches require the **complete unit code plus the same floor** (case-insensitive only). The original sheet has a cross-floor code ambiguity such as `C/GR/SH/16B`; preserve the authoritative floor field, do not merge.
- A drawing-only code absent in inventory is colored **Sold Out** and cannot be offered. This is an agreed UI designation, not an independently proven sale.
- Source drawing red fill is historical; real-time status is read from the original Google Sheet/Excel viewer access.
- No draft geometry is customer-selectable or included in generated PDF floor map sections. Do not remove the review approval gate.
- Never write to or alter the original source PDF or stock sheet.

## Remaining 27 stock rows

- Basement: **7** `A/BA/SH/*` rows for which source PDF shows distinct `A/BA/SR/*` polygons: they are **not matches**.
- Ground: **9** stock rows (B, D, F, H, I wings) still lack unambiguous source PDF walls/labels.
- First: **11** stock rows still lack full code+floor verified geometry. In particular stock has `A/FR/SR/22a` (67 sqm) and `A/FR/SR/22b` (65 sqm), but the source PDF renders a single unsplit `A/FR/SR/22` (131 sqm); do not assign two independent boundaries without the actual subdivision drawing. Another confusing stock row has `C/GR/SH/16B` on floor 1: do not silently relabel it.

The review package contains `qa/units_without_verified_outline.csv` with the **exact 27 unresolved stock records**, and `qa/draft_unit_paths.csv` with all candidate mapping and status snapshots.

**Next architectural milestone:** obtain an actual source drawing or independent verified plan showing the 27 precise missing units/splits and have a qualified reviewer approve the final footprint boundaries before publishing selectable SVG units.
