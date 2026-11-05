import type { InventoryUnit } from "@/lib/sheets";
import { vidaBrochureFileIds } from "@/lib/vida-brochure-assets";

/**
 * Verified against Vida Elaf phase 1 (87 PDF pages) and phase 2 (45 pages).
 * Page numbers are 1-indexed. Rules use the original brochure's building
 * groups, original unit codes/floor use, and source inventory metadata.
 * No SVG/vector floorplans are fabricated.
 */
export type VidaLocation = {
  phase: 1|2; building: number; wing: string; floor: string; unitCode: string;
  brochureType: number; brochurePage: number|null; masterPage: 8;
  planFileId: string|null; masterFileId: string;
  brochureArea: number|null; sheetArea: number|null;
  status: "matched"|"needs-review"|"out-of-scope";
  reason?: string;
};
const groups: { phase:1|2;type:number;buildings:number[] }[]=[
  {phase:1,type:1,buildings:[1,14]},
  {phase:1,type:2,buildings:[2,3,12,13]},
  {phase:1,type:3,buildings:[4,5,6,9,10,11]},
  {phase:1,type:4,buildings:[7,8]},
  {phase:1,type:5,buildings:[15,16,17,18]},
  {phase:2,type:1,buildings:[20,21]},
  {phase:2,type:2,buildings:[19]},
  {phase:2,type:3,buildings:[22,23,24,25,31]},
  {phase:2,type:4,buildings:[26,27,28,29,30]}
];
export function vidaGroupForBuilding(building:number) {
  return groups.find(g=>g.buildings.includes(building))||null;
}
function normalized(value:string):string {return value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/g,"");}
function rawField(unit:InventoryUnit,label:string):string {
  const i=(unit.sourceHeaders||[]).findIndex(v=>normalized(v)===normalized(label));
  return i<0?"":String(unit.sourceCells?.[i]||"").trim();
}
function areaOf(raw:string):number|null {
  const v=Number(String(raw).replace(/,/g,"").replace(/[^0-9.]/g,""));
  return Number.isFinite(v)&&v>0?v:null;
}
function toPhase(raw:string):1|2|3|null {
  const v=/\b([123])\b/.exec(raw);return v?Number(v[1]) as 1|2|3:null;
}
function labelCode(code:string) {
  // Examples: 21B-302, 10A-01, 26-104, 15-T03.
  const m=/^(\d{1,2})([AB])?\s*[-_ ]\s*(T?\d{2,3})$/i.exec(code.trim());
  if(!m)return null;
  return {building:Number(m[1]),wing:(m[2]||"").toUpperCase(),suffix:m[3].toUpperCase()};
}
const areaPages:{
  [key:string]: { [page:number]:number }
}={
 "1:1":{13:55.65,14:103,15:57.4,16:108.15},
 "1:2":{20:94.15,21:115.65,22:91.4,23:97.4,24:122.4},
 "1:4":{67:91.5,68:190,69:154.5,70:90,71:93.5,72:93.5,73:202,74:160,75:92.5,76:61},
 "1:5":{81:124.5,82:170,83:178,84:130,85:91,86:91},
 "2:1":{13:121.5,14:101,15:92.65,16:132,17:106.7},
 "2:2":{21:93,22:113.8,23:91.5,24:97.5,25:122.5},
 "2:3":{30:173.5,31:55,32:74,33:138.75},
 "2:4":{37:103.5,38:177.5,39:151.5,40:134.5,41:135.75,42:190,43:161}
};
for(const [start,base] of [["29",29],["37",37],["47",47],["57",57]] as const){
  const p=Number(start);
  // Type 3 phase 1: same gross areas but different orientation per building.
  areaPages["1:3"]||={};
  for(let i=0;i<(p===29?5:7);i++)areaPages["1:3"][p+i]=
    p===29?[170,170,54.25,73.15,136][i]:[170,170,170,170,54.25,73.15,136][i];
}
function byExactArea(phase:number,type:number,area:number|null,pages:number[]):number|null {
  if(area===null)return null;
  const map=areaPages[phase+":"+type]||{};
  const matches=pages.map(page=>({page,diff:Math.abs((map[page]||0)-area)}))
    .filter(p=>map[p.page]&&p.diff<=Math.max(1.05,area*.009))
    .sort((a,b)=>a.diff-b.diff);
  if(matches.length===0)return null;
  if(matches.length>1&&Math.abs(matches[0].diff-matches[1].diff)<.25)return null;
  return matches[0].page;
}
function pageForPhase1(type:number,building:number,wing:string,suffix:string,floor:string,area:number|null):number|null {
  const pos=suffix.startsWith("T")?Number(suffix.slice(1)):Number(suffix)%100;
  const typical=!/ground/i.test(floor)&&!suffix.startsWith("0");
  if(type===1){
    const variants=typical
      ? [["A",1,15],["A",4,15],["B",2,15],["B",3,15],["A",2,16],["A",3,16],["B",1,16],["B",4,16]]
      : [["A",1,13],["B",3,13],["A",2,14],["A",3,14],["B",1,14],["B",2,14]];
    return (variants.find(([w,p])=>w===wing&&p===pos)||[])[2] as number||null;
  }
  if(type===2){
    const variants=typical
      ? [["A",1,23],["A",2,23],["B",3,23],["B",4,23],["A",3,24],["A",4,24],["B",1,24],["B",2,24]]
      : [["A",1,20],["A",2,20],["B",3,20],["B",4,20],["A",3,21],["B",2,21],["A",4,22],["B",1,22]];
    return (variants.find(([w,p])=>w===wing&&p===pos)||[])[2] as number||null;
  }
  if(type===3){
    const base=[4,5].includes(building)?29:[6,9].includes(building)?37:building===10?47:building===11?57:null;
    if(!base)return null;
    if(typical){
      if(pos===3||pos===6)return base+(base===29?3:5);
      if(pos>=1&&pos<=4)return base+(base===29?4:6);
      return null;
    }
    if(pos===3)return base+(base===29?2:4);
    if(base===29){ if(pos===1||pos===5)return base;if(pos===2||pos===4)return base+1;return null; }
    if(base===37)return ({1:37,5:38,4:39,2:40} as Record<number,number>)[pos]||null;
    const sideA=wing==="A";
    if(pos===(sideA?1:5))return base;
    if(pos===(sideA?2:4))return base+1;
    if(pos===(sideA?4:2))return base+3;
    if(pos===(sideA?5:1))return base+4;
    return null;
  }
  if(type===4){
    if(!typical)return ({1:67,2:68,3:69,4:70} as Record<number,number>)[pos]||null;
    if(pos===1)return null; // Original brochure has two alternatives on pages 71 and 72.
    return ({2:73,3:74,4:75,5:76} as Record<number,number>)[pos]||null;
  }
  if(type===5){
    if(typical)return ({1:84,5:84,2:85,4:85,3:86} as Record<number,number>)[pos]||null;
    if(pos===3)return 83;
    // Ground plan vs duplex differ; the live inventory unit-use field disambiguates.
    return null;
  }
  return null;
}
function pageForPhase2(type:number,suffix:string,floor:string,area:number|null):number|null {
  const position=Number(suffix.replace(/^T/i,""))%100;
  const ground=/ground/i.test(floor);
  if(type===1)return byExactArea(2,1,area,ground?[13,14,15]:[16,17]);
  if(type===2)return byExactArea(2,2,area,ground?[21,22,23]:[24,25]);
  if(type===3){
    if(/ground\+first/i.test(floor))return 30;
    if(ground&&position===3)return 31;
    if(/first/i.test(floor)&&[3,6].includes(position))return 32;
    if(/second|third|fourth/i.test(floor)&&position>=1&&position<=4)return 33;
    return null;
  }
  if(type===4){
    if(ground)return ({1:37,2:38,3:39,4:40} as Record<number,number>)[position]||null;
    return ({1:41,2:42,3:43,4:41} as Record<number,number>)[position]||null;
  }
  return null;
}

