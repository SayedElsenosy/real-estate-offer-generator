import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin } from "@/lib/guards";
import { db } from "@/lib/db";

const inputSchema = z.object({
  id: z.string().optional(),
  projectId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  downPaymentPct: z.coerce.number().min(0).max(100),
  months: z.coerce.number().int().min(1).max(360),
  maintenancePct: z.coerce.number().min(0).max(100),
  startOffsetMonths: z.coerce.number().int().min(0).max(120)
});
export async function POST(req: NextRequest) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const payload = inputSchema.parse(await req.json());
    const data = { projectId: payload.projectId, name: payload.name,
      downPaymentPct: payload.downPaymentPct.toString(), months: payload.months,
      maintenancePct: payload.maintenancePct.toString(), startOffsetMonths: payload.startOffsetMonths,
      updatedAt: new Date() };
    const plan = payload.id ?
      await db().paymentPlan.update({ where: { id: payload.id, projectId: payload.projectId }, data }) :
      await db().paymentPlan.create({ data });
    return NextResponse.json({ plan }, { status: payload.id ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid plan" }, { status: 400 });
  }
}
