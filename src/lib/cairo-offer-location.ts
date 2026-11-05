import { unitKey } from "@/lib/unit-code";

export type PdfUnitLocation = {
  floorName:string;
  selectedCode:string;
  cadPaths:{d:string;stroke:string}[];
  unitPaths:{code:string;d:string;review:boolean}[];
  reviewed:boolean;
};

function parseFloor(code:string,floor:string):number|null {
  const match=/(?:^|\/)(BA|GR|FR|2ND|3RD|4TH|5TH|6TH)(?:\/|$)/i.exec(code);
  const known:Record<string,number>={BA:-1,GR:0,FR:1,"2ND":2,"3RD":3,"4TH":4,"5TH":5,"6TH":6};
  if(match)return known[match[1].toUpperCase()];
  const normal=floor.trim().toLowerCase();
  if(/^(-1|[0-6])$/.test(normal))return Number(normal);
  const labels:Record<string,number>={basement:-1,ground:0,first:1,second:2,third:3,
    fourth:4,fifth:5,sixth:6};
  return labels[normal]??null;
}
async function readFloor(floor:number) {
  switch(floor) {
    case -1:return Promise.all([import("@/data/cairo-svg-floor--1.json"),import("@/data/cairo-pdf-cad--1.json")]);
    case 0:return Promise.all([import("@/data/cairo-svg-floor-0.json"),import("@/data/cairo-pdf-cad-0.json")]);
    case 1:return Promise.all([import("@/data/cairo-svg-floor-1.json"),import("@/data/cairo-pdf-cad-1.json")]);
    case 2:return Promise.all([import("@/data/cairo-svg-floor-2.json"),import("@/data/cairo-pdf-cad-2.json")]);
    case 3:return Promise.all([import("@/data/cairo-svg-floor-3.json"),import("@/data/cairo-pdf-cad-3.json")]);
    case 4:return Promise.all([import("@/data/cairo-svg-floor-4.json"),import("@/data/cairo-pdf-cad-4.json")]);
    case 5:return Promise.all([import("@/data/cairo-svg-floor-5.json"),import("@/data/cairo-pdf-cad-5.json")]);
    case 6:return Promise.all([import("@/data/cairo-svg-floor-6.json"),import("@/data/cairo-pdf-cad-6.json")]);
    default: return null;
  }
}
/** Same official overlay used by Cairo Plaza's interactive plans; source
 * engineering CAD vectors and all mapped unit polygons, never old PDF layers.
 */
export async function getCairoOfferLocation(code:string,floor:string):Promise<PdfUnitLocation|null> {
  const key=parseFloor(code,floor);
  if(key===null)return null;
  const result=await readFloor(key);
  if(!result)return null;
  const [unitsModule,cadModule]=result;
  const floorData=unitsModule.default as {name:string;units:{code:string;d?:string;status:string}[]};
  const cad=cadModule.default as {paths:{d:string;stroke:string}[]};
  const selected=floorData.units.find(unit=>unitKey(unit.code)===unitKey(code));
  if(!selected?.d)return null;
  return {
    floorName:floorData.name,selectedCode:selected.code,
    cadPaths:cad.paths,
    unitPaths:floorData.units.filter(u=>Boolean(u.d)).map(u=>({
      code:u.code,d:u.d!,review:u.status==="REVIEW"
    })),
    reviewed:selected.status==="REVIEW"
  };
}
