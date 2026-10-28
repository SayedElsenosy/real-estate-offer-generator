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


## Actual Cloudflare deployment (2026-10-28)

**Staging Worker deployed and post-deploy HTTP smoke test passed.**

- Cloudflare account: `d2984372ee07c2652fce20b126c98f2e`
- Worker: `real-estate-offer-generator`
- Live staging URL: https://real-estate-offer-generator.sayedelsenosy65.workers.dev
- Non-sensitive smoke endpoint: `/api/migration-health`
- Final verified build UUID: `8fc597c1-93c3-4625-a470-9375b97bf7e1`; status `success`
- Deployed Worker version: `cc98f274-3203-4b8b-92dc-fb8de68fd77c`
- GitHub migration branch: `cloudflare-workers-migration` (draft PR #1)
- Cloudflare Builds connected to this GitHub branch; production `main` was not switched.
- Cloudflare `AUTH_SECRET` was generated cryptographically on the Cloudflare side and stored as a secret; its value was not printed.
- `AUTH_TRUST_HOST` and `NEXTAUTH_URL` are configured for the new Worker address in `wrangler.jsonc`.

### Remaining production-blocking secrets

The connected Vercel API **masks the values** of its sensitive variables, including when decrypt is requested. Therefore their values were **not** copied to Cloudflare. Neon can return a connection string through its connected API, but cross-connector secret transfer was denied by the environment's security controls; do not attempt to bypass this safeguard.

The operator must use the Cloudflare dashboard **Workers & Pages > real-estate-offer-generator > Settings > Variables and Secrets** to enter the following values, each as **Secret**:

- `DATABASE_URL`: connection string from the existing **Real Estate Offer Generator** Neon project (`twilight-meadow-13667195`), not BUNYRA's database.
- `GOOGLE_CLIENT_ID`: existing Google OAuth client ID.
- `GOOGLE_CLIENT_SECRET`: corresponding Google OAuth client secret.
- `ADMIN_EMAILS`: original administrative email list; preserve all original admins.

`AUTH_SECRET` is already configured; do not overwrite it unless rotating intentionally.

Add **exactly** this authorized Google OAuth redirect URI to the corresponding Google Cloud OAuth client:

`https://real-estate-offer-generator.sayedelsenosy65.workers.dev/api/auth/callback/google`

Then test sign-in, refresh-token acquisition, Sheets/Drive reads, Neon database reads, Cairo Plaza CAD map, and PDF offer generation under authenticated accounts. Do not delete or disconnect Vercel until all end-to-end checks pass.
