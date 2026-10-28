import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin } from "@/lib/guards";
import { db } from "@/lib/db";
import { validIsoDate } from "@/lib/payment";

const inputSchema = z.object({
  id: z.string().optional(),
  projectId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  downPaymentPct: z.coerce.number().min(0).max(100),
  months: z.coerce.number().int().min(1).max(360),
  maintenancePct: z.coerce.number().min(0).max(100),
  startOffsetMonths: z.coerce.number().int().min(0).max(120),
  installmentIntervalMonths: z.coerce.number().int().min(1).max(36).default(1),
  deliveryDate: z.union([z.string(), z.null()]).optional(),
  deliveryCollectionEnabled: z.boolean().default(false),
  deliveryCollectionPct: z.coerce.number().min(0).max(100).default(0)
}).superRefine((input, context) => {
  const date = input.deliveryDate || null;
  if (date && !validIsoDate(date)) context.addIssue({ code: "custom", message: "Invalid delivery date", path: ["deliveryDate"] });
  if (input.deliveryCollectionEnabled && (!date || input.deliveryCollectionPct <= 0))
    context.addIssue({ code: "custom", message: "Select delivery date and percentage when collection at delivery is enabled", path: ["deliveryDate"] });
  const totalSlots = Math.ceil(input.months / input.installmentIntervalMonths);
  const recurringCount = totalSlots - (input.downPaymentPct > 0 ? 1 : 0);
  const collection = input.deliveryCollectionEnabled ? input.deliveryCollectionPct : 0;
  if (input.downPaymentPct + collection > 100)
    context.addIssue({ code: "custom", message: "Down payment and delivery collection cannot exceed 100%", path: ["deliveryCollectionPct"] });
  if (recurringCount === 0 && input.downPaymentPct + collection < 100)
    context.addIssue({ code: "custom", message: "Duration and interval leave no future installment slots; extend the duration or shorten the interval", path: ["months"] });
  if (recurringCount > 0 &&
      input.startOffsetMonths + (recurringCount - 1) * input.installmentIntervalMonths > input.months)
    context.addIssue({ code: "custom", message: "Last installment falls outside the selected duration; adjust the offset or frequency", path: ["startOffsetMonths"] });
});
export async function POST(req: NextRequest) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const payload = inputSchema.parse(await req.json());
    const project = await db().project.findUnique({ where: { id: payload.projectId }, select: { id: true } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const data = { projectId: payload.projectId, name: payload.name,
      downPaymentPct: payload.downPaymentPct.toString(), months: payload.months,
      maintenancePct: payload.maintenancePct.toString(), startOffsetMonths: payload.startOffsetMonths,
      installmentIntervalMonths: payload.installmentIntervalMonths,
      deliveryDate: payload.deliveryDate || null,
      deliveryCollectionEnabled: payload.deliveryCollectionEnabled,
      deliveryCollectionPct: (payload.deliveryCollectionEnabled ? payload.deliveryCollectionPct : 0).toString(),
      updatedAt: new Date() };
    const plan = payload.id ?
      await db().paymentPlan.update({ where: { id: payload.id, projectId: payload.projectId }, data }) :
      await db().paymentPlan.create({ data });
    return NextResponse.json({ plan }, { status: payload.id ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid plan" }, { status: 400 });
  }
}
export async function DELETE(req: NextRequest) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const payload = z.object({ projectId: z.string().min(1), id: z.string().min(1) }).parse(await req.json());
    const result = await db().paymentPlan.deleteMany({ where: { id: payload.id, projectId: payload.projectId } });
    if (!result.count) return NextResponse.json({ error: "Payment plan not found" }, { status: 404 });
    return NextResponse.json({ deleted: true, id: payload.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete plan" }, { status: 400 });
  }
}
