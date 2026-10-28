import { createPropertyOfferPdf } from "@/lib/workers-pdf";
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Temporary no-personal-data smoke test. Removed once rendering passes.
export async function GET() {
  try {
    const bytes = await createPropertyOfferPdf({
      company: "Property Development", project: "Runtime Test",
      issuedAt: "2026-10-28",
      unit: { code: "TEST-001", area: "125", floor: "2", price: "7500000", status: "Available", project: "Runtime Test" },
      floor: null,
      schedules: [{
        name:"Quarterly plan",durationMonths:24,installmentIntervalMonths:3,paymentCount:8,
        futureInstallmentCount:7,totalPrice:"7500000.00",downPayment:"750000.00",
        maintenance:"25000.00",deliveryDate:null,deliveryCollection:"0.00",
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
