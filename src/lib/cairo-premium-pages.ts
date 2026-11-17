import {rgb,type PDFDocument,type PDFPage,type PDFFont} from "pdf-lib";
import {drawArabicText} from "arabic-bidi-shaper/pdf-lib";
import type {InventoryUnit} from "@/lib/sheets";
import type {OfferSchedule} from "@/lib/pdf";
import {formatOfferMoney} from "@/lib/offer-money";
import {CAIRO_NAVY,CAIRO_GOLD,CAIRO_CREAM} from "@/lib/cairo-premium-pdf";

const W=595.28,H=841.89,LEFT=42,RIGHT=W-42;
const WHITE=rgb(1,1,1),INK=rgb(.09,.12,.15);
const MUTED=rgb(.43,.45,.45),LINE=rgb(.86,.84,.80),SOFT=rgb(.94,.93,.90);
const NUMERIC=rgb(.11,.13,.15);
export type PremiumFonts={latin:PDFFont;latinBold:PDFFont;arabic?:PDFFont;arabicBold?:PDFFont};
type Frame={x:number;y:number;width:number;height:number};
export type CairoPremiumDetails={
  fonts:PremiumFonts;language:"ar"|"en";company:string;unit:InventoryUnit;
  issuedAt:string;schedules:OfferSchedule[];
  drawEngineeringLocation?:(page:PDFPage,frame:Frame)=>void;
};

