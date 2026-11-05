import type { InventoryUnit } from "@/lib/sheets";

/**
 * Verified from original Vida phase-1 (87p) and phase-2 (45p) brochures.
 * These are SOURCE page numbers (1-based), never redrawn floor geometry.
 * The unit drawing is a cropped brochure TYPE reference; a mirrored or
 * alternate orientation is never represented as an exact unit outline.
 */
export type VidaBrochureMatch = {
  phase: 1 | 2;
  building: number;
  wing: "A" | "B" | null;
  unitCode: string;
  brochureType: number;
  assetGroup: string;
  floorPage: number;
  unitPage: number | null;
  exactUnitPlan: boolean;
  notice: string;
};

type Block = { group: string; type: number; ground: number; first?: number; typical: number; };
const blocks: Record<number, Block> = {
  1:{group:"p1-t1",type:1,ground:11,typical:12},
  2:{group:"p1-t2",type:2,ground:18,typical:19},
  3:{group:"p1-t2",type:2,ground:18,typical:19},
  4:{group:"p1-t3a",type:3,ground:26,first:27,typical:28},
  5:{group:"p1-t3a",type:3,ground:26,first:27,typical:28},
  6:{group:"p1-t3b",type:3,ground:34,first:35,typical:36},
  7:{group:"p1-t4",type:4,ground:65,typical:66},
  8:{group:"p1-t4",type:4,ground:65,typical:66},
  9:{group:"p1-t3b",type:3,ground:34,first:35,typical:36},
  10:{group:"p1-t3c",type:3,ground:44,first:45,typical:46},
  11:{group:"p1-t3d",type:3,ground:54,first:55,typical:56},
  12:{group:"p1-t2",type:2,ground:18,typical:19},
  13:{group:"p1-t2",type:2,ground:18,typical:19},
  14:{group:"p1-t1",type:1,ground:11,typical:12},
  15:{group:"p1-t5",type:5,ground:78,first:79,typical:80},
  16:{group:"p1-t5",type:5,ground:78,first:79,typical:80},
  17:{group:"p1-t5",type:5,ground:78,first:79,typical:80},
  18:{group:"p1-t5",type:5,ground:78,first:79,typical:80},
  19:{group:"p2-t2",type:2,ground:19,typical:20},
  20:{group:"p2-t1",type:1,ground:11,typical:12},
  21:{group:"p2-t1",type:1,ground:11,typical:12},
  22:{group:"p2-t3",type:3,ground:27,first:28,typical:29},
  23:{group:"p2-t3",type:3,ground:27,first:28,typical:29},
  24:{group:"p2-t3",type:3,ground:27,first:28,typical:29},
  25:{group:"p2-t3",type:3,ground:27,first:28,typical:29},
  26:{group:"p2-t4",type:4,ground:35,typical:36},
  27:{group:"p2-t4",type:4,ground:35,typical:36},
  28:{group:"p2-t4",type:4,ground:35,typical:36},
  29:{group:"p2-t4",type:4,ground:35,typical:36},
  30:{group:"p2-t4",type:4,ground:35,typical:36},
  31:{group:"p2-t3",type:3,ground:27,first:28,typical:29}
};
const candidates:Record<string,Array<[number,number,"ground"|"typical"|"any"]>>={
 "p1-t1":[[55.65,13,"ground"],[103,14,"ground"],[57.40,15,"typical"],[108.15,16,"typical"]],
 "p1-t2":[[94.15,20,"ground"],[115.65,21,"ground"],[91.40,22,"ground"],[97.40,23,"typical"],[122.40,24,"typical"]],
 "p1-t3a":[[54.25,31,"ground"],[73.15,32,"typical"],[136,33,"typical"]],
 "p1-t3b":[[54.25,41,"ground"],[73.15,42,"typical"],[136,43,"typical"]],
 "p1-t3c":[[54.25,49,"ground"],[73.15,52,"typical"],[136,53,"typical"]],
 "p1-t3d":[[54.25,59,"ground"],[73.15,62,"typical"],[136,63,"typical"]],
 "p1-t4":[[91.50,67,"ground"],[190,68,"ground"],[154.50,69,"ground"],[90,70,"ground"],[93.50,71,"typical"],[202,73,"typical"],[160,74,"typical"],[92.50,75,"typical"],[61,76,"typical"]],
 "p1-t5":[[124.50,81,"ground"],[170,82,"ground"],[91,85,"typical"]],
 "p2-t1":[[121.50,13,"ground"],[101,14,"ground"],[92.65,15,"ground"],[132,16,"typical"],[106.70,17,"typical"]],
 "p2-t2":[[93,21,"ground"],[113.80,22,"ground"],[91.50,23,"ground"],[97.50,24,"typical"],[122.50,25,"typical"]],
 "p2-t3":[[173.50,30,"ground"],[55,31,"ground"],[74,32,"typical"],[138.75,33,"typical"]],
 "p2-t4":[[103.50,37,"ground"],[177.50,38,"ground"],[151.50,39,"ground"],[134.50,40,"ground"],[135.75,41,"typical"],[190,42,"typical"],[161,43,"typical"]]
};

