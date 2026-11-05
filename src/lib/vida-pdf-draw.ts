import {PDFDocument,type PDFPage} from "pdf-lib";
import type {VidaBrochureImages} from "@/lib/vida-assets-client";

/** Embed only JPEG bytes cropped directly from user's original PDF or masterplan. */
export async function drawOriginalVidaCrop(
  pdf:PDFDocument,page:PDFPage,dataUri:string,
  x:number,y:number,frameWidth:number,frameHeight:number
):Promise<void>{
  const match=/^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUri);
  if(!match||match[1].length>1_400_000)throw Error("Vida drawing data is invalid");
  const bytes=Uint8Array.from(atob(match[1]),c=>c.charCodeAt(0));
  const image=await pdf.embedJpg(bytes);
  const ratio=Math.min(frameWidth/image.width,frameHeight/image.height);
  const width=image.width*ratio,height=image.height*ratio;
  page.drawImage(image,{x:x+(frameWidth-width)/2,y:y+(frameHeight-height)/2,width,height});
}
export async function drawVidaLocationCrops(
  pdf:PDFDocument,page:PDFPage,images:VidaBrochureImages
):Promise<void>{
  // Two actual source crops: numbered masterplan and architectural floor.
  // No polygons, diagram tracing, or generated geometry is ever drawn.
  await Promise.all([
    drawOriginalVidaCrop(pdf,page,images.building,57,345,230,288),
    drawOriginalVidaCrop(pdf,page,images.floor,306,345,230,288)
  ]);
}
