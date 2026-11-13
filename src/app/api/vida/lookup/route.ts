import {NextRequest,NextResponse} from "next/server";
import {currentUser} from "@/lib/guards";
import {readPublicProject} from "@/lib/public-data";
import {getRecentInventory} from "@/lib/inventory-cache";
import {unitKey} from "@/lib/unit-code";
import {getVidaBrochureLocation} from "@/lib/vida-brochure";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 const user=await currentUser();
 if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const code=req.nextUrl.searchParams.get("unitCode")||"";
 const floor=req.nextUrl.searchParams.get("unitFloor")||"";
 if(code.length>80||floor.length>80||!code||!floor)
   return NextResponse.json({error:"Invalid unit"},{status:400});
 const project=await readPublicProject("vida",false);
 if(!project?.spreadsheetId)return NextResponse.json({error:"Vida inventory not configured"},{status:409});
 try{
   const {units}=await getRecentInventory(user.id,project.spreadsheetId,project.sheetRange,project.name);
   const matches=units.filter(u=>unitKey(u.code)===unitKey(code)&&u.floor===floor);
   if(matches.length!==1)return NextResponse.json({error:"Unit not found or ambiguous"},
     {status:matches.length>1?409:404});
   const mapping=getVidaBrochureLocation(matches[0]);
   return NextResponse.json({location:mapping},{headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return NextResponse.json({error:"Unable to verify Vida unit from live inventory"},
   {status:502,headers:{"Cache-Control":"private,no-store"}});}
}
