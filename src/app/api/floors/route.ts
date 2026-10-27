import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentAdmin } from "@/lib/guards";

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
  shapes: z.array(shapeSchema).min(1).max(500)
});
export async function POST(req: NextRequest) {
  if (!await currentAdmin()) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const input = inputSchema.parse(await req.json());
    const data = { projectId: input.projectId, name: input.name, floor: input.floor || null,
      viewBox: input.viewBox, shapes: input.shapes, updatedAt: new Date() };
    const floor = input.id
      ? await db().floorPlan.update({ where: { id: input.id, projectId: input.projectId }, data })
      : await db().floorPlan.create({ data });
    return NextResponse.json({ floor });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid floor plan" }, { status: 400 });
  }
}
