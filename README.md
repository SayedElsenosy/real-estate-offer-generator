# Offer Atelier — Real Estate Property Offer Generator

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

## Floorplan import
Export the architectural PDF to an SVG containing simple path/polygon/rect elements. Set the id or data-unit-code attribute of each unit to its exact Unit Code from Google Sheets. Import the SVG in /admin and provide the floor name/code; the browser extracts only the unit geometry. SVG transforms and groups need flattening in the source export.

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

The current [source-vector audit](assets/cairo-plaza/review-2026-10-28/REPORT.md) contains **361 DRAFT unit outline candidates** across eight floors. Exactly **140 of 153** authoritative Sheet1 inventory rows have an outline candidate matched by full unit code and floor; **13 remain unresolved**. The [review files](assets/cairo-plaza/review-2026-10-28/) contain individual QA screenshots, source vector evidence, and per-floor draft SVGs. All geometries remain **DRAFT**, not architect-certified: draft shapes cannot be used as interactive offer selectors or as highlighted unit maps in customer PDFs.

The geometry baseline is [trace-drafts-361.json](assets/cairo-plaza/trace-drafts-361.json). No automatic SR/SH substitutions, split-unit guesses, or normalized aliasing beyond case differences are permitted.

Geometry check (requires Python and Shapely):

```sh
python scripts/verify-cairo-geometry.py
# For source-level verification, also provide the ORIGINAL source files:
python scripts/verify-cairo-geometry.py --pdf "/path/to/original.pdf" --inventory "/path/to/Price List.xlsx"
```

The optional inventory verification reads Sheet1 but never edits the spreadsheet. No geometry may be marked APPROVED without individual architectural review.
