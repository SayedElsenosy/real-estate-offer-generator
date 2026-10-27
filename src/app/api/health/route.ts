import { NextResponse } from "next/server";
import { authReady } from "@/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  let database: "connected" | "error" | "not-configured" = "not-configured";
  let configuredProjects = 0;
  if (process.env.DATABASE_URL) {
    try {
      configuredProjects = await db().project.count({ where: { spreadsheetId: { not: null } } });
      database = "connected";
    } catch {
      database = "error";
    }
  }
  return NextResponse.json({
    application: "offer-generator",
    status: authReady && database === "connected" ? "configured" : "setup-required",
    googleOAuth: authReady ? "configured" : "pending",
    database,
    configuredProjects,
    source: "github"
  }, { headers: { "Cache-Control": "no-store" } });
}
