import { getGoogleAccessToken } from "@/lib/sheets";
import { unitKey } from "@/lib/unit-code";

/** NASA plans were approximately traced from raster PDF, not verified CAD.
 * Static floor geometry is in private owner Google Drive, while live status,
 * prices and contractual areas come exclusively from the NASA Google Sheet.
 */
export const NASA_FLOORS = {
  "-1": { name:"Basement", ar:"البدروم", driveId:"1OMVtyY8o-GkAW51ALp1z2F30VbMmzf5k", count:198 },
  "0": { name:"Ground", ar:"الأرضي", driveId:"13k1gDlebPz1K9WWsfyyYCREnAuQO6vV1", count:74 },
  "1": { name:"First", ar:"الأول", driveId:"1CEZy5iMZFobUdZCyH-pzU0t4OT9O3Yzc", count:106 },
  "2": { name:"Second", ar:"الثاني", driveId:"1WaGv7qPmGTHE-nKevX0fg8GnhkBbLPOa", count:80 },
  "3": { name:"Third", ar:"الثالث", driveId:"1AVNrjBE0br65JqR11ZjtJFOez0uznObm", count:80 },
  "4": { name:"Fourth", ar:"الرابع", driveId:"1KaTf91vkwY4chNiifV4Q5gqsbAWp-Ayd", count:80 },
  "5": { name:"Fifth", ar:"الخامس", driveId:"1QwdPo6Xc-mnu5r6-MSfQUpjQCifDQmP6", count:50 }
} as const;
export type NasaFloorKey=keyof typeof NASA_FLOORS;
export type NasaShape={code:string;d:string;area:number|null;review:boolean};
export type NasaFloorData={floor:string;name:string;viewBox:string;
  sourceType:string;sourceHash:string;image:string;units:NasaShape[]};
const SOURCE_SHA256="948c77202ca02b8e655f8a8f012c478a1f243025e6a64f5c6a568a40f0b67477";
const resolved=new Map<NasaFloorKey,{data:NasaFloorData;expiry:number}>();
export function nasaFloorKey(floor:string):NasaFloorKey|null {
  const key=String(floor).trim().toLowerCase();
  if(Object.hasOwn(NASA_FLOORS,key)) return key as NasaFloorKey;
  const labels:Record<string,NasaFloorKey>={
    basement:"-1",ground:"0",first:"1",second:"2",third:"3",fourth:"4",fifth:"5",
    "ground+ first":"0","ground+first":"0", "الأرضي":"0", "البدروم":"-1",
    "الأول":"1","الثاني":"2","الثالث":"3","الرابع":"4","الخامس":"5"
  };
  return labels[key]??null;
}
export async function getNasaFloor(userId:string,floor:NasaFloorKey):Promise<NasaFloorData> {
  const cached=resolved.get(floor);
  if(cached&&cached.expiry>Date.now())return cached.data;
  const file=NASA_FLOORS[floor];
  const token=await getGoogleAccessToken(userId);
  const response=await fetch("https://www.googleapis.com/drive/v3/files/"+
    encodeURIComponent(file.driveId)+"?alt=media",{
      headers:{Authorization:"Bearer "+token},cache:"no-store"
    });
  if(!response.ok)throw Error("NASA floor source is unavailable to the connected Google account (HTTP "+response.status+").");
  if(Number(response.headers.get("content-length")||0)>1_000_000)
    throw Error("NASA floor source exceeds the expected size.");
  const body=await response.text();
  if(body.length>1_000_000)throw Error("NASA floor source is unexpectedly large.");
  const data=JSON.parse(body) as NasaFloorData;
  if(data.floor!==floor||data.viewBox!=="0 0 792 612" ||
    data.sourceHash!==SOURCE_SHA256 || !data.image.startsWith("data:image/jpeg;base64,")||
    !Array.isArray(data.units)||data.units.length!==file.count)
    throw Error("NASA floor source failed integrity validation.");
  const unique=new Set<string>();
  for(const shape of data.units){
    const id=unitKey(shape.code);
    if(unique.has(id)||!shape.d||!/^\s*[Mm]/.test(shape.d))throw Error("Invalid or duplicated NASA unit outline.");
    unique.add(id);
  }
  resolved.set(floor,{data,expiry:Date.now()+30*60_000});
  return data;
}
