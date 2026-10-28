# Cairo Plaza — strict SR / SH mapping audit

Date: 2026-10-28. Source: owner-controlled `Price List.xlsx`, **Sheet1** (read-only); original 8-page architectural PDF; mapped candidate geometry in `assets/cairo-plaza/trace-drafts-296.json`.

## Definitive code rule

A drawing unit and an inventory row match only when **the complete normalized unit code and floor match**. Normalization may ignore casing and Unicode compatibility only. **SR is not SH, on ANY floor.** They are distinct property types. Never rewrite `SR` to `SH` based on same unit number, adjacent walls, similar gross area or a previous guessed alias. No inventory sheet data is modified.

Drawing-only units with no exact live inventory match follow the adopted *Sold Out* display rule and cannot be selected for an offer. This is a display/business classification, **not a claim that a distinct SR unit was sold to someone**. An inventory row not mapped to a precise polygon remains selectable from the ordinary stock list if Available, but cannot use unapproved floor geometry.

## Verified raw inventory and draft geometry

- Original Sheet1: **153** inventory rows (not 153 approved floor polygons).
- Source-traced draft polygons: **296** across eight plans, all `DRAFT`.
- Strict code + floor match: **75** inventory rows have corresponding draft outlines.
- **78** inventory rows have no strict-match draft outline (not to be merged with another type).
- **14** of those 78 have an *opposite-type same-number* candidate polygon (SR vs SH). This is specifically **NOT** a verified match.

| Floor | Stock rows | Candidate polygons | Strict matching inventory rows | Unmapped inventory rows |
|---|---:|---:|---:|---:|
| Basement (-1) | 11 | 17 | 4 | 7 |
| Ground (0) | 57 | 69 | 28 | 29 |
| First (1) | 38 | 53 | 15 | 23 |
| Second (2) | 8 | 67 | 8 | 0 |
| Third (3) | 9 | 25 | 9 | 0 |
| Fourth (4) | 10 | 14 | 2 | 8 |
| Fifth (5) | 18 | 14 | 7 | 11 |
| Sixth (6) | 2 | 37 | 2 | 0 |
| **Total** | **153** | **296** | **75** | **78** |

**Important:** The inventory contains a confusing cross-floor casefold duplicate: `C/GR/SH/16b` on floor 0 vs `C/GR/sh/16B` on floor 1. Floor context resolves them, and exact inventory IDs must be preserved; never collapse them to one record.

### The fourteen SR / SH collision candidates requiring source-specific review

Basement: `A/BA/SH/01`, `03`, `04`, `05`, `06`, `07`, `08` have opposite-type `A/BA/SR/*` polygons, which are **not** their outlines.

Ground: `A/GR/SH/18`, `19`, `20`, `21` have `A/GR/SR/*` polygons, **not** their outlines.

First: `A/FR/SR/06`, `07` have `A/FR/SH/*` polygons; `A/FR/SH/21` has an `A/FR/SR/21` polygon. These are **not** matches.

## Geometry and client-offer safeguards

The saved SVG candidates are still subject to human architectural validation. No floor is approved. Client-facing clickable unit boundaries and floorplan PDF attachments must remain disabled for DRAFT geometry. Preserve the source drawing and stock data unchanged. Audit history must not imply any inferred alias was ever approved.
