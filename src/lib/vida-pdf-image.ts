import type {PDFDocument,PDFPage} from "pdf-lib";

/** Embed the original cropped JPEG exported from the supplied Vida brochure. */
export async function drawOriginalVidaImage(
 pdf:PDFDocument,page:PDFPage,encoded:string,
 frame:{x:number;y:number;width:number;height:number}
):Promise<void>{
 const m=/^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(encoded);
 if(!m)throw Error("Invalid original Vida brochure crop");
 const bytes=Uint8Array.from(atob(m[1]),c=>c.charCodeAt(0));
 const image=await pdf.embedJpg(bytes);
 const scale=Math.min(frame.width/image.width,frame.height/image.height);
 const width=image.width*scale,height=image.height*scale;
 page.drawImage(image,{x:frame.x+(frame.width-width)/2,
  y:frame.y+(frame.height-height)/2,width,height});
}
