import { getNasaFloor, nasaFloorKey } from "@/lib/nasa-floor-source";
import { unitKey } from "@/lib/unit-code";
export type NasaOfferLocation={
  image:string;
  outline:string;
  unitCode:string;
  review:boolean;
};
export async function getNasaOfferLocation(userId:string,code:string,floor:string):Promise<NasaOfferLocation|null>{
  const key=nasaFloorKey(floor);
  if(key===null)return null;
  const data=await getNasaFloor(userId,key);
  const shapes=data.units.filter(shape=>unitKey(shape.code)===unitKey(code));
  if(shapes.length!==1)return null;
  return {image:data.image,outline:shapes[0].d,unitCode:shapes[0].code,review:shapes[0].review};
}
