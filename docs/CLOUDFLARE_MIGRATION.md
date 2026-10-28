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


## Real deployment verification after configuring Cloudflare secrets

As of 2026-10-28, Cloudflare reports all **five** expected secret names bound to `real-estate-offer-generator`: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAILS`, and `AUTH_SECRET`. Their values were not read or logged. Non-secret `NEXTAUTH_URL` and `AUTH_TRUST_HOST` are configured.

Cloudflare Builds test `91f7de90-a6ef-4842-b5f8-7428d669214f` uncovered a real Workers route failure: a GET to the retired offers history endpoint returned HTTP 500 because the PDF renderer was loaded eagerly. The fix moves runtime imports of `@react-pdf/renderer` and `@/lib/pdf` into the authenticated POST path.

Cloudflare Builds test `616a06d7-b6d8-452a-864c-05ed7ea25977` **passed all seven post-deploy probes**:

| Probe | Expected | Observed |
| --- | ---: | ---: |
| `/api/migration-health` | 200 | 200 |
| `/api/auth/providers`, Google registered | 200 | 200 |
| `/api/auth/session` with no cookie | 200 | 200 |
| `/` home | 200 | 200 |
| `GET /api/offers` (history disabled) | 410 | 410 |
| `POST /api/offers` unauthenticated | 401 | 401 |
| `/api/inventory?projectId=cairo-plaza` unauthenticated | 401 | 401 |

Deployed Cloudflare version after these checks: `149a9010-96bb-4799-a4a7-3b157d8b19df`. The official Neon connection also confirmed `offer_generator` with six expected core tables and five projects. **That checks Neon from the connected database tool, not from inside the Worker.**

**Not yet confirmed**: interactive Google OAuth callback and real signed-in session, Worker-to-Neon query through Auth.js, authenticated live Google Sheet/Drive retrieval, a valid PDF offer generated with the real project and payment plan, and complete CAD display in the browser. Keep the migration PR in draft and do not delete Vercel until these tests pass.


## Runtime fixes after real Google sign-in and inventory tests (2026-10-28)

User tests revealed `/api/auth/error?error=Configuration` and later HTTP 500/502 inventory failures. Cloudflare's Worker telemetry was examined with secret/token values deliberately excluded.

1. The login callback's `AdapterError` was caused by **Prisma 7 compiling a WASM query compiler dynamically** in workerd: `WebAssembly.Module(): Wasm code generation disallowed by embedder`. The Prisma generator now declares `runtime = "cloudflare"`. This fix was validated by authenticated-relevant Prisma queries against `User` and `Project` executed **inside** the live Worker during a temporary migration-only probe, which was then removed.
2. Additional runtime logs showed **Neon/Prisma promises crossing Cloudflare request boundaries**. The global cached Prisma client was removed, and the Auth.js PrismaAdapter now resolves its Prisma client when each adapter method is called, so an instance is not shared between unrelated HTTP requests.
3. Google Drive XLSX download used `fetch({redirect:"error"})`, a mode unsupported by Workers, causing an invalid redirect error on `/api/inventory`. This was replaced with explicit manual redirects restricted to HTTPS Google download hostnames, without forwarding the bearer token to cross-origin destinations.

The final build with these repairs and TypeScript checking passed:
- Build UUID: `48ee0af8-64cb-48fb-90ce-bc3d933147bc`
- Deployed Worker version: `be773964-a3cf-41fe-9ff4-c7073fdf3b4d`
- Checks: seven route guards/health tests plus 5/5 overlapping anonymous home/session requests.
- The migration branch remains a draft PR. Vercel is retained as fallback.

**Remaining manual acceptance**: the account holder must repeat a real Google OAuth login and then open Cairo Plaza and another spreadsheet-driven project's inventory and download a real PDF offer. These user-authenticated interactions cannot be established by anonymous smoke tests. Do not treat the public database readiness check as ongoing; its temporary endpoint has been removed.
