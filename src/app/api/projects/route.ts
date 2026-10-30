import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentAdmin, currentUser } from "@/lib/guards";
import { CAIRO_PLAZA_PROJECT_ID, hasAuthoritativeCairoDwgSource } from "@/lib/cairo-architectural-source";

export const runtime = "nodejs";
const config = z.object({
  id: z.string().min(1),
  spreadsheetId: z.string().trim().max(200).nullable(),
  sheetRange: z.string().trim().min(3).max(200),
  companyName: z.string().trim().min(2).max(150),
  logoUrl: z.union([
    z.url().startsWith("https://"),
    z.string().max(380000).regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/),
    z.literal(""),z.null()
  ]).optional()
});

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projects = await db().project.findMany({
    orderBy: { name: "asc" },
    include: { paymentPlans: true, floorPlans: true }
  });
  const safeProjects = projects.map(project => project.id === CAIRO_PLAZA_PROJECT_ID
    ? {...project, floorPlans: project.floorPlans.map(f =>
        hasAuthoritativeCairoDwgSource(f) ? f
          : {...f, shapes: [], markers: [], backgroundData: null, reviewStatus: "DRAFT"})}
    : project);
  return NextResponse.json({ projects: safeProjects }, { headers: { "Cache-Control": "no-store" } });
}
export async function PATCH(req: NextRequest) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const input = config.parse(await req.json());
    const project = await db().project.update({
      where: { id: input.id },
      data: {
        spreadsheetId: input.spreadsheetId || null,
        sheetRange: input.sheetRange,
        companyName: input.companyName,
        logoUrl: input.logoUrl || null,
        updatedAt: new Date()
      }
    });
    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid project data" }, { status: 400 });
  }
}
