import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getLiveInventory, isAvailable } from "@/lib/sheets";
import { calculateSchedule } from "@/lib/payment";
import { createPropertyOfferPdf } from "@/lib/workers-pdf";
import { getCairoOfferLocation } from "@/lib/cairo-offer-location";
import { unitKey } from "@/lib/unit-code";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const NO_STORE={"Cache-Control":"no-store"};

async function authorized(req:NextRequest):Promise<boolean>{
  const secret=process.env.OFFER_LOAD_TEST_SECRET;
  const header=req.headers.get("authorization")||"";
  if(!secret||secret.length<48||!header.startsWith("Bearer "))return false;
  const input=header.slice(7);
  const data=new TextEncoder();
  const key=await crypto.subtle.importKey("raw",data.encode(secret),
    {name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const expected=new Uint8Array(await crypto.subtle.sign("HMAC",key,data.encode("offer-load-test")));
  const actual=new Uint8Array(await crypto.subtle.sign("HMAC",key,data.encode(
    input===secret?"offer-load-test":"not-authorized")));
  return expected.every((v,i)=>v===actual[i]);
}
// Temporary credential-gated load test, to be removed immediately after the
// user's one-time 100-request benchmark. No quotation files or snapshots saved.
// Uses the same Google Drive, Neon, payment engine, and CAD-backed PDF generator
// as the real offer flow; no fabricated inventory/prices and no public access.
export async function POST(req:NextRequest){
  if(!(await authorized(req)))return NextResponse.json({error:"Not Found"},{status:404,headers:NO_STORE});
  try{
    const project=await db().project.findUnique({where:{id:"cairo-plaza"},
      select:{id:true,name:true,companyName:true,spreadsheetId:true,sheetRange:true}});
    if(!project?.spreadsheetId)throw Error("project_configuration");
    const ownerEmail=process.env.SHARED_ACCESS_OWNER_EMAIL;
    if(!ownerEmail)throw Error("owner_configuration");
    const user=await db().user.findFirst({where:{
      email:{equals:ownerEmail,mode:"insensitive"}},select:{id:true}});
    if(!user)throw Error("owner_not_found");
    const inventory=await getLiveInventory(user.id,project.spreadsheetId,project.sheetRange,project.name);
    const unit=inventory.find(u=>isAvailable(u.status) && u.code && u.price);
    if(!unit)throw Error("no_available_units");
    const plan=await db().paymentPlan.findFirst({where:{projectId:project.id}});
    if(!plan)throw Error("no_payment_plan");
    const date=new Date();
    const maintenanceDueDate=new Date(Date.UTC(
      date.getUTCFullYear(),date.getUTCMonth()+6,date.getUTCDate())).toISOString().slice(0,10);
    const schedule=calculateSchedule(unit.price,{
      name:plan.name,months:plan.months,
      downPaymentPct:plan.downPaymentPct.toString(),
      maintenancePct:plan.maintenancePct.toString(),
      deliveryMonths:plan.deliveryMonths??undefined,
      deliveryCollectionEnabled:plan.deliveryCollectionEnabled,
      deliveryCollectionPct:plan.deliveryCollectionPct.toString(),
      startOffsetMonths:plan.startOffsetMonths,
      maintenanceDueDate
    },date);
    const location=await getCairoOfferLocation(unit.code,unit.floor);
    const bytes=await createPropertyOfferPdf({
      company:project.companyName,project:project.name,
      unit,issuedAt:date.toISOString().slice(0,10),
      floor:null,location,schedules:[schedule]
    });
    return new Response(new Uint8Array(bytes),{
      headers:{"Content-Type":"application/pdf","Cache-Control":"no-store",
        "X-Load-Test":"true","X-File-Length":String(bytes.byteLength)}
    });
  }catch(e){
    console.error("[offer-load-test]",e instanceof Error?e.name+":"+e.message:"Unknown");
    return NextResponse.json({error:"Temporary load test operation failed"},{status:503,headers:NO_STORE});
  }
}
