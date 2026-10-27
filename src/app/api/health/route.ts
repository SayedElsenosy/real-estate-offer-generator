import { NextResponse } from "next/server";
import { authReady } from "@/auth";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({
    application: "offer-generator",
    status: authReady ? "configured" : "setup-required",
    googleOAuth: authReady ? "configured" : "pending",
    source: "github"
  }, { headers: { "Cache-Control": "no-store" } });
}
