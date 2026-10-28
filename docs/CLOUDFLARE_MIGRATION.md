# Cloudflare Workers migration (staging-first)

This application currently runs on **Next.js 16 + Prisma 7 / Neon + Auth.js + Google Drive + @react-pdf/renderer**. Do **not** replace the Cloudflare Worker `cairo-plaza-web`: it belongs to a separate application with D1 and different OAuth bindings. Do **not** replace `bunyra-new`.

## Current findings (2026-10-28)

- Cloudflare account verified, existing Workers `bunyra-new` and `cairo-plaza-web` found.
- `cairo-plaza-web` has a D1 binding called `DB`, secrets `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `AUTH_SESSION_SECRET`, and a `PUBLIC_BASE_URL`. **These bindings are not equivalent** to this application's Neon/Prisma/Auth.js setup.
- Create a separate Worker named `real-estate-offer-generator` and keep Vercel production as rollback until login, inventory, and PDFs pass end-to-end testing.

## Non-destructive local migration

Cloudflare's current recommendation for Next.js 16 is **vinext** (beta):

```sh
npm ci
npx vinext check
npx vinext init
npm run dev:vinext
npm run build:vinext
npx @vinext/cloudflare deploy
```

Review generated `wrangler.jsonc`, Vite config and package-lock diff before committing. Ensure `prisma generate` runs before the vinext build. Test the generated Prisma client with the Workers runtime (Neon serverless adapter), Auth.js Prisma adapter, and PDF rendering. Avoid committing partial hand-written vinext configs without a successful compatibility check.

## Required Cloudflare environment bindings

Use Cloudflare secret bindings for `DATABASE_URL`, `AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, and any additional keys referenced by server code. Set `GOOGLE_CLIENT_ID` (plain text or secret), `AUTH_TRUST_HOST=true`, and any non-secret allowed-host/application configuration. Check actual environment-variable usages in code before deployment; Vercel variables are not transferred automatically. Never commit actual values to Git or print them in logs.

Update Google OAuth Authorized Redirect URIs for the *new Worker origin*, following the Auth.js OAuth callback route. The original Vercel environment stays untouched until the Worker has passed production-like tests.

## Acceptance gates

1. Worker build completes without unsupported Node/bundling errors.
2. Login, logout and Google OAuth callback work with secure cookies.
3. Project list, Sheet1/Drive access, unit availability/status, and plans display correctly.
4. Offer calculations and generated PDF download work with real sample data.
5. Prisma/Neon reads work and no schema changes/data loss occur.
6. After acceptance, switch users to the Worker; only then retire Vercel.

Reference: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/

## Verified Vercel variable names (metadata-only audit, 2026-10-28)

The production Vercel project actually contains these seven variable **names**:
`ADMIN_EMAILS`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `DATABASE_URL`, and `AUTH_TRUST_HOST`.

Important: the existing authentication module accepts `NEXTAUTH_SECRET` as a fallback to `AUTH_SECRET`; it does **not** require both. For the Cloudflare Worker, prefer storing `AUTH_SECRET` while retaining the same underlying secret value. Configure `AUTH_URL` or `NEXTAUTH_URL` to the new Worker origin if required by the chosen Auth.js adapter. Do not copy the old Vercel URL into the new production config.

This was a read of variable **names and types only**. Secret values were not retrieved or transferred, and Cloudflare has no production-ready Worker for this repository yet.

## CI observability limitation

The available GitHub connector only exposes pull-request-triggered workflow runs in its commit-run query, and the commit status endpoint reports Vercel build quota failure. Thus an empty workflow-run response does **not** prove a workflow never ran or passed. Use the GitHub Actions workflow page to inspect the actual run and logs before declaring compatibility verified.

## Existing Cloudflare inventory

`cairo-plaza-web` is an existing, unrelated D1-backed Worker; its credentials and D1 database must not be reused or overwritten. Likewise, preserve `bunyra-new` untouched.
