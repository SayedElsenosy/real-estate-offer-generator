import {rgb,type PDFDocument,type PDFPage} from "pdf-lib";
import {getVidaSiteBuilding,VIDA_SITE_WIDTH,VIDA_SITE_HEIGHT} from "@/lib/vida-site-map";

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

/**
 * Show exactly the user's original full masterplan, then a clearly visible
 * selection ring around the correct building hotspot. The ring is an
 * annotation only; it is not an invented architectural unit boundary.
 */
export async function drawOriginalVidaSiteWithMarker(
 pdf:PDFDocument,page:PDFPage,encoded:string,building:number,
 frame:{x:number;y:number;width:number;height:number}
):Promise<void>{
 const m=/^data:image\\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(encoded);
 if(!m)throw Error("Invalid original Vida masterplan image");
 const image=await pdf.embedJpg(Uint8Array.from(atob(m[1]),v=>v.charCodeAt(0)));
 const scale=Math.min(frame.width/image.width,frame.height/image.height);
 const w=image.width*scale,h=image.height*scale;
 const x=frame.x+(frame.width-w)/2,y=frame.y+(frame.height-h)/2;
 page.drawImage(image,{x,y,width:w,height:h});
 const target=getVidaSiteBuilding(building);
 if(!target||target.phase===3)return;
 const px=x+target.cx/VIDA_SITE_WIDTH*w;
 const py=y+(1-target.cy/VIDA_SITE_HEIGHT)*h;
 // Two concentric rings keep the selected BUILDING visible without
 // fabricating a unit outline or obscuring the source roof illustration.
 const rx=Math.max(12,target.rx/VIDA_SITE_WIDTH*w);
 const ry=Math.max(12,target.ry/VIDA_SITE_HEIGHT*h);
 page.drawEllipse({x:px,y:py,xScale:rx+3,yScale:ry+3,
   borderColor:rgb(1,1,1),borderWidth:5,borderOpacity:.94});
 page.drawEllipse({x:px,y:py,xScale:rx+3,yScale:ry+3,
   borderColor:rgb(.79,.36,.03),borderWidth:3,borderOpacity:1});
}
