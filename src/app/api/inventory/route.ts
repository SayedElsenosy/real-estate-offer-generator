import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/guards";
import { getRecentInventory } from "@/lib/inventory-cache";
import { CAIRO_PLAZA_PROJECT_ID, hasAuthoritativeCairoDwgSource } from "@/lib/cairo-architectural-source";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFloorPlans(projectId: string, floors: any[]) {
  if (projectId !== CAIRO_PLAZA_PROJECT_ID) return floors;
  // Never show the superseded PDF-derived floor drafts.
  return floors.map(f => hasAuthoritativeCairoDwgSource(f)
    ? f : {...f, shapes: [], markers: [], backgroundData: null, reviewStatus: "DRAFT"});
}
const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  const id = req.nextUrl.searchParams.get("projectId");
  if (!id) return NextResponse.json({ error: "Missing projectId" }, { status: 400, headers: NO_STORE });
  // The studio does not need floor geometries. Cairo Plaza keeps its drawings
  // as static build assets, so never download legacy DB background blobs.
  const withFloors = req.nextUrl.searchParams.get("includeFloors") === "1" && id !== CAIRO_PLAZA_PROJECT_ID;
  const project = await db().project.findUnique({
    where: { id },
    ...(withFloors ? { include: { floorPlans: true } } : {})
  });
  if (!project) return NextResponse.json({ error: "Unknown project" }, { status: 404, headers: NO_STORE });
  const floorPlans = withFloors && "floorPlans" in project
    ? safeFloorPlans(id, project.floorPlans as any[]) : [];
  if (!project.spreadsheetId) return NextResponse.json({
    units: [], floorPlans, error: "A private inventory spreadsheet has not been connected to this project."
  }, { status: 409, headers: NO_STORE });
  try {
    const { units, lastReadAt } = await getRecentInventory(
      user.id, project.spreadsheetId, project.sheetRange, project.name
    );
    // The browser always requests fresh metadata, but receives no list if
    // status, area and price have not changed.
    const payload = { units, ...(withFloors ? {floorPlans} : {}), lastReadAt };
    const raw = JSON.stringify({ units, ...(withFloors ? {floorPlans} : {}) });
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    const etag = '"' + Array.from(new Uint8Array(digest).slice(0,12),
      byte => byte.toString(16).padStart(2,"0")).join("") + '"';
    const headers = {...NO_STORE, ETag: etag};
    if (req.headers.get("if-none-match") === etag)
      return new Response(null, {status:304, headers});
    return NextResponse.json(payload, {headers});
  } catch (error) {
    return NextResponse.json({
      units: [], error: error instanceof Error ? error.message : "Inventory fetch failed"
    }, {status:502, headers: NO_STORE});
  }
}
