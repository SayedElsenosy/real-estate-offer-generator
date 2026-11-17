# Cairo Plaza — SVG plan adoption and QA (2026-10-28)

## Approved use

The owner approved the new **full-area coloured, interactive floorplan** presentation in place of the earlier dot-only map. This release uses engineering-DXF-derived SVG **floor backgrounds** and clickable traced **unit polygons**. The live project inventory (Sheet1) remains the only authority for status, price, floor, and official sales area.

**Source upload:** `Cairo_Plaza_Unit_SVG.zip`, SHA-256
`34a3d325704e8b0f52f62ef7b15a6ee41fa7e24512995853b7a02bc22a3d276d`.

Source reports: `DATA/cairo_plaza_floorplans.json`, `REPORTS/all_units.csv`, `REPORTS/unresolved_units.csv`, and `REPORTS/validation_report.md`.

## Source integrity

| Floor | Total codes | Clickable polygons | Marker-only | Needs geometric-area review |
| --- | ---: | ---: | ---: | ---: |
| Basement (-1) | 18 | 18 | 0 | 0 |
| Ground (0) | 282 | 273 | 9 | 14 |
| First (1) | 259 | 247 | 12 | 5 |
| Second (2) | 67 | 67 | 0 | 3 |
| Third (3) | 35 | 33 | 2 | 1 |
| Fourth (4) | 37 | 37 | 0 | 0 |
| Fifth (5) | 37 | 37 | 0 | 0 |
| Sixth (6) | 37 | 37 | 0 | 0 |
| **TOTAL** | **772** | **749** | **23** | **23** |

- The 23 unresolved codes **do not have geometry** and are shown as separately clickable CAD-anchored markers. No polygon is invented.
- The 23 `REVIEW` polygons are shown but explicitly flagged in each clicked unit's details. The extraction report states they have atypical geometric-to-printed-area ratios. This is *not* a licence to quote the geometric area.
- The ZIP extraction validation was automated and only the sixth floor had visual QA. Visually inspected the ground-floor combined backdrop with source polygons and verified plausible alignment and unit spacing, but this is **not** a professional engineer's certification of all 749 polygons.
- In some units, printed gross areas are missing; the application shows only verified *live inventory Sheet1* area and price. Unit data absent from live inventory is marked **sold out/not in inventory**.
- All eight source floor backdrops are publicly served at `/cairo-cad/floor-N.svg` and the geometry data is stored as local read-only JSON in `src/data/cairo-svg-floor-N.json`.
- The prior imported PDF geometry remains rejected and is not used in the displayed map. Existing Neon floor-plan draft records were **not** silently promoted to `APPROVED`.

## Implementation and verification

The new interactive viewer is `src/components/CairoPlazaInteractiveMap.tsx`. Features: full-colour polygon status overlays, live price and area card on click, search by code, floor selection, filters, zoom, selected-unit gold highlight, and accessible markers for all 23 unresolved units. No offer or status snapshots are persisted.

Build-time check: `node scripts/check-cairo-unit-overlays.mjs` confirms 772 unique source codes, 749 nonempty SVG paths, 23 missing-path CAD label markers, 23 review flags and 8 engineering background files; TypeScript and Workers build tests run before deploy.

Cloudflare Build `6eb8e819-516e-413a-9e75-40332619a7cf` completed successfully with version `d5d4dd85-577f-4ce7-9828-c71106c13ebf`. Server smoke tests passed. Browser-level signed-in interaction and live Google Drive file availability depend on the account and are not simulated by anonymous tests.
