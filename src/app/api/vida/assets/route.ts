import { NextResponse } from "next/server";
import { currentUser } from "@/lib/guards";
import { getGoogleAccessToken } from "@/lib/sheets";
import { VIDA_BROCHURE_ASSET_DRIVE_ID } from "@/lib/vida-brochure";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const noStore={
  "Cache-Control":"private, no-store, max-age=0",
  "X-Content-Type-Options":"nosniff",
  "X-Robots-Tag":"noindex"
};
export async function GET(){
  const user=await currentUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401,headers:noStore});
  try{
    const token=await getGoogleAccessToken(user.id);
    const request=await fetch(
      "https://www.googleapis.com/drive/v3/files/"+
       encodeURIComponent(VIDA_BROCHURE_ASSET_DRIVE_ID)+"?alt=media",{
        headers:{Authorization:"Bearer "+token},
        cache:"no-store",
        signal:AbortSignal.timeout(18000)
      });
    if(!request.ok||!request.body)return NextResponse.json(
      {error:"Vida original brochure archive is inaccessible to the connected Google account (HTTP "+request.status+")."},
      {status:502,headers:noStore}
    );
    const length=Number(request.headers.get("content-length")||0);
    if(length>7_000_000)throw Error("Vida brochure archive exceeds size limit.");
    // Pass through the restricted read-only source file: do not render large
    // PDF pages or decompress 4MB of ZIP inside the Cloudflare CPU-limited Worker.
    return new Response(request.body,{
      headers:{...noStore,"Content-Type":"application/zip","Content-Disposition":"inline; filename=Vida-Brochure-Source.zip"}
    });
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Vida brochure archive unavailable"},
      {status:502,headers:noStore});
  }
}
