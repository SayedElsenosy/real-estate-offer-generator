import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/guards";
import { readPublicProject } from "@/lib/public-data";
import { getRecentInventory } from "@/lib/inventory-cache";
import { extractUnitSourceFields } from "@/lib/unit-details";
import { unitKey } from "@/lib/unit-code";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = {"Cache-Control":"private, no-store, max-age=0"};

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({error:"Unauthorized"},{status:401,headers});
  const projectId = req.nextUrl.searchParams.get("projectId")?.trim() || "";
  const code = req.nextUrl.searchParams.get("unitCode")?.trim() || "";
  const floor = req.nextUrl.searchParams.get("unitFloor")?.trim() || "";
  if (!projectId || !code || projectId.length>100 || code.length>100 || floor.length>80)
    return NextResponse.json({error:"Invalid unit selection"},{status:400,headers});
  try {
    const project = await readPublicProject(projectId, false);
    if (!project?.spreadsheetId)
      return NextResponse.json({error:"Project inventory not connected"},{status:404,headers});
    const {units} = await getRecentInventory(
      user.id,project.spreadsheetId,project.sheetRange,project.name
    );
    const codeMatches = units.filter(u=>unitKey(u.code)===unitKey(code));
    const matched = floor ? codeMatches.filter(u=>u.floor===floor) : codeMatches;
    // Never borrow another floor or project's metadata when a selection is ambiguous.
    if (matched.length>1)
      return NextResponse.json({error:"Ambiguous unit code/floor"},{status:409,headers});
    if (matched.length!==1)
      return NextResponse.json({error:"Unit not found in this project's live sheet"},{status:404,headers});
    const unit=matched[0];
    return NextResponse.json({
      code:unit.code, floor:unit.floor, type:unit.type || "",
      fields:extractUnitSourceFields(unit.sourceHeaders||[],unit.sourceCells||[])
    },{headers});
  } catch (error) {
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Could not read unit details"},
      {status:502,headers}
    );
  }
}
