# Offer Atelier — Real Estate Property Offer Generator

## Cairo Plaza — official engineering DWG (2026-10-28)

**The DWG supplied by the engineering department is the only authoritative architectural source** for Cairo Plaza. Older PDF-derived floor images and polygons have been retired from all live app responses, the admin PDF importer, floor-map approval, and customer quote map sections. The existing legacy geometry is preserved only as non-public DRAFT audit history until replacement is verified.

- Exact original DWG SHA-256: `9c9aac1fcf2b330fbbb5e3555b86300b922ac1a33037e4ea51510ece82792c6a`
- Upload filename: `معماري كايرو بلازا(1).dwg`, native Autodesk DWG revision `AC1027` (2013–2017).
- The two supplied DWG uploads had identical SHA-256 digests, so they represent a single source.
- See [the source manifest](assets/cairo-plaza/engineering-dwg-source.json).
- **Current extraction status:** this runtime cannot decode DWG AC1027 directly, so the original layers, unit polygons and floor count have *not* been independently recovered from the new file. Do not confuse registration of the source with geometry approval.
- Export the *same DWG* to DXF R2013 using a native DWG-capable CAD converter (e.g. AutoCAD / official ODA converter), then verify it with `python scripts/analyze-cairo-engineering-cad.py --dwg original.dwg --dxf export.dxf --out cad-report.json`. Preserve block insertions, layers, hatches, and text entities. Do not use PDF conversion.
- The new floorplan import API requires the exact DWG SHA-256 and manual verification for each floor; Cairo Plaza customer PDF offers omit floor geometry until new source-based mappings are approved.
- Live inventory is still **Sheet1**, and payment plan/price/offer generation are unaffected. Downloadable quotation PDF remains supported; only the **architectural PDF source** was retired.

**Legacy note:** the 362 old paths in Neon are not approved. The prior reports and screenshots remain in the repository only to document what was rejected—not as an active architectural reference.


Standalone full-stack property offer generator using Next.js (App Router), Auth.js v5 with Google OAuth, Prisma 7, Neon PostgreSQL, Tailwind CSS and Vercel.

## Current capabilities
- Multi-project portfolio: Cairo Plaza, Kawn, Nasa, Aqmar, Vida
- Private read-only Google Sheets inventory via the authorized signed-in Google account
- Google OAuth refresh tokens retained server-side in the Prisma Account table
- Admin controls to connect each project to a Sheet (no Publish to web)
- Interactive floor maps backed by stored, sanitized SVG path geometry keyed to Unit Code
- Admin-managed payment plans with down payment counted as payment #1 in the term, configurable installment interval (monthly/quarterly/custom), optional delivery date and collection percentage, and maintenance deposit
- Decimal.js calculations with correct rounding of the final installment
- Multi-page PDF offers using @react-pdf/renderer (unit details, highlighted floor map and one payment schedule per chosen plan)
- **Download-only offers:** PDFs are generated in memory and sent to the browser without saving new offers, schedule snapshots, or PDF binaries in Neon; offer history is disabled

## Interactive CAD plan page

Authenticated users can open `/plans` from the sidebar. **New preview mode:** upload the supplied engineering `معماري كايرو بلازا.dxf` in the preview panel after signing in. The browser verifies its exact SHA-256 locally, reads the DXF TEXT/MTEXT code labels and original LINE/LWPOLYLINE strokes, and overlays clickable label markers colored from current Sheet1. This file is not uploaded to the server or persisted in the repository. DXF linework is not an approved unit perimeter; until architectural review, only the markers are color-coded. Non-supported CAD entity types and block insertions may be omitted in this preview, so it is not a full-fidelity CAD renderer. If Sheet1 is inaccessible, status colors are withheld.\n\nAuthenticated users can open `/plans` from the sidebar. The page displays **only APPROVED floor-plan shapes linked to the registered engineering DWG SHA-256**. It has floor selection, unit-code search, zoom, a status legend and unit details. Each load/refresh reads the current private Sheet1; nothing is written back to the workbook.

- CAD-drawn code **absent from Sheet1**: **Sold Out (red)**. This is a display-only fallback, never a change to the engineering geometry or to Sheet1.
- Present in Sheet1 and Available: **green**; Reserved/Booked: **amber**; all other present non-available statuses including Closed: **grey**.
- The full unit code and floor must match exactly, apart from Unicode normalization/letter case; never alias SH/SR, zero padding or split-unit suffixes.
- If private Sheet1 cannot be read, the viewer **does not** infer sold-out statuses from an empty result; it displays an error and withholds the color map.
- Drawing-only units do not become offerable. Only live inventory with available status can be used for downloadable quotation PDFs; quote PDFs remain enabled.

**Extraction still outstanding:** The supplied original DWG hash has been verified and the DXF has been inspected, but this does **not** establish approved boundary-to-unit-code mapping. Existing historical PDF-based draft polygons are excluded. Until the CAD-specific polygon mapping is extracted, verified and approved per floor, the plan page deliberately shows its review-pending state instead of fabricated footprints. Upload and approval must not be inferred from CAD text-label locations alone.

## Deployment
The linked Vercel project automatically deploys changes pushed to main.

