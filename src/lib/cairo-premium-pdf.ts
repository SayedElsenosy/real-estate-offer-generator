import {rgb,type PDFDocument,type PDFPage,type PDFFont,type PDFImage} from "pdf-lib";
import {drawArabicText} from "arabic-bidi-shaper/pdf-lib";
import type {CairoPremiumArtwork} from "@/lib/cairo-premium-assets";

/**
 * Cairo Plaza premium visual system approved from the user's four-page mockup.
 * Architectural pictures were extracted from their two source PDF brochures.
 * Text/measurements below reproduce the brochure's marketing facts; live
 * inventory unit values and schedules are still drawn by the offer engine.
 */
const W=595.28,H=841.89;
export const CAIRO_NAVY=rgb(.075,.105,.14);
export const CAIRO_GOLD=rgb(.76,.55,.29);
export const CAIRO_CREAM=rgb(.985,.977,.958);
const LIGHT=rgb(.90,.89,.86),WHITE=rgb(1,1,1),DARK=rgb(.15,.18,.19);
type Fonts={latin:PDFFont;latinBold:PDFFont;arabic?:PDFFont;arabicBold?:PDFFont};
type Options={artwork?:CairoPremiumArtwork|null;logo?:PDFImage|null;fonts:Fonts;language:"ar"|"en"};

