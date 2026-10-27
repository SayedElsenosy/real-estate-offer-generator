# Offer Atelier — Real Estate Property Offer Generator

Standalone full-stack property offer generator using Next.js (App Router), Auth.js v5 with Google OAuth, Prisma 7, Neon PostgreSQL, Tailwind CSS and Vercel.

## Current capabilities
- Multi-project portfolio: Cairo Plaza, Kawn, Nasa, Aqmar, Vida
- Private read-only Google Sheets inventory via the authorized signed-in Google account
- Google OAuth refresh tokens retained server-side in the Prisma Account table
- Admin controls to connect each project to a Sheet (no Publish to web)
- Interactive floor maps backed by stored, sanitized SVG path geometry keyed to Unit Code
- Admin managed payment plans; many months and maintenance deposit percent
- Decimal.js calculations with correct rounding of the final installment
- Multi-page PDF offers using @react-pdf/renderer (unit details, highlighted floor map and one payment schedule per chosen plan)
- Offer snapshots in Neon (prices, terms, schedules) for audit/history

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
The current PDF is an original corporate starter template. Exact 1:1 matching requires the original reference PDF, official fonts, imagery, and brand assets. Generated PDF files are streamed to the user and offer data is snapshotted in PostgreSQL, but the binary PDF itself is not archived in object storage yet. This is not an invoice or binding contract.

Do not place .env secrets into the repository or front-end bundles.
