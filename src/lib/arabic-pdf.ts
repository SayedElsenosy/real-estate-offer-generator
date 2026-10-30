import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont, type PDFImage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { drawArabicText } from "arabic-bidi-shaper/pdf-lib";
import plexRegular from "@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-400-normal.woff?inline";
import plexBold from "@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-700-normal.woff?inline";
import Decimal from "decimal.js";
import { formatOfferMoney } from "@/lib/offer-money";
import { cairoLocation,drawNasaPdfLocation, embeddedLogo, type Props } from "@/lib/workers-pdf";

const W=595.28,H=841.89,LEFT=47,RIGHT=W-47;
const navy=rgb(0.085,0.16,0.26),gold=rgb(0.72,0.55,0.31);
const gray=rgb(0.40,0.46,0.55),pale=rgb(0.955,0.968,0.981),
  white=rgb(1,1,1),border=rgb(0.87,0.90,0.94),ink=rgb(0.11,0.21,0.32);

function latin(value:unknown):string {
  return String(value??"").replace(/[^\x20-\x7e]/g," ").replace(/\s+/g," ").trim()||"-";
}
const amount = formatOfferMoney;
function fontBytes(encoded:string):Uint8Array {
  if(!encoded.startsWith("data:")||!encoded.includes(","))throw Error("Arabic font not embedded");
  return Uint8Array.from(atob(encoded.slice(encoded.indexOf(",")+1)),c=>c.charCodeAt(0));
}
type Fonts={arabic:PDFFont;arabicBold:PDFFont;latin:PDFFont;latinBold:PDFFont};
// Keep Arabic phrases separate from numbers, currency symbols and Latin
// identifiers. Arabic subset font files do not contain every Latin glyph.
// Mixed-script runs can otherwise introduce missing-glyph squares into PDFs.
function ar(page:PDFPage,text:string,right:number,y:number,font:PDFFont,size=11,color=ink) {
  drawArabicText(page,text,{x:right,y,font,size,color,align:"right"});
}
function en(page:PDFPage,text:unknown,x:number,y:number,font:PDFFont,size=10,color=ink) {
  page.drawText(latin(text),{x,y,size,font,color});
}
function enRight(page:PDFPage,text:unknown,x:number,y:number,font:PDFFont,size=10,color=ink) {
  const v=latin(text);page.drawText(v,{x:x-font.widthOfTextAtSize(v,size),y,size,font,color});
}
function projectArabic(name:string):string {
  const known:Record<string,string>={"cairo plaza":"كايرو بلازا","aqmar":"أقمار","kawn":"كون","nasa":"ناسا","vida":"فيدا"};
  return known[name.trim().toLowerCase()]||name;
}
function heading(page:PDFPage,company:string,title:string,sub:string,logo:PDFImage|null,f:Fonts){
  page.drawRectangle({x:0,y:H-126,width:W,height:126,color:navy});
  page.drawRectangle({x:RIGHT-43,y:H-47,width:43,height:3,color:gold});
  if(/[\u0600-\u06ff]/.test(company))ar(page,company,RIGHT,H-35,f.arabicBold,11.5,gold);
  else enRight(page,company.toUpperCase(),RIGHT,H-35,f.latinBold,10.5,gold);
  ar(page,title,RIGHT,H-84,f.arabicBold,25,white);
  if(/[\u0600-\u06ff]/.test(sub))ar(page,sub,RIGHT,H-110,f.arabic,12,white);
  else enRight(page,sub,RIGHT,H-110,f.latin,11,white);
  if(logo){
    const scale=Math.min(80/logo.width,78/logo.height);
    const width=logo.width*scale,height=logo.height*scale;
    page.drawImage(logo,{x:LEFT,y:H-24-(78+height)/2,width,height});
  }
  page.drawLine({start:{x:LEFT,y:61},end:{x:RIGHT,y:61},color:border,thickness:0.7});
  ar(page,"عرض استرشادي يخضع لتوافر الوحدة والأسعار المعتمدة وقت التعاقد",
    RIGHT,43,f.arabic,9,gray);
  ar(page,"لا يتم حفظ عروض الأسعار أو جداول السداد بعد التنزيل",
    RIGHT,26,f.arabic,9,gray);
}
function pair(page:PDFPage,label:string,value:unknown,y:number,f:Fonts,
  asArabic=false){
  page.drawLine({start:{x:LEFT,y:y-14},end:{x:RIGHT,y:y-14},
    thickness:0.7,color:border});
  ar(page,label,RIGHT-4,y,f.arabic,11,gray);
  if(asArabic){
    const text=String(value??"-");
    if(/[\u0600-\u06ff]/.test(text)){
      ar(page,text,LEFT+224,y,f.arabicBold,12,ink);
    }else en(page,text,LEFT+5,y,f.latinBold,11,ink);
  }else en(page,value,LEFT+5,y,f.latinBold,11.3,ink);
}
function card(page:PDFPage,x:number,y:number,width:number,label:string,value:string,f:Fonts){
  page.drawRectangle({x,y,width,height:64,color:pale,borderColor:border,borderWidth:0.8});
  page.drawRectangle({x:x+width-3,y:y+9,width:3,height:45,color:gold});
  ar(page,label,x+width-15,y+41,f.arabic,11,gray);
  enRight(page,value,x+width-14,y+13,f.latinBold,16,ink);
}
function tableHeader(page:PDFPage,y:number,f:Fonts){
  page.drawRectangle({x:LEFT,y:y-11,width:RIGHT-LEFT,height:33,color:navy});
  ar(page,"م",RIGHT-14,y+1,f.arabicBold,11,white);
  ar(page,"نوع الدفعة",RIGHT-79,y+1,f.arabicBold,11,white);
  ar(page,"تاريخ الاستحقاق",RIGHT-253,y+1,f.arabicBold,11,white);
  ar(page,"القيمة بالجنيه",LEFT+172,y+1,f.arabicBold,11,white);
}
function payRow(page:PDFPage,i:number,
  payment:Props["schedules"][number]["rows"][number],y:number,f:Fonts){
  if(i%2===0)page.drawRectangle({x:LEFT,y:y-11,width:RIGHT-LEFT,height:27,color:pale});
  else page.drawLine({start:{x:LEFT,y:y-11},end:{x:RIGHT,y:y-11},
    color:border,thickness:0.35});
  const name=payment.type==="DOWN_PAYMENT"?"المقدم":payment.type==="SECOND_DOWN_PAYMENT"?"المقدم الثاني":payment.type==="MAINTENANCE"?"وديعة الصيانة":"قسط";
  enRight(page,payment.number??"-",RIGHT-14,y-2,f.latin,10,ink);
  ar(page,name,RIGHT-80,y-2,f.arabic,11,ink);
  enRight(page,payment.due,RIGHT-252,y-2,f.latin,10.2,ink);
  en(page,amount(payment.amount),LEFT+13,y-2,f.latinBold,10.5,ink);
}
export async function createArabicOfferPdf({
  company,logoUrl,project,unit,issuedAt,floor,location,nasaLocation,schedules
}:Props):Promise<Uint8Array>{
  const pdf=await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const f:Fonts={
    arabic:await pdf.embedFont(fontBytes(plexRegular),{subset:true}),
    arabicBold:await pdf.embedFont(fontBytes(plexBold),{subset:true}),
    latin:await pdf.embedFont(StandardFonts.Helvetica),
    latinBold:await pdf.embedFont(StandardFonts.HelveticaBold)
  };
  const logo=await embeddedLogo(pdf,logoUrl);
  pdf.setTitle("عرض سعر وحدة - "+unit.code);
  pdf.setAuthor(company);
  pdf.setSubject("عرض سعر وحدة باللغة العربية");
  pdf.setProducer("Offer Atelier / Cloudflare Workers");

  const intro=pdf.addPage([W,H]);
  heading(intro,company,"عرض سعر وحدة",projectArabic(project),logo,f);
  intro.drawRectangle({x:LEFT,y:H-192,width:RIGHT-LEFT,height:48,color:pale});
  ar(intro,"بيانات الوحدة",RIGHT-16,H-174,f.arabicBold,17,ink);
  en(intro,unit.code,LEFT+16,H-175,f.latinBold,15,ink);
  pair(intro,"تاريخ العرض",issuedAt,H-229,f);
  pair(intro,"المشروع",projectArabic(project),H-273,f,true);
  pair(intro,"كود الوحدة",unit.code,H-317,f);
  pair(intro,"الدور",unit.floor,H-361,f);
  pair(intro,"المساحة بالمتر المربع",unit.area||"-",H-405,f);
  pair(intro,"حالة الوحدة","متاحة",H-449,f,true);
  pair(intro,"سعر الوحدة بالجنيه",amount(unit.price),H-493,f);
  let priceSqm="-";
  try{
    const price=new Decimal(String(unit.price).replace(/,/g,""));
    const area=new Decimal(String(unit.area).replace(/,/g,""));
    if(price.isFinite()&&area.isFinite()&&area.gt(0))priceSqm=amount(price.div(area));
  }catch{}
  pair(intro,"سعر المتر المربع بالجنيه",priceSqm,H-537,f);
  ar(intro,"تم استخراج بيانات السعر والمساحة من مصدر المخزون الحالي",
    RIGHT,186,f.arabic,11,gray);

  const planPage=pdf.addPage([W,H]);
  heading(planPage,company,"موقع الوحدة على المخطط",projectArabic(project),logo,f);
  planPage.drawRectangle({x:LEFT,y:327,width:RIGHT-LEFT,height:326,
    color:pale,borderColor:border,borderWidth:0.8});
  if(location)cairoLocation(planPage,location);
  else if(nasaLocation) await drawNasaPdfLocation(pdf,planPage,nasaLocation);
  else if(floor?.backgroundData?.startsWith("data:image/")){
    try{
      const match=/^data:image\/(png|jpeg);base64,([\s\S]+)$/.exec(floor.backgroundData);
      if(match){
        const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));
        const image=match[1]==="png"?await pdf.embedPng(bytes):await pdf.embedJpg(bytes);
        const factor=Math.min((RIGHT-LEFT-20)/image.width,306/image.height);
        const iw=image.width*factor,ih=image.height*factor;
        planPage.drawImage(image,{x:LEFT+10+(RIGHT-LEFT-20-iw)/2,
          y:337+(306-ih)/2,width:iw,height:ih});
      }
    }catch{ar(planPage,"تعذرت معاينة المخطط",RIGHT-20,485,f.arabic,13);}
  }else ar(planPage,"مخطط الوحدة غير متوفر",RIGHT-20,485,f.arabic,13);
  ar(planPage,"الوحدة المحددة على المخطط",RIGHT,287,f.arabicBold,13);
  en(planPage,unit.code,LEFT,287,f.latinBold,11);
  ar(planPage,nasaLocation
    ?"حدود وحدة ناسا تقريبية من صور PDF وتحتاج مراجعة هندسية"
    :location?.reviewed
    ?"حدود الوحدة المعروضة قيد الاعتماد الهندسي النهائي"
    :"المخطط لتحديد الموقع ولا يعتمد عليه في حساب المساحة",
    RIGHT,263,f.arabic,10,gray);

  for(const schedule of schedules){
    let page=pdf.addPage([W,H]);
    heading(page,company,"جدول سداد الوحدة",schedule.name,logo,f);
    const cw=(RIGHT-LEFT-12)/2;
    card(page,LEFT,630,cw,Number(schedule.discountPct)>0?"السعر بعد الخصم":"سعر الوحدة",amount(schedule.totalPrice),f);
    card(page,LEFT+cw+12,630,cw,"المقدم",amount(schedule.downPayment),f);
    card(page,LEFT,552,cw,schedule.deliveryMonths>0?"المسدد حتى الاستلام":"إجمالي المقدم",amount(schedule.preDeliveryTotal),f);
    card(page,LEFT+cw+12,552,cw,schedule.deliveryMonths>0?"المتبقي بعد الاستلام":"المتبقي بالتقسيط",amount(schedule.postDeliveryTotal),f);
    pair(page,"مدة التقسيط شاملة المقدم",schedule.durationMonths,514,f);
    // Second deposit appears as its own dated row in the schedule below.
    pair(page,"دورية الأقساط",schedule.installmentIntervalMonths===3?
      "ربع سنوية":"شهرية",483,f,true);
    pair(page,"موعد الاستلام بعد عدد الشهور",schedule.deliveryMonths||"-",452,f);
    pair(page,"قيمة وديعة الصيانة",amount(schedule.maintenance),421,f);
    pair(page,"تاريخ وديعة الصيانة",schedule.maintenanceDueDate||"-",390,f);
    pair(page,"الإجمالي شاملا الصيانة",amount(schedule.totalIncludingMaintenance),359,f);
    let y=316;
    tableHeader(page,y,f);y-=38;
    for(let i=0;i<schedule.rows.length;i++){
      if(y<91){
        page=pdf.addPage([W,H]);
        heading(page,company,"استكمال جدول الأقساط",unit.code,logo,f);
        y=675;
        tableHeader(page,y,f);y-=39;
      }
      payRow(page,i,schedule.rows[i],y,f);
      y-=27;
    }
  }
  return pdf.save({useObjectStreams:false});
}
