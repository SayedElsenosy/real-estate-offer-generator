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
  startOffsetMonths: z.coerce.number().int().min(0).max(120),
  deliveryMonths: z.coerce.number().int().min(0).max(360).default(0),
  deliveryCollectionEnabled: z.boolean().default(false),
  deliveryCollectionPct: z.coerce.number().min(0).max(100).default(0)
}).superRefine((input, context) => {
  const target = input.deliveryCollectionEnabled ? input.deliveryCollectionPct : 0;
  if (input.deliveryCollectionEnabled &&
    (input.deliveryMonths<2 || input.deliveryMonths>=input.months))
    context.addIssue({code:"custom",message:"Delivery month must be between 2 and the last month of the payment term.",path:["deliveryMonths"]});
  if (input.deliveryCollectionEnabled && target<input.downPaymentPct)
    context.addIssue({code:"custom",message:"Pre-delivery target cannot be smaller than the down payment.",path:["deliveryCollectionPct"]});
  if (input.deliveryCollectionEnabled && input.startOffsetMonths>0 &&
      input.startOffsetMonths>=input.deliveryMonths && target>input.downPaymentPct)
    context.addIssue({code:"custom",message:"No installment can be paid before delivery.",path:["deliveryMonths"]});

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
      installmentIntervalMonths: 1,
      deliveryDate: null,
      deliveryMonths: payload.deliveryCollectionEnabled ? payload.deliveryMonths : null,
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
