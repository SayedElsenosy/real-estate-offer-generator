import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentAdmin } from "@/lib/guards";
import { getLiveInventory } from "@/lib/sheets";

export const runtime = "nodejs";
const shapeSchema = z.object({
  unitCode: z.string().trim().min(1).max(80),
  d: z.string().trim().min(5).max(15000).regex(/^[\d\s,.+\-eEmlhvcsqtazMLHVCSQTAZ]+$/, "Only SVG path geometry is allowed")
});
const inputSchema = z.object({
  id: z.string().optional(),
  projectId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  floor: z.string().trim().max(50).nullable(),
  viewBox: z.string().regex(/^[-\d.]+\s+[-\d.]+\s+[\d.]+\s+[\d.]+$/, "Invalid SVG viewBox"),
  shapes: z.array(shapeSchema).max(500),
  markers: z.array(z.object({code:z.string().trim().min(1).max(80),x:z.number().finite().min(0).max(3000),y:z.number().finite().min(0).max(3000)})).max(600).optional(),
  backgroundData: z.string().max(3000000).nullable().optional(),
  reviewStatus: z.enum(["DRAFT", "APPROVED"]).default("DRAFT"),
  approvalConfirmed: z.boolean().optional()
});
function validBackground(background: string | null | undefined): boolean {
  if (background == null) return true;
  const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(background);
  if (!match) return false;
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > 2 * 1024 * 1024) return false;
  if (match[1] === "png")
    return bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
}
export async function POST(req: NextRequest) {
  const admin = await currentAdmin();
  if (!admin)
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const length = Number(req.headers.get("content-length") || 0);
    if (length > 3500000)
      return NextResponse.json({ error: "Floor asset is too large (3.5MB request maximum)" }, { status: 413 });
    const payload = await req.text();
    if (payload.length > 3500000)
      return NextResponse.json({ error: "Floor asset is too large" }, { status: 413 });
    const input = inputSchema.parse(JSON.parse(payload));
    const codes = input.shapes.map(shape => shape.unitCode.toUpperCase());
    if (new Set(codes).size !== codes.length)
      throw new Error("A floor plan cannot have duplicate unit codes.");
    if (!validBackground(input.backgroundData))
      throw new Error("Only a genuine PNG/JPEG background of 2MB or less can be stored.");
    if (input.reviewStatus === "APPROVED" && (!input.approvalConfirmed || !input.shapes.length))
      throw new Error("Approve only reviewed unit polygons. At least one reviewed shape and explicit confirmation are required.");
    const existingFloor = input.id
      ? await db().floorPlan.findFirst({ where: { id: input.id, projectId: input.projectId } })
      : null;
    if (input.id && !existingFloor) throw new Error("Requested floor was not found for this project.");
    if (input.reviewStatus === "APPROVED") {
      const savedMarkers = (existingFloor?.markers || []) as { code?: string }[];
      const providedMarkers = input.markers || [];
      const required = new Set([...savedMarkers, ...providedMarkers]
        .map(v => String(v.code || "").trim().toUpperCase()).filter(Boolean));
      const missing = [...required].filter(code => !codes.includes(code));
      if (missing.length)
        throw new Error("Cannot approve incomplete floor geometry: " + missing.length +
          " drawing labels still lack unit outlines. Complete all boundaries before approval.");
      if (!input.backgroundData && !existingFloor?.backgroundData)
        throw new Error("Cannot approve floor geometry without the original architectural reference image.");
      if (input.projectId === "cairo-plaza") {
        const project = await db().project.findUnique({ where: { id: input.projectId } });
        if (!project?.spreadsheetId)
          throw new Error("Live inventory must be connected before approving the architecture.");
        const liveUnits = await getLiveInventory(admin.id, project.spreadsheetId, project.sheetRange, project.name);
        const untracedStock = liveUnits.filter(unit =>
          unit.floor === input.floor && !codes.includes(unit.code.toUpperCase()));
        if (untracedStock.length)
          throw new Error("Cannot approve incomplete floor: " + untracedStock.length +
            " current inventory units have no reviewed boundaries.");
      }
    }
    const data = {
      projectId: input.projectId, name: input.name, floor: input.floor || null,
      viewBox: input.viewBox, shapes: input.shapes, updatedAt: new Date(),
      ...(input.markers !== undefined ? {markers: input.markers} : {}),
      reviewStatus: input.reviewStatus,
      ...(input.backgroundData !== undefined ? { backgroundData: input.backgroundData } : {})
    };
    if (!input.id) {
      const existing = await db().floorPlan.findFirst({ where: {
        projectId: input.projectId, floor: input.floor || null
      } });
      if (existing)
        return NextResponse.json({ error: "This floor already exists. Edit the existing floor instead." }, { status: 409 });
    }
    const floor = input.id
      ? await db().floorPlan.update({ where: { id: input.id, projectId: input.projectId }, data })
      : await db().floorPlan.create({ data });
    return NextResponse.json({ floor: {
      id: floor.id, name: floor.name, floor: floor.floor,
      reviewStatus: floor.reviewStatus, shapeCount: input.shapes.length,
      hasBackground: !!floor.backgroundData
    } }, { status: input.id ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Invalid floor plan"
    }, { status: 400 });
  }
}
