# Cairo Plaza — architectural SVG geometry progress

Latest source-based mapping: **163 DRAFT unit polygons**. Original eight-page architectural PDF and the read-only Price List.xlsx have not been edited.

| Architectural floor | Draft polygons | Label reconciliation |
| --- | ---: | --- |
| Basement (-1) | 17 | All 17 PDF-extracted unit labels matched to candidate shapes |
| Ground (0) | 0 | Flattened vector labels; assignment to precise unit outlines still incomplete |
| First (1) | 0 | Flattened vector labels; assignment to precise unit outlines still incomplete |
| Second (2) | 67 | All 67 PDF-extracted unit labels matched to candidate shapes |
| Third (3) | 14 | Side-wing visible office labels reconciled; remainder of floor untraced |
| Fourth (4) | 14 | Side-wing visible office labels reconciled; remainder of floor untraced |
| Fifth (5) | 14 | Side-wing visible office labels reconciled; remainder of floor untraced |
| Sixth (6) | 37 | All 37 PDF-extracted unit labels matched to candidate shapes |
| **Total** | **163** | **NOT APPROVED** |

Source-based geometries are in `assets/cairo-plaza/trace-drafts-163.json`. Prior milestones are preserved for audit history. New visually read third, fourth, and fifth floor unit codes were traced from the respective original architectural floor artwork. The earlier 121 machine-readable PDF labels (basement, second, sixth) match corresponding polygon candidates.

Automated structural QA: all candidate unit polygon IDs are unique per floor, outlines are valid, each is contained within the PDF viewBox, and no two mapped polygons overlap by more than 2 PDF points of area. For the original 121 source-text markers, every label location falls inside its proposed corresponding outline.

This is a **candidate boundary map**, not certified CAD geometry. Architectural wall corners and unit-ID assignments still require comprehensive source drawing verification before client-facing click selection. All eight floors remain `reviewStatus='DRAFT'` in Neon. The application deliberately excludes draft geometry from the customer PDF and click selection.

**Business rule:** any labeled unit drawn in the architecture but absent from the current live inventory displays **Sold Out** in red and cannot be offered. An old printed red fill is historical and does not override the live Google Drive inventory. Never modify the source spreadsheet.

**Outstanding:** resolve ground and first floor labels, missing inner/front-wing units on other floors, and all stock-to-outline reconciliations before architectural approval. Do not infer a unit code or footprint from room placement alone.