function text(page:PDFPage,value:string,x:number,y:number,size:number,bold:boolean,fonts:Fonts,
  color=DARK,align:"left"|"right"="left"){
  const font=bold?fonts.latinBold:fonts.latin;
  page.drawText(value,{x:align==="right"?x-font.widthOfTextAtSize(value,size):x,y,size,font,color});
}
function arabic(page:PDFPage,value:string,right:number,y:number,size:number,bold:boolean,fonts:Fonts,
  color=DARK){
  if(fonts.arabic&&fonts.arabicBold){
    drawArabicText(page,value,{x:right,y,font:bold?fonts.arabicBold:fonts.arabic,
      size,color,align:"right"});
  }
}
function label(page:PDFPage,ar:string,en:string,right:number,y:number,size:number,bold:boolean,
  lang:"ar"|"en",fonts:Fonts,color=DARK){
  if(lang==="ar")arabic(page,ar,right,y,size,bold,fonts,color);
  else text(page,en,43,y,size,bold,fonts,color);
}
function branding(page:PDFPage,fonts:Fonts,logo:PDFImage|null,dark:boolean){
  const color=dark?WHITE:CAIRO_NAVY;
  text(page,"ELAF",43,H-60,23,true,fonts,color);
  text(page,"D E V E L O P M E N T S",44,H-77,7.2,false,fonts,dark?CAIRO_GOLD:DARK);
  if(logo){
    const ratio=Math.min(80/logo.width,55/logo.height);
    // Keep official original brand mark compact and away from the headline.
    page.drawImage(logo,{x:W-46-logo.width*ratio,y:H-91,
      width:logo.width*ratio,height:logo.height*ratio,opacity:.92});
  }
}
function imageFromBase64(pdf:PDFDocument,data?:string):Promise<PDFImage|null>{
  const match=data&&/^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
  if(!match)return Promise.resolve(null);
  const bytes=Uint8Array.from(atob(match[1]),v=>v.charCodeAt(0));
  return pdf.embedJpg(bytes);
}
function imageContain(page:PDFPage,image:PDFImage,x:number,y:number,w:number,h:number){
  const scale=Math.min(w/image.width,h/image.height);
  const iw=image.width*scale,ih=image.height*scale;
  page.drawImage(image,{x:x+(w-iw)/2,y:y+(h-ih)/2,width:iw,height:ih});
}
function pageNumber(page:PDFPage,n:number,fonts:Fonts,dark=false){
  const fg=dark?CAIRO_GOLD:CAIRO_NAVY;
  const value=String(n).padStart(2,"0");
  text(page,value,W-45,27,15,true,fonts,fg,"right");
}
function projectStats(page:PDFPage,fonts:Fonts,lang:"ar"|"en"){
  const top=H-247,y=H-242;
  const metrics=[
    {v:"7.5",ar:"فدان",en:"FEDDANS"},
    {v:"220 m",ar:"واجهة على المحور المركزي",en:"MAIN-ROAD FRONTAGE"},
    {v:"10",ar:"شوارع داخلية",en:"INTERNAL STREETS"}
  ];
  const x=43,w=(W-86-18)/3;
  metrics.forEach((m,i)=>{
    const sx=x+i*(w+9);
    page.drawRectangle({x:sx,y:top-24,width:w,height:73,color:WHITE,
      borderColor:LIGHT,borderWidth:.8});
    page.drawRectangle({x:sx,y:top+46,width:41,height:3,color:CAIRO_GOLD});
    text(page,m.v,sx+12,y+13,24,true,fonts,CAIRO_NAVY);
    if(lang==="ar")arabic(page,m.ar,sx+w-9,y-10,8.9,false,fonts,DARK);
    else text(page,m.en,sx+11,y-10,8.2,false,fonts,DARK);
  });
}
function cover(pdf:PDFDocument,fonts:Fonts,logo:PDFImage|null,lang:"ar"|"en",
  facade:PDFImage|null,aerial:PDFImage|null){
  const page=pdf.addPage([W,H]);
  page.drawRectangle({x:0,y:0,width:W,height:H,color:CAIRO_NAVY});
  // Subtle premium architectural gold motif, not a false project floorplan.
  page.drawLine({start:{x:0,y:H-80},end:{x:105,y:H},
    thickness:1.1,color:CAIRO_GOLD,opacity:.75});
  page.drawLine({start:{x:W-95,y:0},end:{x:W,y:95},
    thickness:1.2,color:CAIRO_GOLD,opacity:.65});
  branding(page,fonts,logo,true);
  if(lang==="ar"){
    arabic(page,"القاهرة بلازا",W-42,H-199,39,true,fonts,WHITE);
    text(page,"CAIRO  PLAZA",W-44,H-228,16,true,fonts,CAIRO_GOLD,"right");
    arabic(page,"تجاري  •  إداري  •  طبي",W-44,H-266,14,false,fonts,WHITE);
  }else{
    text(page,"CAIRO PLAZA",44,H-202,41,true,fonts,WHITE);
    text(page,"RETAIL  /  OFFICES  /  MEDICAL",45,H-243,13,true,fonts,CAIRO_GOLD);
    text(page,"6TH OF OCTOBER CITY",45,H-276,12,false,fonts,WHITE);
  }
  page.drawRectangle({x:43,y:H-303,width:75,height:3,color:CAIRO_GOLD});
  const image=facade||aerial;
  if(image){
    const imgHeight=W*image.height/image.width;
    const w=Math.max(W,1);
    page.drawImage(image,{x:0,y:126,width:w,height:Math.min(imgHeight,421)});
    page.drawRectangle({x:0,y:126,width:W,height:76,color:CAIRO_NAVY,opacity:.55});
  }else{
    page.drawRectangle({x:0,y:126,width:W,height:364,color:rgb(.13,.19,.22)});
    page.drawRectangle({x:65,y:166,width:465,height:220,borderColor:CAIRO_GOLD,borderWidth:.7,opacity:.3});
  }
  page.drawRectangle({x:0,y:0,width:W,height:126,color:CAIRO_NAVY});
  page.drawLine({start:{x:43,y:104},end:{x:W-43,y:104},thickness:1,color:CAIRO_GOLD});
  if(lang==="ar"){
    arabic(page,"مدينة السادس من أكتوبر",W-46,69,15,true,fonts,WHITE);
    arabic(page,"ميدان ليلة القدر  •  المحور المركزي",W-46,47,10,false,fonts,LIGHT);
  }else{
    text(page,"6TH OF OCTOBER CITY",45,69,15,true,fonts,WHITE);
    text(page,"LAYLAT AL QADR SQUARE  |  CENTRAL AXIS",45,47,9.2,false,fonts,LIGHT);
  }
  pageNumber(page,1,fonts,true);
}
function overview(pdf:PDFDocument,fonts:Fonts,logo:PDFImage|null,lang:"ar"|"en",
  masterplan:PDFImage|null,aerial:PDFImage|null,facadeAlt:PDFImage|null){
  const p=pdf.addPage([W,H]);
  p.drawRectangle({x:0,y:0,width:W,height:H,color:CAIRO_CREAM});
  p.drawRectangle({x:0,y:H-112,width:W,height:112,color:CAIRO_NAVY});
  branding(p,fonts,logo,true);
  if(lang==="ar")arabic(p,"وجهة تجارية في قلب أكتوبر",W-43,H-139,23,true,fonts,CAIRO_NAVY);
  else text(p,"A DESTINATION IN OCTOBER",43,H-139,23,true,fonts,CAIRO_NAVY);
  if(lang==="ar"){
    arabic(p,"القاهرة بلازا  |  ميدان ليلة القدر",W-43,H-165,10.5,false,fonts,DARK);
    arabic(p,"تصميم متكامل يجمع الأنشطة التجارية والإدارية والطبية",W-43,H-184,10.5,false,fonts,DARK);
  }else{
    text(p,"CAIRO PLAZA | LAYLAT AL QADR SQUARE",43,H-165,10,false,fonts,DARK);
    text(p,"A connected retail, office and medical destination.",43,H-184,11,false,fonts,DARK);
  }
  projectStats(p,fonts,lang);
  const mapX=43,mapY=237,mapW=325,mapH=333;
  p.drawRectangle({x:mapX,y:mapY,width:mapW,height:mapH,color:CAIRO_NAVY});
  if(lang==="ar")arabic(p,"الماستر بلان الأصلي",mapX+mapW-16,mapY+mapH-30,13,true,fonts,WHITE);
  else text(p,"ORIGINAL PROJECT MASTERPLAN",mapX+14,mapY+mapH-30,11,true,fonts,WHITE);
  if(masterplan)imageContain(p,masterplan,mapX+12,mapY+43,mapW-24,mapH-86);
  else text(p,"Cairo Plaza Masterplan",mapX+26,mapY+mapH/2,16,true,fonts,CAIRO_GOLD);
  if(lang==="ar")arabic(p,"من بروشور المشروع الأصلي",mapX+mapW-16,mapY+15,8.5,false,fonts,LIGHT);
  else text(p,"FROM THE ORIGINAL PROJECT BROCHURE",mapX+14,mapY+16,8,false,fonts,LIGHT);

  const x=382,w=W-x-43;
  p.drawRectangle({x,y:421,width:w,height:149,color:WHITE,borderColor:LIGHT,borderWidth:.8});
  if(aerial||facadeAlt)imageContain(p,(aerial||facadeAlt)!,x+6,428,w-12,136);
  else text(p,"CAIRO PLAZA",x+18,497,16,true,fonts,CAIRO_NAVY);
  p.drawRectangle({x,y:237,width:w,height:167,color:WHITE,borderColor:LIGHT,borderWidth:.8});
  p.drawRectangle({x:x+11,y:383,width:41,height:3,color:CAIRO_GOLD});
  if(lang==="ar"){
    arabic(p,"مزايا المشروع",x+w-10,358,14,true,fonts,CAIRO_NAVY);
    arabic(p,"تجاري  وإداري  وطبي",x+w-10,326,10,false,fonts,DARK);
    arabic(p,"طرق داخلية واسعة",x+w-10,298,10,false,fonts,DARK);
    arabic(p,"تيسير حركة البضائع",x+w-10,270,10,false,fonts,DARK);
  }else{
    text(p,"PROJECT HIGHLIGHTS",x+11,358,12,true,fonts,CAIRO_NAVY);
    text(p,"Retail, offices, medical",x+11,326,9.5,false,fonts,DARK);
    text(p,"Wide internal access",x+11,298,9.5,false,fonts,DARK);
    text(p,"11 m internal road width",x+11,270,9.5,false,fonts,DARK);
  }
  p.drawLine({start:{x:43,y:202},end:{x:W-43,y:202},thickness:.9,color:CAIRO_GOLD});
  if(lang==="ar"){
    arabic(p,"عشرة شوارع داخلية بعرض 11 متر تقريباً لكل شارع طبقاً للبروشور.",W-43,177,11,false,fonts,DARK);
    arabic(p,"الرسومات للتعريف بالمشروع، وتفاصيل الوحدة والسعر موضحة في الصفحات التالية.",W-43,153,9.6,false,fonts,DARK);
  }else{
    text(p,"10 internal streets, each 11 m wide, as presented in the project brochure.",43,177,9.5,false,fonts,DARK);
    text(p,"Unit plans, prices and installments follow on subsequent pages.",43,153,9.5,false,fonts,DARK);
  }
  text(p,"ELAF  /  CAIRO PLAZA",43,39,9,true,fonts,CAIRO_NAVY);
  pageNumber(p,2,fonts);
}
export async function addCairoPremiumPrelude(pdf:PDFDocument,{artwork,logo,fonts,language}:Options){
  const [facade,aerial,masterplan,facadeAlt]=await Promise.all([
    imageFromBase64(pdf,artwork?.facade),
    imageFromBase64(pdf,artwork?.aerial),
    imageFromBase64(pdf,artwork?.masterplan),
    imageFromBase64(pdf,artwork?.facadeAlt)
  ]);
  cover(pdf,fonts,logo,language,facade??null,aerial??null);
  overview(pdf,fonts,logo,language,masterplan??null,aerial??null,facadeAlt??null);
}
/** Keep the existing unit, drawing and every continued installment page on theme. */
export function addCairoPremiumPageNumbers(pdf:PDFDocument,fromIndex:number,fonts:Fonts){
  const pages=pdf.getPages();
  for(let i=fromIndex;i<pages.length;i++){
    const p=pages[i];
    p.drawRectangle({x:0,y:0,width:W,height:14,color:CAIRO_NAVY});
    p.drawRectangle({x:0,y:14,width:W,height:2.4,color:CAIRO_GOLD});
    p.drawRectangle({x:43,y:77,width:W-86,height:.55,color:CAIRO_GOLD,opacity:.6});
    text(p,"CAIRO PLAZA  /  ELAF DEVELOPMENTS",43,26,8,false,fonts,CAIRO_NAVY);
    pageNumber(p,i+1,fonts);
  }
}
