import { getGoogleAccessToken } from "@/lib/sheets";

/**
 * Marketing artwork cropped from the user's two original Cairo Plaza PDFs.
 * Stored in the owner's connected Google Drive, not public URLs.
 * No offer, buyer data, or financial information is persisted here.
 */
const IMAGE_IDS = {
  facade: "1KYzGnhSebTMEinPxLfNrS2IWCB_2Ujya",
  aerial: "1td4nbjJ0TbNKD1IMR8meovOpBYqpBeri",
  masterplan: "11H_qpZtBRjId-fz8ivvQzOkpsxqMGfD0",
  facadeAlt: "1_H20eliPEPH3sGN2YaCIY0wznMuaop8v"
} as const;

export type CairoPremiumArtwork = Partial<Record<keyof typeof IMAGE_IDS,string>>;
const MAX_BYTES=280_000;

function toBase64(data:Uint8Array):string{
  let s="";
  for(let i=0;i<data.length;i+=8192)s+=String.fromCharCode(...data.subarray(i,i+8192));
  return btoa(s);
}

/** Fetch only explicitly allowlisted project images. No arbitrary user URLs. */
async function privateImage(token:string,id:string):Promise<string>{
  if(!Object.values(IMAGE_IDS).includes(id as typeof IMAGE_IDS[keyof typeof IMAGE_IDS]))
    throw Error("Unrecognized Cairo Plaza marketing asset");
  const original="https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(id)+"?alt=media";
  let next=original;
  for(let i=0;i<4;i++){
    const url=new URL(next);
    const response=await fetch(next,{redirect:"manual",cache:"no-store",
      headers:url.hostname==="www.googleapis.com"?{Authorization:"Bearer "+token}:{},
      signal:AbortSignal.timeout(7500)});
    if(response.status>=300&&response.status<400){
      const destination=new URL(response.headers.get("location")||"",next);
      const host=destination.hostname.toLowerCase();
      if(destination.protocol!=="https:"||
        !([ "google.com","googleapis.com","googleusercontent.com"].some(x=>host===x||host.endsWith("."+x))))
        throw Error("Untrusted marketing image redirect");
      next=destination.toString();continue;
    }
    if(!response.ok)throw Error("Original Cairo Plaza picture unavailable (HTTP "+response.status+")");
    if(Number(response.headers.get("content-length")||0)>MAX_BYTES)
      throw Error("Cairo Plaza source asset exceeds size limit");
    const image=new Uint8Array(await response.arrayBuffer());
    if(image.length<200||image.length>MAX_BYTES||image[0]!==255||image[1]!==216)
      throw Error("Unexpected Cairo Plaza JPEG image data");
    return "data:image/jpeg;base64,"+toBase64(image);
  }
  throw Error("Too many image redirects");
}
export async function getCairoPremiumArtwork(userId:string):Promise<CairoPremiumArtwork>{
  let token:string;
  try{token=await getGoogleAccessToken(userId);}
  catch(e){
    console.warn("Cairo Plaza artwork: linked Google account unavailable");
    return {};
  }
  const keys=Object.keys(IMAGE_IDS) as (keyof typeof IMAGE_IDS)[];
  const results=await Promise.allSettled(keys.map(k=>privateImage(token,IMAGE_IDS[k])));
  const artwork:CairoPremiumArtwork={};
  results.forEach((result,i)=>{
    if(result.status==="fulfilled")artwork[keys[i]]=result.value;
    else console.warn("Cairo Plaza original artwork unavailable:",keys[i]);
  });
  return artwork;
}
