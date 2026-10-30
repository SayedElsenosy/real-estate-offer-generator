import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont, type PDFImage } from "pdf-lib";
import Decimal from "decimal.js";
import { formatOfferMoney } from "@/lib/offer-money";
import { unitKey } from "@/lib/unit-code";
import type { PdfUnitLocation } from "@/lib/cairo-offer-location";
import type { NasaOfferLocation } from "@/lib/nasa-offer-location";
import type { InventoryUnit } from "@/lib/sheets";
import type { OfferSchedule, FloorGeometry } from "@/lib/pdf";

export type Props = { company:string; logoUrl?:string|null; project:string; unit:InventoryUnit; issuedAt:string;
  floor:FloorGeometry; location?:PdfUnitLocation|null; nasaLocation?:NasaOfferLocation|null; schedules:OfferSchedule[] };
const W=595.28,H=841.89, LEFT=43,RIGHT=W-43;
const navy=rgb(0.09,0.16,0.26), gold=rgb(0.70,0.53,0.29), gray=rgb(0.47,0.55,0.64),
  pale=rgb(0.94,0.96,0.98), white=rgb(1,1,1), line=rgb(0.88,0.91,0.94);
function ascii(value:unknown): string {
  const raw=String(value??"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"");
  // Built-in PDF fonts are WinAnsi only. Do not throw on Arabic/non-Latin
  // metadata: preserve stable ASCII fields and fallback for untranslated names.
  return raw.replace(/[^\x20-\x7E]/g," ").replace(/\s+/g," ").trim();
}
function printable(value:unknown, fallback="-") {return ascii(value)||fallback;}
function shorten(value:unknown, max=86) {
  const text=printable(value);return text.length>max ? text.slice(0,max-3)+"..." : text;
}
function header(page:PDFPage,company:string,title:string,sub:string,bold:PDFFont,regular:PDFFont,logo:PDFImage|null) {
  page.drawRectangle({x:0,y:H-118,width:W,height:118,color:navy});
  page.drawRectangle({x:LEFT,y:H-56,width:35,height:3,color:gold});
  page.drawText(shorten(company.toUpperCase(),48), {x:LEFT,y:H-43,size:11,font:bold,color:gold});
  page.drawText(shorten(title,30),{x:LEFT,y:H-83,size:25,font:bold,color:white});
  page.drawText(shorten(sub,68),{x:LEFT,y:H-104,size:9,font:regular,color:rgb(0.85,0.89,0.94)});
  if(logo){
    // Draw the original artwork directly on the navy header, without the
    // oversized white backing rectangle. The displayed footprint is exactly
    // the scaled logo dimensions (preserving its original aspect ratio).
    const r=Math.min(84/logo.width,76/logo.height);
    const width=logo.width*r, height=logo.height*r;
    page.drawImage(logo,{x:RIGHT-width,y:H-20-(76+height)/2,width,height});
  }
  page.drawText(shorten(company,72),{x:LEFT,y:36,size:8,font:regular,color:gray});
  page.drawText("Live inventory quotation  |  Subject to availability and contract",{
    x:LEFT,y:22,size:7.6,font:regular,color:gray
  });
}
function pair(page:PDFPage,label:string,value:unknown,y:number,regular:PDFFont,bold:PDFFont) {
  page.drawLine({start:{x:LEFT,y:y-13},end:{x:RIGHT,y:y-13},thickness:0.6,color:line});
  page.drawText(printable(label),{x:LEFT,y,size:10,font:regular,color:gray});
  const val=shorten(value,57);
  page.drawText(val,{x:RIGHT-bold.widthOfTextAtSize(val,11),y,size:11,font:bold,color:navy});
}
function tableHeader(page:PDFPage,y:number,bold:PDFFont) {
  page.drawRectangle({x:LEFT,y:y-8,width:RIGHT-LEFT,height:29,color:navy});
  for(const [txt,x] of [["NO.",LEFT+9],["DESCRIPTION",LEFT+60],["DUE DATE",LEFT+277],["AMOUNT (EGP)",LEFT+387]] as const)
    page.drawText(txt,{x,y:y+3,size:8.3,font:bold,color:white});
}
function row(page:PDFPage,index:number,values:string[],y:number,regular:PDFFont) {
  page.drawRectangle({x:LEFT,y:y-9,width:RIGHT-LEFT,height:23,color:index%2?white:pale});
  const xs=[LEFT+9,LEFT+60,LEFT+277,LEFT+387];
  const maxes=[6,34,12,17];
  values.forEach((value,i)=>page.drawText(shorten(value,maxes[i]),{
    x:xs[i],y:y-1,size:8.2,font:regular,color:navy
  }));
}
export async function embeddedLogo(pdf:PDFDocument,url?:string|null):Promise<PDFImage|null> {
  if(!url)return null;
  try {
    const data=/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(url);
    if(data) {
      const raw=atob(data[2]);
      if(raw.length>2_500_000)return null;
      const bytes=Uint8Array.from(raw,ch=>ch.charCodeAt(0));
      return data[1]==="png"?await pdf.embedPng(bytes):await pdf.embedJpg(bytes);
    }
    const parsed=new URL(url);
    const hostname=parsed.hostname.toLowerCase();
    const configured=(process.env.ALLOWED_LOGO_HOSTS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
    // Existing project logos are sourced from Facebook's read-only CDN.
    // Only explicitly configured hosts or known public image CDN hosts qualify.
    const allowed=hostname.endsWith(".fbcdn.net")||hostname==="fbcdn.net"||configured.includes(hostname);
    if(parsed.protocol!=="https:"||!allowed)return null;
    const response=await fetch(parsed.toString(),{redirect:"manual",cache:"no-store",
      signal:AbortSignal.timeout(6000)});
    if(!response.ok)return null;
    const type=(response.headers.get("content-type")||"").toLowerCase();
    if(!/image\/(jpeg|png)/.test(type))return null;
    if(Number(response.headers.get("content-length")||0)>2_500_000)return null;
    const bytes=new Uint8Array(await response.arrayBuffer());
    if(bytes.length>2_500_000)return null;
    return type.includes("png")?await pdf.embedPng(bytes):await pdf.embedJpg(bytes);
  }catch{return null;}
}
export function cairoLocation(page:PDFPage,plan:PdfUnitLocation) {
  const viewX=214,viewY=155;
  const frameW=RIGHT-LEFT-18,frameH=306;
  const scale=Math.min(frameW/viewX,frameH/viewY);
  const x=LEFT+9+(frameW-viewX*scale)/2;
  const y=327+326-10;
  // Draw underlying engineering CAD as native PDF vector paths.
  // svgPath automatically flips its Y axis to match SVG top-down coordinates.
  for(const line of plan.cadPaths){
    if(!/^\s*[Mm]/.test(line.d))continue;
    page.drawSvgPath(line.d,{x,y,scale,borderColor:rgb(0.73,0.77,0.80),borderWidth:0.045});
  }
  for(const unit of plan.unitPaths){
    if(unitKey(unit.code)===unitKey(plan.selectedCode))continue;
    page.drawSvgPath(unit.d,{x,y,scale,borderColor:rgb(0.20,0.41,0.43),borderWidth:0.12});
  }
  const selected=plan.unitPaths.find(u=>unitKey(u.code)===unitKey(plan.selectedCode));
  if(selected){
    page.drawSvgPath(selected.d,{x,y,scale,color:rgb(0.94,0.74,0.28),
      borderColor:rgb(0.61,0.34,0.09),borderWidth:0.65});
  }
}
/** Draw the PDF-derived NASA reference with its matching vector outline.
 * The geometry is illustrative only and is never used for saleable area.
 */
export async function drawNasaPdfLocation(pdf:PDFDocument,page:PDFPage,plan:NasaOfferLocation){
  const data=/^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(plan.image);
  if(!data)throw Error("NASA reference image is invalid");
  const bytes=Uint8Array.from(atob(data[1]),c=>c.charCodeAt(0));
  const image=await pdf.embedJpg(bytes);
  const frameWidth=RIGHT-LEFT-18,frameHeight=306;
  const scale=Math.min(frameWidth/image.width,frameHeight/image.height);
  const width=image.width*scale,height=image.height*scale;
  const x=LEFT+9+(frameWidth-width)/2;
  const y=337+(frameHeight-height)/2;
  page.drawImage(image,{x,y,width,height});
  // pdf-lib's SVG path coordinates run downward relative to x,y+height.
  page.drawSvgPath(plan.outline,{
    x,y:y+height,scale:width/792,color:rgb(0.96,0.74,0.33),
    opacity:0.60,borderColor:rgb(0.54,0.31,0.08),borderWidth:1.15
  });
}

export async function createPropertyOfferPdf({company,logoUrl,project,unit,issuedAt,floor,location,nasaLocation,schedules}:Props):Promise<Uint8Array> {
  const pdf=await PDFDocument.create();
  const regular=await pdf.embedFont(StandardFonts.Helvetica);
  const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo=await embeddedLogo(pdf,logoUrl);
  pdf.setTitle("Property Offer - "+printable(unit.code));
  pdf.setSubject("Live real estate offer; not stored by Offer Atelier");
  pdf.setAuthor(printable(company,"Offer Atelier"));
  pdf.setProducer("Offer Atelier / Cloudflare Workers");
  const intro=pdf.addPage([W,H]);
  header(intro,company,"PROPERTY OFFER",printable(project),bold,regular,logo);
  intro.drawRectangle({x:LEFT,y:H-191,width:RIGHT-LEFT,height:45,color:pale});
  intro.drawText("UNIT "+shorten(unit.code,40),{x:LEFT+18,y:H-174,size:19,font:bold,color:navy});
  pair(intro,"Offer date",issuedAt, H-225,regular,bold);
  pair(intro,"Project",project,H-269,regular,bold);
  pair(intro,"Unit code",unit.code,H-313,regular,bold);
  pair(intro,"Floor",unit.floor,H-357,regular,bold);
  pair(intro,"Area",unit.area ? unit.area+" sqm":"-",H-401,regular,bold);
  pair(intro,"Inventory status",unit.status,H-445,regular,bold);
  pair(intro,"UNIT PRICE","EGP "+formatOfferMoney(unit.price),H-489,regular,bold);
  const priceValue=new Decimal(String(unit.price).replace(/[,\s]/g,""));
  const cleanArea=String(unit.area||"").replace(/[,\s]/g,"");
  const areaValue=new Decimal(/^\d+(?:\.\d+)?$/.test(cleanArea)?cleanArea:"0");
  const sqmPrice=priceValue.isFinite()&&areaValue.isFinite()&&areaValue.gt(0)
    ?priceValue.div(areaValue).toDecimalPlaces(2,Decimal.ROUND_HALF_UP).toFixed(2):"—";
  pair(intro,"PRICE PER SQM","EGP "+formatOfferMoney(sqmPrice),H-533,regular,bold);
  intro.drawText("Prices and availability are rechecked against the live project source before issue.",{
    x:LEFT,y:195,font:regular,size:9,color:gray
  });
  intro.drawText("No quotation file, payment schedule or offer history is stored by the platform.",{
    x:LEFT,y:176,font:regular,size:9,color:gray
  });
  const map=pdf.addPage([W,H]);
  header(map,company,"UNIT LOCATION",printable(project)+"  /  "+printable(unit.code),bold,regular,logo);
  // Only approved engineering geometry can be represented as unit boundaries.
  // A source DWG alone does not certify automatically derived unit polygons.
  map.drawRectangle({x:LEFT,y:327,width:RIGHT-LEFT,height:326,color:pale,borderColor:line,borderWidth:1});
  if(location){
    cairoLocation(map,location);
  } else if(nasaLocation){
    await drawNasaPdfLocation(pdf,map,nasaLocation);
  } else if(floor && floor.shapes.length>0 && floor.backgroundData?.startsWith("data:image/")){
    try {
      const match=/^data:image\/(png|jpeg);base64,([\s\S]+)$/.exec(floor.backgroundData);
      if(match){
        const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));
        const asset=match[1]==="png"?await pdf.embedPng(bytes):await pdf.embedJpg(bytes);
        const ratio=Math.min((RIGHT-LEFT-18)/asset.width,306/asset.height);
        const w=asset.width*ratio,h=asset.height*ratio;
        map.drawImage(asset,{x:LEFT+9+((RIGHT-LEFT-18)-w)/2,y:337+(306-h)/2,width:w,height:h});
      }
    }catch {
      map.drawText("Engineering plan preview is not available in this PDF.",{
        x:LEFT+22,y:482,font:regular,size:11,color:gray
      });
    }
  } else {
    map.drawText("Engineering floor map is awaiting unit-boundary verification.",{
      x:LEFT+22,y:492,font:regular,size:11,color:navy
    });
    map.drawText("No unverified unit outlines or legacy PDF geometry are used.",{
      x:LEFT+22,y:467,font:regular,size:10,color:gray
    });
  }
  map.drawText("Floor: "+printable(unit.floor),{x:LEFT,y:291,font:bold,size:12,color:navy});
  map.drawText(nasaLocation ? "NASA outline is approximately traced from PDF; engineering verification required." : location?.reviewed ? "Highlighted outline is pending final engineering verification." :
    "Engineering drawing shown for location reference, not measurement.",{
    x:LEFT,y:265,font:regular,size:9,color:gray
  });
  for(const schedule of schedules){
    let page=pdf.addPage([W,H]);
    header(page,company,"PAYMENT SCHEDULE",printable(schedule.name)+" / UNIT "+printable(unit.code),bold,regular,logo);
    pair(page,"Term (down payment included)",schedule.durationMonths+" months",H-162,regular,bold);
    pair(page,"Payment cadence",schedule.installmentIntervalMonths===3?"Quarterly (every 3 months)":"Monthly",H-193,regular,bold);
    pair(page,"Payment slots",schedule.paymentCount,H-224,regular,bold);
    pair(page,"Unit price after discount ("+formatOfferMoney(schedule.discountPct)+"%)","EGP "+formatOfferMoney(schedule.totalPrice),H-255,regular,bold);
    pair(page,"Down payment"+(Number(schedule.secondDownPayment)>0?" + 2nd after "+schedule.secondDownOffsetMonths+" months":""),
      "EGP "+formatOfferMoney(schedule.downPayment)+(Number(schedule.secondDownPayment)>0?" + "+formatOfferMoney(schedule.secondDownPayment):""),H-286,regular,bold);
    pair(page,"Expected delivery",schedule.deliveryMonths>0 ? "After "+schedule.deliveryMonths+" months" : "Not specified",H-317,regular,bold);
    pair(page,"Total paid BEFORE delivery","EGP "+formatOfferMoney(schedule.preDeliveryTotal),H-348,regular,bold);
    pair(page,"Balance after delivery","EGP "+formatOfferMoney(schedule.postDeliveryTotal),H-379,regular,bold);
    pair(page,"Maintenance deposit","EGP "+formatOfferMoney(schedule.maintenance),H-410,regular,bold);
    pair(page,"Maintenance due",schedule.maintenanceDueDate||"-",H-441,regular,bold);
    pair(page,"Total with maintenance","EGP "+formatOfferMoney(schedule.totalIncludingMaintenance),H-472,regular,bold);
    let y=H-518;tableHeader(page,y,bold);y-=35;
    schedule.rows.forEach((entry,index)=>{
      if(y<85){
        page=pdf.addPage([W,H]);header(page,company,"PAYMENT SCHEDULE","CONTINUED / "+printable(unit.code),bold,regular,logo);
        y=H-160;tableHeader(page,y,bold);y-=36;
      }
      const type=entry.type==="DOWN_PAYMENT"?"DOWN PAYMENT":entry.type==="SECOND_DOWN_PAYMENT"?"SECOND DOWN PAYMENT":entry.type==="MAINTENANCE"?"MAINTENANCE":"INSTALLMENT";
      row(page,index,[entry.number===null?"-":String(entry.number),type,entry.due,formatOfferMoney(entry.amount)],y,regular);y-=23;
    });
  }
  return pdf.save({useObjectStreams:false});
}