const normalize=(x:unknown)=>String(x??"").normalize("NFKC").trim().toLowerCase().replace(/\s+/g,"");
function getColumn(unit:InventoryUnit,name:string):string{
 const idx=unit.sourceHeaders?.findIndex(h=>normalize(h)===normalize(name))??-1;
 return idx>=0?String(unit.sourceCells?.[idx]??"").trim():"";
}
const getArea=(v:string):number=>{
 const n=Number(String(v).replace(/[,\s]/g,""));
 return Number.isFinite(n)&&n>0?n:NaN;
};
/** Fail closed: no fallback to a similarly sized apartment in another building. */
export function matchVidaBrochure(unit:InventoryUnit):VidaBrochureMatch|null{
 const phaseCode=getColumn(unit,"PH").match(/(?:PH\s*)?([123])/i);
 const buildingText=getColumn(unit,"Building");
 const buildingFound=buildingText.match(/(?:building\s*)?(\d{1,2})\s*([ab])?\b/i);
 const codeFound=unit.code.match(/^(\d{1,2})([AB])?[-\s]+(\d{2,3})$/i);
 if(!phaseCode||!buildingFound||!codeFound)return null;
 const phase=Number(phaseCode[1]);
 const building=Number(buildingFound[1]);
 const wing=(buildingFound[2]||"").toUpperCase()||null;
 if(phase!==1&&phase!==2)return null; // no Phase 3 brochure supplied
 if(building!==Number(codeFound[1])||(wing||null)!==((codeFound[2]||"").toUpperCase()||null))return null;
 if((phase===1&&building>18)||(phase===2&&(building<19||building>31)))return null;
 const block=blocks[building];
 if(!block)return null;
 const declaredType=getColumn(unit,"TYPE").match(/type\s*0?([1-5])/i);
 if(!declaredType||Number(declaredType[1])!==block.type)return null;
 const floor=normalize(unit.floor);
 const ground=floor==="ground"||floor==="ground+first"||floor==="ground+firstfloor";
 const first=floor==="first" || floor==="ground+first";
 const upper=["second","third","fourth","fifth"].includes(floor);
 if(!ground&&!first&&!upper)return null;
 const floorPage=ground?block.ground:(first&&block.first?block.first:block.typical);
 const group=block.group;
 const area=getArea(unit.area);
 const kind=ground?"ground":"typical";
 let unitPage:number|null=null;
 const duplex=normalize(unit.type)==="duplex";
 const suffix=Number(codeFound[3]);
 if(duplex){
   if(block.type===3){
     if(group==="p1-t3a")unitPage=[1,5].includes(suffix)?29:[2,4].includes(suffix)?30:null;
     else if(group==="p1-t3b")unitPage=({1:37,5:38,4:39,2:40} as Record<number,number>)[suffix]||null;
     else if(group==="p1-t3c")unitPage=({1:47,2:48,4:50,5:51} as Record<number,number>)[wing==="B"?(6-suffix):suffix]||null;
     else if(group==="p1-t3d")unitPage=({1:57,2:58,4:60,5:61} as Record<number,number>)[wing==="B"?(6-suffix):suffix]||null;
     else if(group==="p2-t3")unitPage=30;
     if(unitPage&&Math.abs(area-(phase===1?170:173.5))>1)unitPage=null;
   }else if(block.type===5&&Math.abs(area-170)<=1)unitPage=82;
 }else{
   const all=(candidates[group]||[]).filter(([nominal,,scope])=>scope===kind||scope==="any");
   const close=all.filter(([nominal])=>Math.abs(area-nominal)<=1.00);
   if(close.length===1)unitPage=close[0][1];
 }
 const exactUnitPlan=Boolean(phase===1&&block.type===3&&duplex&&unitPage);
 return { phase:phase as 1|2,building,wing:wing as "A"|"B"|null,
   unitCode:unit.code,brochureType:block.type,assetGroup:group,floorPage,unitPage,
   exactUnitPlan,
   notice:unitPage ? (exactUnitPlan
     ?"Original brochure diagram matched by block, wing and unit label."
     :"Original brochure TYPE reference matched by phase, block, floor and area. Unit orientation is not independently certified.")
     :"Only the original building/floor reference is confirmed. No unique unit drawing was matched."};
}
export const VIDA_BROCHURE_ASSET_DRIVE_ID="1HvsE5zVPpzJlYtkGUArlO9o_ByzfEpWz";
