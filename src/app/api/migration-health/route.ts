import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public non-sensitive smoke test for the isolated Cloudflare migration.
// It does not connect to the database or reveal any environment variables.
export async function GET() {
  return NextResponse.json(
    { service: "real-estate-offer-generator", cloudflareMigration: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
