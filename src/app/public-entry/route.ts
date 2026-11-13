import { NextRequest, NextResponse } from "next/server";
import { issueSharedAccessCookie } from "@/lib/shared-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The public domain is intentionally shared with all visitors; this handler
 * grants only the existing restricted offer-viewer cookie. It never grants
 * a Google OAuth administrator session, and never discloses the permanent key.
 * The original /access#key=... URL continues to work without modification.
 */
export async function GET(req: NextRequest) {
  try {
    await issueSharedAccessCookie();
  } catch {
    return NextResponse.json(
      { error: "Public offer access is not configured." },
      {status:503,headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"}}
    );
  }
  return NextResponse.redirect(new URL("/shared",req.url), {
    status: 303,
    headers: {
      "Cache-Control":"private, no-store, max-age=0",
      "Referrer-Policy":"no-referrer",
      "X-Robots-Tag":"noindex"
    }
  });
}
