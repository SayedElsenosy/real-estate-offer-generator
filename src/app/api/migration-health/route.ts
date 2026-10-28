import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Temporary, non-sensitive Cloudflare migration diagnostics.
// Database checks are for staging only and expose no user/project values.
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("db") === "1") {
    try {
      const { db } = await import("@/lib/db");
      // Cover Prisma's actual WASM compiler and Auth.js adapter tables.
      await db().user.findFirst({select:{id:true}});
      await db().project.findFirst({select:{id:true}});
      return NextResponse.json({database: "reachable"}, {headers:{"Cache-Control":"no-store"}});
    } catch (err) {
      // Never leak credentials, SQL statements or database identifiers.
      console.error("[migration-db-check]", err instanceof Error ? err.name : "UnknownError");
      return NextResponse.json({database:"unavailable"},{status:503,headers:{"Cache-Control":"no-store"}});
    }
  }
  return NextResponse.json(
    { service: "real-estate-offer-generator", cloudflareMigration: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
