#!/usr/bin/env node
/**
 * Zero-secret Cloudflare migration preflight.
 * Static audit only: does not deploy, connect to databases, or print secret values.
 */
import { readFileSync, existsSync } from "node:fs";
const read = path => readFileSync(path, "utf8");
const pkg = JSON.parse(read("package.json"));
const checks = [
  ["Next.js version", String(pkg.dependencies?.next || "").startsWith("16."), "Requires a supported Next.js 16 release for vinext."],
  ["Prisma Neon adapter", Boolean(pkg.dependencies?.["@prisma/adapter-neon"]), "Database layer must be tested on Workers."],
  ["Auth.js Google OAuth", Boolean(pkg.dependencies?.["next-auth"]), "Configure callback URI for new origin."],
  ["PDF renderer", Boolean(pkg.dependencies?.["@react-pdf/renderer"]), "Must verify actual PDF output on Workers."],
  ["Prisma generated client", read("prisma/schema.prisma").includes('provider = "prisma-client"'), "Client generation required at build time."],
  ["No quote persistence in offer API", !/db\(\)\.offer\.create|db\(\)\.offer\.upsert/.test(read("src/app/api/offers/route.ts")), "Quotation history is intentionally disabled."],
  ["Environment example", existsSync(".env.example"), "Document deployment variables without values."]
];
console.log("Cloudflare migration static preflight — no credentials read");
let failed = 0;
for(const [name,passed,note] of checks){
  console.log(`${passed ? "PASS" : "WARN"}: ${name} — ${note}`);
  if(!passed)failed++;
}
const blockers = [
  "vinext beta bundling: requires real compatibility check and production bundle",
  "PrismaNeon runtime: requires Workers integration test with Neon",
  "Auth.js Prisma database sessions: requires OAuth callback/session test",
  "React PDF renderer: requires real PDF generation smoke test",
  "Google Drive and Sheets: requires authenticated API smoke test"
];
console.log("Unverified runtime gates:");
for(const item of blockers)console.log(" - "+item);
console.log("Static checks with warnings: "+failed);
