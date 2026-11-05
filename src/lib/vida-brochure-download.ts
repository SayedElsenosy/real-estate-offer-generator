import type { InventoryUnit } from "@/lib/sheets";
import { getGoogleAccessToken } from "@/lib/sheets";
import { getVidaBrochureLocation, type VidaLocation } from "@/lib/vida-brochure";
import { vidaBrochureFileIds } from "@/lib/vida-brochure-assets";
import { vidaSiteAssetFileIds } from "@/lib/vida-site-assets";

export type VidaPdfDrawing = VidaLocation & {
  /** JPEGs cropped from original brochure, never traced or redrawn. */
  planImage?: string|null;
  masterImage?: string|null;
  /** Original brochure page inset: the unit-type shaded floor layout. */
  locatorImage?: string|null;
};
const MAX_JPEG=200000;
function base64(bytes:Uint8Array):string {
  let text="";
  for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(text);
}
/** Only explicitly mapped Google Drive IDs can be downloaded; no user-provided URL. */
export async function readVidaBrochureJpeg(accessToken:string,fileId:string):Promise<Uint8Array>{
  if(!Object.values(vidaBrochureFileIds).includes(fileId)&&
     !Object.values(vidaSiteAssetFileIds).includes(fileId))
    throw Error("Unknown Vida brochure artwork");
  const original="https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(fileId)+"?alt=media";
  let url=original;
  for(let attempt=0;attempt<4;attempt++){
    const response=await fetch(url,{
      redirect:"manual",cache:"no-store",headers:url===original?{Authorization:"Bearer "+accessToken}:{},
      signal:AbortSignal.timeout(9000)
    });
    if(response.status>=300&&response.status<400){
      const next=new URL(response.headers.get("location")||"",url);
      const host=next.hostname.toLowerCase();
      if(next.protocol!=="https:"||!(host==="googleusercontent.com"||host.endsWith(".googleusercontent.com")||
        host==="googleapis.com"||host.endsWith(".googleapis.com")||
        host==="google.com"||host.endsWith(".google.com")))
        throw Error("Vida asset download redirect was not trusted");
      url=next.toString();continue;
    }
    if(!response.ok)throw Error("Vida brochure crop is not accessible to the connected Google account (HTTP "+response.status+")");
    if(Number(response.headers.get("content-length")||0)>MAX_JPEG)throw Error("Vida artwork is too large");
    const bytes=new Uint8Array(await response.arrayBuffer());
    if(bytes.length>MAX_JPEG||bytes.length<200||bytes[0]!==255||bytes[1]!==216)
      throw Error("Vida brochure asset is not a supported JPEG");
    return bytes;
  }
  throw Error("Too many Vida brochure asset redirects");
}
export async function getVidaPdfDrawing(userId:string,unit:InventoryUnit):Promise<VidaPdfDrawing|null>{
  const location=getVidaBrochureLocation(unit);
  if(!location)return null;
  if(location.status!=="matched"||!location.planFileId)return location;
  try{
    const token=await getGoogleAccessToken(userId);
    const locatorId=vidaSiteAssetFileIds[`p${location.phase}_${String(location.brochurePage).padStart(2,"0")}_locator.jpg`];
    const siteId=vidaSiteAssetFileIds["vida_site_original.jpg"];
    if(!locatorId||!siteId)throw Error("Original Vida site or floor inset is missing");
    const [plan,site,locator]=await Promise.all([
      readVidaBrochureJpeg(token,location.planFileId),
      readVidaBrochureJpeg(token,siteId),
      readVidaBrochureJpeg(token,locatorId)
    ]);
    return {...location,planImage:"data:image/jpeg;base64,"+base64(plan),
      masterImage:"data:image/jpeg;base64,"+base64(site),
      locatorImage:"data:image/jpeg;base64,"+base64(locator)};
  }catch(e){
    // Do not silently replace a missing source image with an invented outline.
    console.warn("Vida original brochure image unavailable",e instanceof Error?e.message:"unknown");
    return {...location,status:"needs-review",reason:"Original brochure JPEG is unavailable to this Google account.",planImage:null,masterImage:null};
  }
}
