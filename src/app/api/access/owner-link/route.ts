import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/lib/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin)
    return NextResponse.json({error:"Invalid request"},{status:403});
  // The private credential is only obtainable from an authenticated
  // administrative Google session, never via private-link-only access.
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({error:"Admin access required"},{status:403});
  const token = process.env.SHARED_ACCESS_TOKEN;
  if (!token || token.length < 40)
    return NextResponse.json({error:"Private access has not been configured"},{status:503});
  const link = req.nextUrl.origin + "/access#key=" + encodeURIComponent(token);
  return NextResponse.json({link}, {headers:{
    "Cache-Control":"private, no-store", "Pragma":"no-cache",
    "Referrer-Policy":"no-referrer", "X-Robots-Tag":"noindex"
  }});
}
