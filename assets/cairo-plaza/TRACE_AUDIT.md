# Cairo Plaza — Architectural SVG mapping review

Source drawings: original 8-page PDF; inventory: read-only Price List.xlsx / Sheet1. Source files are not modified.

## Current architectural draft coverage

| Floor | Candidate traced SVG polygons | Status |
| --- | ---: | --- |
| Basement (-1) | 17 | DRAFT |
| Ground (0) | 69 | DRAFT |
| First (1) | 39 | DRAFT |
| Second (2) | 67 | DRAFT |
| Third (3) | 14 | DRAFT |
| Fourth (4) | 14 | DRAFT |
| Fifth (5) | 14 | DRAFT |
| Sixth (6) | 37 | DRAFT |
| **Total** | **271** | **NOT APPROVED** |

108 candidate polygons were newly added by tracing room partition lines in the original PDF on the ground and first floors. The existing 163 earlier draft outlines are preserved, unchanged.

## Matching and safety

- Reference stock contains 153 rows, including case-only variants of a code at **different floor values**. For example, `C/GR/SH/16b` (floor 0, Reservation) and `C/GR/sh/16B` (floor 1, Available) must not be merged. Do not silently correct the source typo.
- The application now matches drawing codes against inventory using a normalized code **and the architectural floor**, rejects ambiguous code-only matches, and uses the exact stock row for PDF price and status.
- A code drawn but not found in the live inventory **for the same floor** is displayed Sold Out. No client offer from it.
- Source preview red fill is historical and should never overrule the live status.
- Non-overlapping vector paths and correct room-label association are necessary but **not sufficient** for architectural approval.
- All 8 plans remain `DRAFT`. Draft candidate paths are non-clickable and do not enter generated PDFs.

## Source / review artifacts

- `assets/cairo-plaza/trace-drafts-163.json` earlier baseline.
- `assets/cairo-plaza/trace-drafts-271.json` latest cumulative proposal.
- Downloadable 8-SVG review package includes original floor artwork, floor-by-floor overlays, evidence CSV and source match audit.

## Outstanding work

Ground and first have many additional inner/angled rooms whose exact vector outlines and codes need reconciliation. Third, fourth and fifth also have partial candidate coverage. Do not claim project-wide geometric completeness or enable PDF selection until the **complete stock and drawing map** is independently checked against the original floorplans.
