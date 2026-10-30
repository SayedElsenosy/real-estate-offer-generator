import { NextResponse } from "next/server";
import { currentUser } from "@/lib/guards";
import { hasSharedAccess } from "@/lib/shared-access";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

// The studio HTML is a static, non-sensitive shell. Keep all session checks,
// user data and project/payment-plan reads behind this authenticated endpoint.
// This prevents a full React Server Components render on every /studio visit,
// which can exceed Cloudflare Workers Free's 10ms CPU budget.
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json(
    { error: "Unauthorized" }, { status: 401, headers: NO_STORE }
  );
  const [projects, shared] = await Promise.all([
    db().project.findMany({
      select: { id: true, slug: true, name: true, paymentPlans: true },
      orderBy: { name: "asc" }
    }),
    hasSharedAccess()
  ]);
  return NextResponse.json({
    projects: JSON.parse(JSON.stringify(projects)),
    email: shared ? "Private link access" : (user.email || "")
  }, { headers: NO_STORE });
}