export function getVidaBrochureLocation(unit:InventoryUnit):VidaLocation|null {
  if(normalized(unit.project)!=="vida")return null;
  const sourceCode=labelCode(unit.code);
  if(!sourceCode)return null;
  const {building,wing,suffix}=sourceCode;
  const group=vidaGroupForBuilding(building);
  const actualPhase=toPhase(rawField(unit,"PH"));
  const phase=group?.phase||1;
  const sheetArea=areaOf(unit.area);
  const base={phase,building,wing,floor:unit.floor,unitCode:unit.code,
    brochureType:group?.type||0,masterPage:8 as const,sheetArea};
  const masterFileId=vidaBrochureFileIds[`p${phase}_master.jpg`]||"";
  const unsafe=(reason:string,status:"needs-review"|"out-of-scope"="needs-review"):VidaLocation=>({
    ...base,brochurePage:null,planFileId:null,masterFileId,brochureArea:null,status,reason
  });
  if(!group||!actualPhase||actualPhase!==phase)
    return unsafe("Phase or building conflicts with the official brochure; no plan selected.","out-of-scope");
  const sheetBuilding=rawField(unit,"Building");
  const buildingMatch=/\b(\d{1,2})\s*([AB])?\s*$/i.exec(sheetBuilding);
  if(!buildingMatch||Number(buildingMatch[1])!==building||
    (wing&&buildingMatch[2]&&wing!==buildingMatch[2].toUpperCase()))
    return unsafe("Building/wing in the live inventory does not match the selected code.");
  const typeNo=Number(/\b([1-5])\b/.exec(rawField(unit,"TYPE"))?.[1]||0);
  if(typeNo!==group.type)return unsafe("Building type conflicts with the official brochure.");
  if(phase===1&&group.type===5&&/ground/i.test(unit.floor)){
    // Type 05 has overlapping ground/duplex code labels.
    return unsafe("Original Type 05 ground and duplex numbering requires engineering review.");
  }
  let page=phase===1
    ?pageForPhase1(group.type,building,wing,suffix,unit.floor,sheetArea)
    :pageForPhase2(group.type,suffix,unit.floor,sheetArea);
  if(!page)return unsafe("No unique, verified brochure page for this building, floor and unit code.");
  const brochureArea=areaPages[phase+":"+group.type]?.[page]||null;
  // Check living-area discrepancy separately from the original garden/roof size.
  if(sheetArea!==null&&brochureArea!==null&&
    Math.abs(sheetArea-brochureArea)>Math.max(1.05,sheetArea*.009))
    return unsafe(`Brochure area ${brochureArea} sqm differs from live inventory ${sheetArea} sqm; plan withheld for review.`);
  const planFileId=vidaBrochureFileIds[`p${phase}_${String(page).padStart(2,"0")}.jpg`];
  if(!planFileId)return unsafe("Verified brochure crop is missing from private assets.");
  return {...base,brochurePage:page,planFileId,masterFileId,brochureArea,status:"matched"};
}
