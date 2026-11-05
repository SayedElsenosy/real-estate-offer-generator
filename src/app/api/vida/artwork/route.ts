import { NextRequest,NextResponse } from "next/server";
import { currentUser } from "@/lib/guards";
import { getGoogleAccessToken } from "@/lib/sheets";
import { vidaBrochureFileIds } from "@/lib/vida-brochure-assets";
import { readVidaBrochureJpeg } from "@/lib/vida-brochure-download";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const phase=req.nextUrl.searchParams.get("phase");
  const page=req.nextUrl.searchParams.get("page");
  if(!["1","2"].includes(phase||""))return NextResponse.json({error:"Invalid phase"},{status:400});
  const filename=page==="master"?`p${phase}_master.jpg`:
    /^\d{1,2}$/.test(page||"")?`p${phase}_${String(Number(page)).padStart(2,"0")}.jpg`:"";
  const fileId=vidaBrochureFileIds[filename];
  if(!fileId)return NextResponse.json({error:"Unmapped brochure artwork"},{status:404});
  try{
    const token=await getGoogleAccessToken(user.id);
    const data=await readVidaBrochureJpeg(token,fileId);
    return new Response(new Uint8Array(data),{headers:{"Content-Type":"image/jpeg",
      "Cache-Control":"private, max-age=300","X-Content-Type-Options":"nosniff"}});
  }catch(e){
    return NextResponse.json({error:"Original drawing unavailable to this Google account"},
      {status:502,headers:{"Cache-Control":"private,no-store"}});
  }
}
