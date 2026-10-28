import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont, type PDFImage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { drawArabicText } from "arabic-bidi-shaper/pdf-lib";
import cairoRegular from "@fontsource/cairo/files/cairo-arabic-400-normal.woff?inline";
import cairoBold from "@fontsource/cairo/files/cairo-arabic-700-normal.woff?inline";
import Decimal from "decimal.js";
import { cairoLocation, embeddedLogo, type Props } from "@/lib/workers-pdf";

const W=595.28,H=841.89,LEFT=44,RIGHT=W-44;
const navy=rgb(0.09,0.16,0.26),gold=rgb(0.70,0.53,0.29);
const gray=rgb(0.43,0.51,0.61),pale=rgb(0.94,0.96,0.98),white=rgb(1,1,1);
const line=rgb(0.87,0.91,0.94);

function latin(raw:unknown):string {
  return String(raw??"").replace(/[^\x20-\x7E]/g," ").replace(/\s+/g," ").trim()||"-";
}
function date(raw:unknown):string { return String(raw??"") || "—"; }
function amount(raw:unknown):string {
  try {return new Decimal(String(raw).replace(/,/g,"")).toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g,",");} catch {return "-";}
}
function rawFont(encoded:string):Uint8Array {
  const payload=encoded.slice(encoded.indexOf(",")+1);
  if(!/^data:/i.test(encoded)||!payload)throw Error("Embedded Arabic PDF font missing");
  return Uint8Array.from(atob(payload),ch=>ch.charCodeAt(0));
}
type FontSet={regular:PDFFont;bold:PDFFont;latin:PDFFont;latinBold:PDFFont};
function arabic(page:PDFPage,value:string,x:number,y:number,font:PDFFont,size=11,color=navy) {
  // The bidi adapter handles word order, punctuation, and joining while the
  // self-hosted Cairo font supplies Unicode Arabic glyphs.
  drawArabicText(page,value,{x,y,font,size,color,align:"right"});
}
function ltr(page:PDFPage,value:unknown,x:number,y:number,font:PDFFont,size=10,color=navy) {
  page.drawText(latin(value),{x,y,font,size,color});
}
function rightLatin(page:PDFPage,value:unknown,x:number,y:number,font:PDFFont,size=11,color=navy) {
  const s=latin(value);page.drawText(s,{x:x-font.widthOfTextAtSize(s,size),y,font,size,color});
}
function projectName(value:string):string {
  const names:Record<string,string>={
    "cairo plaza":"كايرو بلازا","aqmar":"أقمار","kawn":"كون","nasa":"ناسا","vida":"فيدا"
  };
  return names[value.trim().toLowerCase()]||value;
}
function header(page:PDFPage,company:string,title:string,subtitle:string,
  logo:PDFImage|null,fonts:FontSet){
  page.drawRectangle({x:0,y:H-118,width:W,height:118,color:navy});
  page.drawRectangle({x:RIGHT-36,y:H-56,width:36,height:3,color:gold});
  arabic(page,title,RIGHT,H-82,fonts.bold,23,white);
  if(/[\u0600-\u06ff]/.test(subtitle))arabic(page,subtitle,RIGHT,H-104,fonts.regular,10,white);
  else rightLatin(page,subtitle,RIGHT,H-105,fonts.latin,10,white);
  const companyLabel=/[\u0600-\u06ff]/.test(company)?company:latin(company).toUpperCase();
  if(/[\u0600-\u06ff]/.test(companyLabel))arabic(page,companyLabel,RIGHT,H-43,fonts.bold,11,gold);
  else rightLatin(page,companyLabel,RIGHT,H-43,fonts.latinBold,10,gold);
  if(logo){
    const scale=Math.min(82/logo.width,74/logo.height);
    const width=logo.width*scale,height=logo.height*scale;
    page.drawImage(logo,{x:LEFT,y:H-20-(74+height)/2,width,height});
  }
  arabic(page,"عرض استرشادي يخضع لتوافر الوحدة والأسعار المعتمدة وقت التعاقد",RIGHT,34,
    fonts.regular,8,gray);
  arabic(page,"لا يتم حفظ عروض الأسعار أو جداول السداد بعد التنزيل",RIGHT,20,
    fonts.regular,8,gray);
}
function rowPair(page:PDFPage,label:string,value:unknown,y:number,fonts:FontSet,
  kind:"latin"|"arabic"="latin"){
  page.drawLine({start:{x:LEFT,y:y-14},end:{x:RIGHT,y:y-14},thickness:0.5,color:line});
  arabic(page,label,RIGHT,y,fonts.regular,10,gray);
  if(kind==="arabic"){
    // For Arabic values align them after the left edge of the field.
    const s=String(value??"-");
    const estimate=Math.min(fonts.bold.widthOfTextAtSize(s,11),225);
    arabic(page,s,LEFT+Math.max(estimate,80),y,fonts.bold,11,navy);
  }else ltr(page,value,LEFT,y,fonts.latinBold,10.3,navy);
}
function tableHeading(page:PDFPage,y:number,fonts:FontSet){
  page.drawRectangle({x:LEFT,y:y-9,width:RIGHT-LEFT,height:30,color:navy});
  arabic(page,"م",RIGHT-15,y+3,fonts.bold,9,white);
  arabic(page,"نوع الدفعة",RIGHT-63,y+3,fonts.bold,9,white);
  arabic(page,"تاريخ الاستحقاق",RIGHT-258,y+3,fonts.bold,9,white);
  arabic(page,"القيمة بالجنيه",LEFT+154,y+3,fonts.bold,9,white);
}
function paymentRow(page:PDFPage,n:number,entry:Props["schedules"][number]["rows"][number],y:number,fonts:FontSet){
  if(n%2===0)page.drawRectangle({x:LEFT,y:y-9,width:RIGHT-LEFT,height:24,color:pale});
  const typ=entry.type==="DOWN_PAYMENT"?"المقدم":entry.type==="MAINTENANCE"?"وديعة الصيانة":"قسط شهري";
  rightLatin(page,entry.number===null?"-":String(entry.number),RIGHT-14,y-1,fonts.latin,9);
  arabic(page,typ,RIGHT-63,y-1,fonts.regular,9,navy);
  ltr(page,date(entry.due),LEFT+176,y-1,fonts.latin,9,navy);
  ltr(page,amount(entry.amount),LEFT+8,y-1,fonts.latinBold,9,navy);
}
export async function createArabicOfferPdf({
  company,logoUrl,project,unit,issuedAt,floor,location,schedules
}:Props):Promise<Uint8Array> {
  const pdf=await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fonts:FontSet={
    regular:await pdf.embedFont(rawFont(cairoRegular),{subset:true}),
    bold:await pdf.embedFont(rawFont(cairoBold),{subset:true}),
    latin:await pdf.embedFont(StandardFonts.Helvetica),
    latinBold:await pdf.embedFont(StandardFonts.HelveticaBold)
  };
  const logo=await embeddedLogo(pdf,logoUrl);
  pdf.setTitle("عرض سعر عقاري - "+unit.code);
  pdf.setAuthor(company);
  pdf.setSubject("عرض سعر عقاري باللغة العربية، بدون تخزين");
  pdf.setProducer("Offer Atelier / Cloudflare Workers");
  const intro=pdf.addPage([W,H]);
  header(intro,company,"عرض سعر عقاري",projectName(project),logo,fonts);
  intro.drawRectangle({x:LEFT,y:H-190,width:RIGHT-LEFT,height:45,color:pale});
  arabic(intro,"بيانات الوحدة",RIGHT-15,H-174,fonts.bold,16,navy);
  ltr(intro,unit.code,LEFT+16,H-174,fonts.latinBold,14,navy);
  rowPair(intro,"تاريخ العرض",issuedAt,H-225,fonts);
  rowPair(intro,"المشروع",projectName(project),H-269,fonts,"arabic");
  rowPair(intro,"كود الوحدة",unit.code,H-313,fonts);
  rowPair(intro,"الدور",unit.floor,H-357,fonts);
  rowPair(intro,"المساحة بالمتر المربع",unit.area||"-",H-401,fonts);
  rowPair(intro,"حالة الوحدة","متاحة",H-445,fonts,"arabic");
  rowPair(intro,"إجمالي سعر الوحدة (جنيه)",amount(unit.price),H-489,fonts);
  let sqm="-";
  try {
    const priceValue=new Decimal(String(unit.price).replace(/[,\s]/g,""));
    const areaValue=new Decimal(String(unit.area).replace(/[,\s]/g,""));
    if(priceValue.isFinite()&&areaValue.isFinite()&&areaValue.gt(0))
      sqm=amount(priceValue.div(areaValue).toFixed(2));
  } catch {}
  rowPair(intro,"سعر المتر المربع (جنيه)",sqm,H-533,fonts);
  arabic(intro,"تتم مراجعة السعر والتوافر من المصدر المباشر عند إصدار العرض",RIGHT,188,fonts.regular,10,gray);
  const map=pdf.addPage([W,H]);
  header(map,company,"موقع الوحدة على المخطط",projectName(project),logo,fonts);
  map.drawRectangle({x:LEFT,y:327,width:RIGHT-LEFT,height:326,color:pale,borderColor:line,borderWidth:0.7});
  if(location){
    cairoLocation(map,location);
  }else if(floor?.backgroundData?.startsWith("data:image/")){
    try {
      const match=/^data:image\/(png|jpeg);base64,([\s\S]+)$/.exec(floor.backgroundData);
      if(match){
        const bytes=Uint8Array.from(atob(match[2]),ch=>ch.charCodeAt(0));
        const image=match[1]==="png"?await pdf.embedPng(bytes):await pdf.embedJpg(bytes);
        const ratio=Math.min((RIGHT-LEFT-20)/image.width,306/image.height);
        const width=image.width*ratio,height=image.height*ratio;
        map.drawImage(image,{x:LEFT+10+(RIGHT-LEFT-20-width)/2,y:337+(306-height)/2,width,height});
      }
    }catch{
      arabic(map,"تعذرت معاينة المخطط",RIGHT-18,490,fonts.regular,12);
    }
  }else{
    arabic(map,"لا تتوفر حدود معتمدة لهذه الوحدة بالمخطط",RIGHT-20,490,fonts.regular,11);
  }
  arabic(map,"موقع الوحدة المحددة",RIGHT,287,fonts.bold,12);
  ltr(map,unit.code,LEFT,288,fonts.latinBold,10);
  arabic(map,location?.reviewed
    ?"الحدود المظللة قابلة للعرض وتنتظر الاعتماد الهندسي النهائي"
    :"المخطط لتحديد الموقع فقط ولا يُستخدم لحساب المساحة",RIGHT,263,fonts.regular,9,gray);
  for(const schedule of schedules){
    let page=pdf.addPage([W,H]);
    header(page,company,"جدول الأقساط",schedule.name,logo,fonts);
    rowPair(page,"مدة التقسيط شاملة المقدم",String(schedule.durationMonths)+" شهر",H-162,fonts);
    rowPair(page,"دورية الأقساط","شهرية",H-193,fonts,"arabic");
    rowPair(page,"عدد الدفعات",schedule.paymentCount,H-224,fonts);
    rowPair(page,"سعر الوحدة (جنيه)",amount(schedule.totalPrice),H-255,fonts);
    rowPair(page,"المقدم (جنيه)",amount(schedule.downPayment),H-286,fonts);
    rowPair(page,"موعد الاستلام بعد (شهر)",schedule.deliveryMonths>0?schedule.deliveryMonths:"-",H-317,fonts);
    rowPair(page,"إجمالي المسدد قبل الاستلام (جنيه)",amount(schedule.preDeliveryTotal),H-348,fonts);
    rowPair(page,"المتبقي بعد الاستلام (جنيه)",amount(schedule.postDeliveryTotal),H-379,fonts);
    rowPair(page,"وديعة الصيانة (جنيه)",amount(schedule.maintenance),H-410,fonts);
    rowPair(page,"تاريخ وديعة الصيانة",date(schedule.maintenanceDueDate||"-"),H-441,fonts);
    rowPair(page,"الإجمالي شامل الصيانة (جنيه)",amount(schedule.totalIncludingMaintenance),H-472,fonts);
    let y=H-518;tableHeading(page,y,fonts);y-=36;
    for(let i=0;i<schedule.rows.length;i++){
      if(y<85){
        page=pdf.addPage([W,H]);
        header(page,company,"استكمال جدول الأقساط",unit.code,logo,fonts);
        y=H-166;tableHeading(page,y,fonts);y-=36;
      }
      paymentRow(page,i,schedule.rows[i],y,fonts);y-=24;
    }
  }
  return pdf.save({useObjectStreams:false});
}
