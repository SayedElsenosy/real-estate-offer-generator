import { NextRequest, NextResponse } from "next/server";
import { isValidSharedLink, issueSharedAccessCookie, hasSharedAccess } from "@/lib/shared-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Never accept a token in the URL, which may be stored in referrers or logs.
  if (req.headers.get("origin") !== req.nextUrl.origin ||
      req.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  }
  const body = await req.text();
  if (body.length > 1024) return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  let token: unknown;
  try { token = JSON.parse(body).token; } catch { return NextResponse.json({error:"Invalid link"},{status:400}); }
  if (!(await isValidSharedLink(token)))
    return NextResponse.json({ error: "Invalid or revoked private access link" }, { status: 403, headers: {"Cache-Control":"no-store"} });
  await issueSharedAccessCookie();
  return NextResponse.json({ ok: true }, { headers: {"Cache-Control":"no-store"} });
}

export async function GET() {
  return NextResponse.json({ active: await hasSharedAccess() }, { headers: {"Cache-Control":"no-store"} });
}

export async function DELETE(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin) return NextResponse.json({error:"Invalid request"},{status:403});
  const response = NextResponse.json({ ok: true }, { headers: {"Cache-Control":"no-store"} });
  response.cookies.set("offer_atelier_shared", "", { maxAge: 0, path: "/", secure: true, sameSite: "lax", httpOnly: true });
  return response;
}