function latin(s:unknown):string{
 return String(s??"").normalize("NFKD").replace(/[^\x20-\x7e]/g," ")
   .replace(/\s+/g," ").trim();
}
function write(page:PDFPage,value:unknown,x:number,y:number,size:number,bold:boolean,fonts:PremiumFonts,
 color=INK,align:"left"|"right"="left",maxWidth?:number){
 let v=latin(value);
 const font=bold?fonts.latinBold:fonts.latin;
 if(!v)v="-";
 if(maxWidth){
   while(v.length>1&&font.widthOfTextAtSize(v,size)>maxWidth)v=v.slice(0,-2)+"…";
   v=v.replace(/…/g,".");
 }
 page.drawText(v,{x:align==="right"?x-font.widthOfTextAtSize(v,size):x,y,size,font,color});
}
function ar(page:PDFPage,value:string,right:number,y:number,size:number,bold:boolean,fonts:PremiumFonts,color=INK){
 const font=bold?fonts.arabicBold:fonts.arabic;
 if(font){
   drawArabicText(page,value,{x:right,y,size,font,color,align:"right"});
 }
}
function paragraph(page:PDFPage,en:string,arText:string,edge:number,y:number,
  size:number,bold:boolean,fonts:PremiumFonts,lang:"ar"|"en",color=INK){
 if(lang==="ar")ar(page,arText,edge,y,size,bold,fonts,color);
 else write(page,en,edge,y,size,bold,fonts,color);
}
function shell(pdf:PDFDocument,pageNo:number,titleAr:string,titleEn:string,subtitle:string,
 fonts:PremiumFonts,lang:"ar"|"en"):PDFPage{
 const p=pdf.addPage([W,H]);
 p.drawRectangle({x:0,y:0,width:W,height:H,color:CAIRO_CREAM});
 p.drawRectangle({x:0,y:H-102,width:W,height:102,color:CAIRO_NAVY});
 p.drawRectangle({x:0,y:H-104,width:W,height:2,color:CAIRO_GOLD});
 write(p,"ELAF",LEFT,H-48,26,true,fonts,WHITE);
 write(p,"D E V E L O P M E N T S",LEFT+1,H-64,6.7,false,fonts,CAIRO_GOLD);
 write(p,"CAIRO PLAZA",RIGHT,H-43,10,true,fonts,WHITE,"right");
 // A short gold flourish mirrors the approved four-page art direction.
 p.drawLine({start:{x:RIGHT-72,y:H-64},end:{x:RIGHT,y:H-64},thickness:2,color:CAIRO_GOLD});
 paragraph(p,titleEn,titleAr,lang==="ar"?RIGHT:LEFT,H-155,24,true,fonts,lang,INK);
 write(p,subtitle,LEFT,H-185,9,false,fonts,MUTED, "left",RIGHT-LEFT);
 // Independent page numbers are added after the full PDF is assembled.
 return p;
}
function box(p:PDFPage,x:number,y:number,w:number,h:number,dark=false){
 p.drawRectangle({x,y,width:w,height:h,color:dark?CAIRO_NAVY:WHITE,
  borderColor:dark?CAIRO_GOLD:LINE,borderWidth:dark?1:.7});
}
function meter(p:PDFPage,x:number,y:number,w:number,h:number,titleAr:string,titleEn:string,
 value:string,fonts:PremiumFonts,lang:"ar"|"en",dark=false){
 box(p,x,y,w,h,dark);
 p.drawRectangle({x:x+11,y:y+h-9,width:37,height:3,color:CAIRO_GOLD});
 const fg=dark?WHITE:INK;
 paragraph(p,titleEn,titleAr,lang==="ar"?x+w-12:x+12,y+h-30,9,false,fonts,lang,dark?WHITE:MUTED);
 write(p,value,lang==="ar"?x+w-13:x+13,y+17,17,true,fonts,fg,lang==="ar"?"right":"left",w-26);
}
function detail(p:PDFPage,y:number,titleAr:string,titleEn:string,value:string,fonts:PremiumFonts,lang:"ar"|"en"){
 p.drawLine({start:{x:LEFT+17,y:y-13},end:{x:RIGHT-17,y:y-13},thickness:.5,color:LINE});
 paragraph(p,titleEn,titleAr,lang==="ar"?RIGHT-18:LEFT+18,y,10,false,fonts,lang,MUTED);
 const x=lang==="ar"?LEFT+18:RIGHT-18;
 write(p,value,x,y,11,true,fonts,NUMERIC,lang==="ar"?"left":"right",235);
}
function formatMoney(v:unknown):string{
 try{return formatOfferMoney(String(v??"0"));}
 catch{return String(v??"-");}
}
function unitPage(pdf:PDFDocument,options:CairoPremiumDetails){
 const {fonts,language:lang,unit,issuedAt,drawEngineeringLocation}=options;
 const p=shell(pdf,3,"وحدتك داخل القاهرة بلازا","YOUR SPACE AT CAIRO PLAZA",
   "CAIRO PLAZA  /  "+latin(unit.code),fonts,lang);
 meter(p,LEFT,567,209,80,"كود الوحدة","UNIT CODE",latin(unit.code),fonts,lang,true);
 meter(p,LEFT+219,567,139,80,"الدور","FLOOR",latin(unit.floor),fonts,lang);
 meter(p,LEFT+368,567,RIGHT-LEFT-368,80,"المساحة","AREA",latin(unit.area)+" m2",fonts,lang);
 // The ORIGINAL CAD vector data remains the only selected-unit location source.
 box(p,LEFT+257,247,RIGHT-LEFT-257,303);
 p.drawRectangle({x:LEFT+257,y:516,width:RIGHT-LEFT-257,height:34,color:CAIRO_NAVY});
 paragraph(p,"UNIT ON THE APPROVED FLOOR PLAN","موقع الوحدة على الدور",lang==="ar"?RIGHT-9:LEFT+269,528,10,true,fonts,lang,WHITE);
 if(drawEngineeringLocation){
   drawEngineeringLocation(p,{x:LEFT+261,y:270,width:RIGHT-LEFT-265,height:245});
 }else{
   paragraph(p,"Engineering plan is not yet available.","مخطط الوحدة غير متوفر",lang==="ar"?RIGHT-12:LEFT+270,389,11,false,fonts,lang,MUTED);
 }
 box(p,LEFT,247,244,303);
 p.drawRectangle({x:LEFT,y:516,width:244,height:34,color:CAIRO_NAVY});
 paragraph(p,"PROPERTY DETAILS","بيانات الوحدة",lang==="ar"?LEFT+233:LEFT+11,528,11,true,fonts,lang,WHITE);
 // Short, well-spaced rows using the *live unit* values, not design placeholders.
 const info=[
   ["Offer date","تاريخ العرض",issuedAt],
   ["Project","المشروع","CAIRO PLAZA"],
   ["Floor","الدور",String(unit.floor||"-")],
   ["Unit area","مساحة الوحدة",String(unit.area||"-")+" m2"],
   ["Unit use","الاستخدام",latin(unit.type||"-")],
   ["Status","الحالة",lang==="ar"?"AVAILABLE":"AVAILABLE"]
 ] as const;
 for(let i=0;i<info.length;i++) {
   const [en,arabicName,value]=info[i];
   const yy=492-i*38;
   paragraph(p,en,arabicName,lang==="ar"?LEFT+230:LEFT+12,yy,9.2,false,fonts,lang,MUTED);
   write(p,value,lang==="ar"?LEFT+13:LEFT+230,yy,9.3,true,fonts,INK,lang==="ar"?"left":"right",127);
   if(i<info.length-1)p.drawLine({start:{x:LEFT+12,y:yy-12},end:{x:LEFT+232,y:yy-12},thickness:.4,color:LINE});
 }
 if(unit.foodPricing){
   // Verified independent prices from the SAME inventory row, never derived
   // from arbitrary area ratios or a different sheet.
   const a=unit.foodPricing;
   meter(p,LEFT,153,244,78,"سعر المتر الداخلي","INDOOR PRICE / M2",
     formatMoney(a.indoorRateEgp)+" EGP",fonts,lang);
   meter(p,LEFT+257,153,RIGHT-LEFT-257,78,"سعر المتر الخارجي","OUTDOOR PRICE / M2",
     formatMoney(a.outdoorRateEgp)+" EGP",fonts,lang);
   paragraph(p,"Indoor "+a.indoorAreaSqm+" m2  |  Outdoor "+a.outdoorAreaSqm+" m2",
     "المساحة الداخلية والخارجية منفصلتان",lang==="ar"?RIGHT:LEFT,132,9.1,false,fonts,lang,MUTED);
   meter(p,LEFT,65,RIGHT-LEFT,72,"إجمالي سعر الوحدة","TOTAL UNIT PRICE",
     formatMoney(unit.price)+" EGP",fonts,lang,true);
 }else{
   meter(p,LEFT,120,RIGHT-LEFT,111,"إجمالي سعر الوحدة","TOTAL UNIT PRICE",
      formatMoney(unit.price)+" EGP",fonts,lang,true);
 }
}
function rowTitle(p:PDFPage,y:number,fonts:PremiumFonts,lang:"ar"|"en"){
 p.drawRectangle({x:LEFT,y:y-8,width:RIGHT-LEFT,height:36,color:CAIRO_NAVY});
 const heads=lang==="ar"?
  [{x:RIGHT-14,v:"م"},{x:RIGHT-69,v:"نوع الدفعة"},{x:RIGHT-266,v:"تاريخ الاستحقاق"},{x:LEFT+159,v:"القيمة بالجنيه"}]:
  [{x:LEFT+9,v:"NO."},{x:LEFT+69,v:"PAYMENT TYPE"},{x:LEFT+285,v:"DUE DATE"},{x:LEFT+402,v:"AMOUNT (EGP)"}];
 for(const h of heads){
   if(lang==="ar")ar(p,h.v,h.x,y+4,9.7,true,fonts,WHITE);
   else write(p,h.v,h.x,y+4,8.7,true,fonts,WHITE);
 }
}
function paymentName(type:string,lang:"ar"|"en"){
 if(lang==="ar")return type==="DOWN_PAYMENT"?"المقدم":type==="SECOND_DOWN_PAYMENT"?"المقدم الثاني":
   type==="MAINTENANCE"?"وديعة الصيانة": "قسط";
 return type==="DOWN_PAYMENT"?"DOWN PAYMENT":type==="SECOND_DOWN_PAYMENT"?"SECOND DEPOSIT":
   type==="MAINTENANCE"?"MAINTENANCE DEPOSIT":"INSTALLMENT";
}
function paymentRow(p:PDFPage,y:number,i:number,item:OfferSchedule["rows"][number],
 fonts:PremiumFonts,lang:"ar"|"en"){
 const stripe=i%2===0?WHITE:SOFT;
 p.drawRectangle({x:LEFT,y:y-13,width:RIGHT-LEFT,height:27,color:stripe});
 p.drawLine({start:{x:LEFT,y:y-13},end:{x:RIGHT,y:y-13},color:LINE,thickness:.4});
 const no=item.number==null?"-":String(item.number);
 const due=item.due||"-";
 const sum=formatMoney(item.amount);
 if(lang==="ar"){
   write(p,no,RIGHT-11,y-3,9.5,true,fonts,INK,"right");
   ar(p,paymentName(item.type,lang),RIGHT-72,y-3,10,false,fonts,INK);
   write(p,due,RIGHT-270,y-3,9.2,false,fonts,INK,"right");
   write(p,sum,LEFT+150,y-3,10,true,fonts,INK,"right");
 }else{
   write(p,no,LEFT+11,y-3,9,false,fonts,INK);
   write(p,paymentName(item.type,lang),LEFT+70,y-3,9,false,fonts,INK);
   write(p,due,LEFT+281,y-3,9,false,fonts,INK);
   write(p,sum,RIGHT-12,y-3,10,true,fonts,INK,"right");
 }
}
function financialPages(pdf:PDFDocument,options:CairoPremiumDetails){
 const {fonts,language:lang,schedules,unit}=options;
 for(const [index,s]of schedules.entries()){
   let page=shell(pdf,0,"الخطة المالية","FINANCIAL PLAN",
     "CAIRO PLAZA  /  "+latin(unit.code)+"  /  "+latin(s.name),fonts,lang);
   // Summary cards echo the approved mockup and are drawn on every first page only.
   const thirds=(RIGHT-LEFT-20)/3;
   meter(page,LEFT,595,thirds,86,"كود الوحدة","UNIT CODE",latin(unit.code),fonts,lang);
   meter(page,LEFT+thirds+10,595,thirds,86,"إجمالي سعر الوحدة","TOTAL PRICE",
     formatMoney(s.totalPrice)+" EGP",fonts,lang);
   meter(page,LEFT+2*(thirds+10),595,thirds,86,"وديعة الصيانة","MAINTENANCE",
     formatMoney(s.maintenance)+" EGP",fonts,lang);
   rowTitle(page,555,fonts,lang);
   let y=510;let continuation=0;
   s.rows.forEach((item,i)=>{
     if(y<111){
       continuation++;
       page=shell(pdf,0,"استكمال الخطة المالية","PAYMENT PLAN / CONTINUED",
         "CAIRO PLAZA  /  "+latin(unit.code)+"  /  "+latin(s.name),fonts,lang);
       rowTitle(page,657,fonts,lang);y=611;
     }
     paymentRow(page,y,i,item,fonts,lang);
     y-=27;
   });
   // The final maintenance row from the payment engine has no due date
   // and stays at the bottom of the financial schedule, not a dated installment.
 }
}
export function addCairoPremiumDetailPages(pdf:PDFDocument,details:CairoPremiumDetails){
 unitPage(pdf,details);
 financialPages(pdf,details);
}
