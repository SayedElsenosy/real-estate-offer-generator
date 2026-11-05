import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/guards";
import {readPublicProject} from "@/lib/public-data";
import {getRecentInventory} from "@/lib/inventory-cache";
import {unitKey} from "@/lib/unit-code";
import {matchVidaBrochure} from "@/lib/vida-brochure";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const noCache={"Cache-Control":"private, no-store","X-Robots-Tag":"noindex"};
export async function GET(req:NextRequest){
 const user=await currentUser();
 if(!user)return NextResponse.json({error:"Unauthorized"},{status:401,headers:noCache});
 const code=req.nextUrl.searchParams.get("code")?.trim()||"";
 const floor=req.nextUrl.searchParams.get("floor")?.trim()||"";
 if(!/^[A-Za-z0-9 -]{3,40}$/.test(code)||floor.length>70)
   return NextResponse.json({error:"Invalid unit"},{status:400,headers:noCache});
 try{
   const project=await readPublicProject("vida",false);
   if(!project?.spreadsheetId)return NextResponse.json({error:"Vida inventory not connected"},{status:409,headers:noCache});
   const {units}=await getRecentInventory(user.id,project.spreadsheetId,project.sheetRange,project.name);
   const matches=units.filter(u=>unitKey(u.code)===unitKey(code)&&u.floor===floor);
   if(matches.length!==1)
     return NextResponse.json({error:"Vida unit not uniquely found"},{status:404,headers:noCache});
   const match=matchVidaBrochure(matches[0]);
   return NextResponse.json({match},{headers:noCache});
 }catch(error){
   return NextResponse.json({error:error instanceof Error?error.message:"Vida preview unavailable"},
      {status:502,headers:noCache});
 }
}
