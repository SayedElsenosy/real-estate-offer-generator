import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/guards";
import { getLiveInventory, isAvailable } from "@/lib/sheets";
import { calculateSchedule } from "@/lib/payment";
import { getCairoOfferLocation } from "@/lib/cairo-offer-location";
import { getNasaOfferLocation } from "@/lib/nasa-offer-location";
import { unitKey } from "@/lib/unit-code";
import type { FloorGeometry } from "@/lib/pdf";
import { createPropertyOfferPdf } from "@/lib/workers-pdf";
import { CAIRO_PLAZA_PROJECT_ID, hasAuthoritativeCairoDwgSource } from "@/lib/cairo-architectural-source";

export const runtime = "nodejs";
export const maxDuration = 60;
const inputSchema = z.object({
  projectId: z.string().min(1),
  unitCode: z.string().min(1),
  unitFloor: z.string().min(1),
  planIds: z.array(z.string()).min(1).max(5),
  maintenanceDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  language: z.enum(["ar","en"]).default("ar")
});
function trustedLogo(url: string | null): string | null {
  if (!url) return null;
  if (url.length<=380000 && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(url)) return url;
  try {
    const parsed = new URL(url);
    const allowed = (process.env.ALLOWED_LOGO_HOSTS || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
    return parsed.protocol === "https:" && (allowed.includes(parsed.hostname.toLowerCase()) || parsed.hostname.toLowerCase().endsWith(".fbcdn.net")) ? url : null;
  } catch { return null; }
}
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { projectId, unitCode, unitFloor, planIds, maintenanceDueDate, language } = inputSchema.parse(await req.json());
    const project = await db().project.findUnique({ where: { id: projectId }, include: { floorPlans: true } });
    if (!project?.spreadsheetId) return NextResponse.json({ error: "Project inventory is not connected" }, { status: 409 });
    const units = await getLiveInventory(user.id, project.spreadsheetId, project.sheetRange, project.name);
    const matchingUnits = units.filter(value =>
      unitKey(value.code) === unitKey(unitCode) && value.floor === unitFloor);
    if (matchingUnits.length > 1)
      return NextResponse.json({ error: "Ambiguous unit code and floor. Cannot issue offer." }, { status: 409 });
    const unit = matchingUnits.length === 1 ? matchingUnits[0] : undefined;
    if (!unit) return NextResponse.json({ error: "Unit does not exist in the live inventory" }, { status: 404 });
    if (!isAvailable(unit.status)) return NextResponse.json({ error: "Unit is no longer available" }, { status: 409 });
    const uniquePlanIds = [...new Set(planIds)];
    if (uniquePlanIds.length !== planIds.length) return NextResponse.json({ error: "Duplicate plan selection" }, { status: 400 });
    const plans = await db().paymentPlan.findMany({ where: { id: { in: uniquePlanIds }, projectId } });
    if (plans.length !== uniquePlanIds.length) return NextResponse.json({ error: "Invalid payment plan" }, { status: 400 });
    const date = new Date();
    const schedules = plans.map(plan => calculateSchedule(unit.price, {
      name: plan.name, downPaymentPct: plan.downPaymentPct.toString(), months: plan.months,
      maintenancePct: plan.maintenancePct.toString(), startOffsetMonths: plan.startOffsetMonths,
      installmentIntervalMonths: plan.installmentIntervalMonths===3?3:1,
      deliveryMonths: plan.deliveryMonths ?? undefined,
      maintenanceDueDate: maintenanceDueDate || null,
      deliveryCollectionEnabled: plan.deliveryCollectionEnabled,
      deliveryCollectionPct: plan.deliveryCollectionPct.toString()
    }, date));
    const match = project.floorPlans.find(f => f.floor === unit.floor && f.reviewStatus === "APPROVED" &&
      (projectId !== CAIRO_PLAZA_PROJECT_ID || hasAuthoritativeCairoDwgSource(f)));
    const rawShapes = match?.shapes as { unitCode: string; d: string }[] | undefined;
    const geometry: FloorGeometry = match ? { viewBox: match.viewBox, backgroundData: match.backgroundData || null,
      shapes: (rawShapes || []).map(shape => {
        const candidates = units.filter(value => value.floor === unit.floor &&
          unitKey(value.code) === unitKey(shape.unitCode));
        const current = candidates.length === 1 ? candidates[0] : undefined;
        const status: "AVAILABLE" | "UNAVAILABLE" | "SOLD_OUT" = !current
          ? "SOLD_OUT" : isAvailable(current.status) ? "AVAILABLE" : "UNAVAILABLE";
        return { unitCode: current?.code || shape.unitCode, d: shape.d, status };
      }) } : null;
    const issuedAt = date.toISOString().slice(0, 10);
    const location = projectId === CAIRO_PLAZA_PROJECT_ID
      ? await getCairoOfferLocation(unit.code, unit.floor) : null;
    const nasaLocation = projectId==="nasa"
      ? await getNasaOfferLocation(user.id,unit.code,unit.floor) : null;
    // Workers-safe PDF engine. The former renderer relied on a Node URL/file
    // environment and failed with "Invalid URL string" on Cloudflare.
    const common = {
      company: project.companyName, logoUrl: trustedLogo(project.logoUrl),
      project: project.name, unit, issuedAt, floor: geometry, location, nasaLocation, schedules
    };
    const pdfBytes = language==="ar"
      ? await (await import("@/lib/arabic-pdf")).createArabicOfferPdf(common)
      : await createPropertyOfferPdf(common);
    // PDF is generated in-memory and streamed directly to the browser.
    // Never persist quotation PDF, unit snapshot, schedules, or quote history.
    const safeCode = unit.code.replace(/[^a-z0-9_-]/gi, "_");
    return new Response(new Uint8Array(pdfBytes), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="' + (language==="ar"?"Arabic-Offer-":"Offer-") + safeCode + '.pdf"',
        "Cache-Control": "no-store" }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not issue offer" }, { status: 400 });
  }
}
export async function GET() {
  return NextResponse.json({ error: "Offer history is disabled. Downloaded proposals are not stored." },
    { status: 410, headers: { "Cache-Control": "no-store" } });
}
