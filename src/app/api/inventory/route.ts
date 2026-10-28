import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/guards";
import { getLiveInventory } from "@/lib/sheets";
import { CAIRO_PLAZA_PROJECT_ID, hasAuthoritativeCairoDwgSource } from "@/lib/cairo-architectural-source";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function safeFloorPlans(projectId: string, floors: any[]) {
  if (projectId !== CAIRO_PLAZA_PROJECT_ID) return floors;
  // The 362 legacy PDF-drawn candidate outlines are retained for audit only.
  // Never expose those images or polygons to the current Cairo Plaza UI.
  return floors.map(f => hasAuthoritativeCairoDwgSource(f)
    ? f
    : {...f, shapes: [], markers: [], backgroundData: null, reviewStatus: "DRAFT"});
}
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("projectId");
  if (!id) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  const project = await db().project.findUnique({ where: { id }, include: { floorPlans: true } });
  if (!project) return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  if (!project.spreadsheetId) return NextResponse.json({
    units: [], floorPlans: safeFloorPlans(id, project.floorPlans), error: "A private inventory spreadsheet has not been connected to this project."
  }, { headers: { "Cache-Control": "no-store" } });
  try {
    const units = await getLiveInventory(user.id, project.spreadsheetId, project.sheetRange, project.name);
    return NextResponse.json({ units, floorPlans: project.floorPlans }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      units: [], floorPlans: project.floorPlans,
      error: error instanceof Error ? error.message : "Inventory fetch failed"
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
