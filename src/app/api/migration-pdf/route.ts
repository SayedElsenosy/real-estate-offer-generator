import { createPropertyOfferPdf } from "@/lib/workers-pdf";
import { getCairoOfferLocation } from "@/lib/cairo-offer-location";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Temporary no-personal-data smoke test. Removed once rendering passes.
export async function GET(req:NextRequest) {
  try {
    const verifyMap=req.nextUrl.searchParams.get("map")==="1";
    const location=verifyMap?await getCairoOfferLocation("I/GR/SH/01B","Ground"):null;
    if(verifyMap&&!location)throw Error("Test floor map could not be loaded");
    const bytes = await createPropertyOfferPdf({
      company: "Elaf Development", project: verifyMap?"Cairo Plaza":"Runtime Test", location,
      issuedAt: "2026-10-28",
      unit: { code: verifyMap?"I/GR/SH/01B":"TEST-001", area: "125", floor: verifyMap?"Ground":"2", price: "7500000", status: "Available", project: "Cairo Plaza" },
      floor: null,
      schedules: [{
        name:"Monthly plan",durationMonths:24,installmentIntervalMonths:1,paymentCount:24,
        futureInstallmentCount:23,totalPrice:"7500000.00",downPayment:"750000.00",
        maintenance:"25000.00",maintenanceDueDate:"2027-06-28",deliveryMonths:12,deliveryDate:"2027-10-28",preDeliveryTotal:"2625000.00",postDeliveryTotal:"4875000.00",deliveryCollection:"0.00",
        deliveryCollectionPct:"0",totalIncludingMaintenance:"7525000.00",
        rows:[{number:1,type:"DOWN_PAYMENT",due:"2026-10-28",amount:"750000.00"},{number:2,type:"INSTALLMENT",due:"2027-01-28",amount:"964285.71"}]
      }]
    });
    return new Response(bytes as unknown as BodyInit, {status:200,
      headers:{"Content-Type":"application/pdf","Cache-Control":"no-store","Content-Disposition":"inline; filename=PDF-Engine-Test.pdf"}});
  } catch(e){
    console.error("[pdf-engine-smoke]",e instanceof Error ? e.name+": "+e.message : "Unknown error");
    return NextResponse.json({status:"failed"},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
