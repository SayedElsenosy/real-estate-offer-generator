import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/guards";
import { NASA_FLOORS,getNasaFloor,type NasaFloorKey } from "@/lib/nasa-floor-source";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest) {
  const user=await currentUser();
  if(!user) return NextResponse.json({error:"Unauthorized"}, {status:401,headers:{"Cache-Control":"no-store"}});
  const floor=req.nextUrl.searchParams.get("floor")||"0";
  if(!Object.hasOwn(NASA_FLOORS,floor))
    return NextResponse.json({error:"Invalid NASA floor"}, {status:400,headers:{"Cache-Control":"no-store"}});
  try {
    const data=await getNasaFloor(user.id,floor as NasaFloorKey);
    // Reference drawings are immutable; the live inventory uses a separate
    // 3-second revalidation API. Floor images are never public or indexed.
    return NextResponse.json(data,{headers:{
      "Cache-Control":"private, max-age=86400",
      "X-Robots-Tag":"noindex",
      "X-Nasa-Map-Source":"approximate-pdf-tracing"
    }});
  }catch(e){
    console.error("[nasa-plan]",e instanceof Error?e.message:"Unknown");
    return NextResponse.json({error:"NASA plan is currently unavailable. Verify the owner's Drive file permissions."},
      {status:502,headers:{"Cache-Control":"no-store"}});
  }
}
