import { NextResponse } from "next/server";
import { currentUserWithAccess } from "@/lib/guards";
import { readStudioProjects } from "@/lib/public-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

// The studio HTML is a static, non-sensitive shell. Keep all session checks,
// user data and project/payment-plan reads behind this authenticated endpoint.
// This prevents a full React Server Components render on every /studio visit,
// which can exceed Cloudflare Workers Free's 10ms CPU budget.
export async function GET() {
  const access = await currentUserWithAccess();
  if (!access) return NextResponse.json(
    { error: "Unauthorized" }, { status: 401, headers: NO_STORE }
  );
  const projects = await readStudioProjects();
  return NextResponse.json({
    projects: JSON.parse(JSON.stringify(projects)),
    email: access.shared ? "Private link access" : (access.user.email || "")
  }, { headers: NO_STORE });
}