Add these project environment variables in Vercel (production, preview and development):
- DATABASE_URL — Neon pooled database connection URI
- DIRECT_URL — Neon direct connection URI for Prisma CLI
- AUTH_SECRET — random 32+ byte secret
- AUTH_TRUST_HOST=true
- GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET — Google Cloud OAuth 2.0 Web Application
- ADMIN_EMAILS — comma-separated email addresses allowed into /admin
- ALLOWED_LOGO_HOSTS — optional comma-separated allowlist for HTTPS logos in PDFs

Google Cloud callback: https://real-estate-offer-generator-tau.vercel.app/api/auth/callback/google

Enable the Google Sheets API in Google Cloud, add this exact read-only scope to the OAuth consent screen:
https://www.googleapis.com/auth/spreadsheets.readonly
In testing mode, register sign-in accounts as test users. Each account must already have Reader access to the private Sheet.

Connect a Sheet in /admin using the Spreadsheet ID and a range such as Inventory!A:Z. Required column names are Unit Code and Price. Optional: Area, Floor, Status.

## Architectural floorplan workflow (DWG only)

Cairo Plaza's sole authoritative architectural source is the engineering-department DWG registered in `assets/cairo-plaza/engineering-dwg-source.json`. The retired PDF artwork, old SVG extracts, JPEG floor images, ZIP bundles, and legacy polygons are **not** acceptable inputs for publishing Cairo Plaza geometry. Keep legacy audit files for historical comparison only; do not import or approve them.

The original DWG binary is **not checked into this repository**. To extract unit shapes, supply the verified original DWG to an AC1027-capable CAD application, export a DXF preserving blocks, entity layers and labels, and use `scripts/analyze-cairo-engineering-cad.py` to inventory the exported drawing. The script requires the registered SHA-256 and only inventories entities: its output is not approved unit geometry. Map unit polygons against exact full codes, floor and inventory, visually inspect boundaries against the authoritative CAD source and obtain architectural sign-off before setting any floor to APPROVED. Never infer missing outlines or normalize SR/SH, hyphens, or leading zeros.

The `/api/floors` endpoint rejects Cairo Plaza submissions that do not carry the registered DWG fingerprint and requires confirmed, complete geometry before approval. Do not treat a supplied fingerprint alone as proof of CAD-derived geometry; architectural review is still mandatory.

The quotation **output** remains a downloadable PDF, generated in memory without saving a quote. This is separate from the retired **PDF architectural input**.

## Database
Prisma schema matches eight tables already provisioned in the dedicated Neon offer_generator database. It is intentionally separate from BUNYRA.

## Limitations
The current PDF is an original corporate starter template. Exact 1:1 matching requires the original reference PDF, official fonts, imagery, and brand assets. Generated PDFs are streamed to the user's browser; the app deliberately does not store newly generated PDF files, offer history, or quotation snapshots in PostgreSQL. Any older records predate this change and are untouched. This is not an invoice or binding contract.

Do not place .env secrets into the repository or front-end bundles.


## Cairo Plaza XLSX: original file, read-only

Cairo Plaza's source is an Office workbook (Price List.xlsx) on Google Drive, not a native Google Sheet.

The server downloads the original file via the Drive files.get alt=media endpoint with the signed-in user's drive.readonly scope and parses only the configured Sheet1 tab with ExcelJS. No conversion, copy or writes.

Configured in Neon as Sheet1!A:N. Its verified Sheet1 columns are A = Unit Code, E = floor, G = area, L = availability, M = total unit price.

Only Available units can be offered. The server re-reads prices and status when issuing each PDF.

On the next login the user may need to consent to Google Drive readonly access. Enable Google Drive API in the Google Cloud project if it is disabled. Drive readonly is a restricted scope that may need app verification for production users.


## Verified native Excel layout (Sheet1)
The native XLSX has **Column 1** (not `Unit Code`) in cell A1. That column contains the actual Unit Code, followed by Project Name (B), Floor Number (E), Gross Area (G), Availability Status (L) and Total Price (M). Google Drive's CSV/text preview prepends an export-only index column, so its apparent positions differ from the source workbook. The app matches unique verified header names and accepts `Column 1` or `Unit Code` as the unit-code heading. No source file changes or copies are necessary. Google Drive HTTP 403 errors describe provider reasons when available.


## Cairo Plaza geometric review — 2026-10-28

The historical, retired [PDF-based vector audit](assets/cairo-plaza/review-2026-10-28/REPORT.md) contains **361 DRAFT unit outline candidates** across eight floors. Exactly **140 of 153** authoritative Sheet1 inventory rows have an outline candidate matched by full unit code and floor; **13 remain unresolved**. The [review files](assets/cairo-plaza/review-2026-10-28/) contain individual QA screenshots, source vector evidence, and per-floor draft SVGs. All geometries remain **DRAFT**, not architect-certified: draft shapes cannot be used as interactive offer selectors or as highlighted unit maps in customer PDFs.

The geometry baseline is [trace-drafts-361.json](assets/cairo-plaza/trace-drafts-361.json). No automatic SR/SH substitutions, split-unit guesses, or normalized aliasing beyond case differences are permitted.

Historical PDF-geometry audit only (not a workflow for sourcing or approving new architectural boundaries; requires Python and Shapely):

```sh
python scripts/verify-cairo-geometry.py
# For source-level verification, also provide the ORIGINAL source files:
python scripts/verify-cairo-geometry.py --pdf "/path/to/original.pdf" --inventory "/path/to/Price List.xlsx"
```

The optional inventory verification reads Sheet1 but never edits the spreadsheet. No geometry may be marked APPROVED without individual architectural review.
