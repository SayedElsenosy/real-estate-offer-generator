import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {matchVidaBrochure,VIDA_BROCHURE_ASSET_DRIVE_ID} from "../src/lib/vida-brochure.ts";
const headers=["TYPE","PH","Building","FLOOR","Unit Code","unit type","rooms","BUA","Garden Area","Status","Total Price"];
function unit({code,building,phase,type,floor,area,kind="Apartment"}){
 const cells=[type,"PH "+phase,building,floor,code,kind,"",String(area),"","Available","4,000,000"];
 return {code,price:"4000000",area:String(area),floor,status:"Available",project:"Vida",
   type:kind,sourceHeaders:headers,sourceCells:cells};
}
const examples=[
 [unit({code:"5A-103",building:"Building 5 A",phase:1,type:"TYPE 3",floor:"First",area:73.2}),
   {phase:1,building:5,assetGroup:"p1-t3a",floorPage:27,unitPage:32}],
 [unit({code:"10A-01",building:"Building 10 A",phase:1,type:"TYPE 3",floor:"Ground+First",area:170,kind:"Duplex"}),
   {phase:1,building:10,assetGroup:"p1-t3c",floorPage:44,unitPage:47}],
 [unit({code:"10B-304",building:"Building 10 B",phase:1,type:"TYPE 3",floor:"Third",area:136}),
   {phase:1,building:10,assetGroup:"p1-t3c",floorPage:46,unitPage:53}],
 [unit({code:"21B-02",building:"Building 21 B",phase:2,type:"Type1",floor:"Ground",area:121}),
   {phase:2,building:21,assetGroup:"p2-t1",floorPage:11,unitPage:13}],
 [unit({code:"22-05",building:"Building 22",phase:2,type:"Type3",floor:"Ground+First",area:173.5,kind:"Duplex"}),
   {phase:2,building:22,assetGroup:"p2-t3",floorPage:27,unitPage:30}],
 [unit({code:"26-104",building:"Building 26",phase:2,type:"Type4",floor:"First",area:133.5}),
   {phase:2,building:26,assetGroup:"p2-t4",floorPage:36,unitPage:null}]
];
for(const [input, expected] of examples){
 const actual=matchVidaBrochure(input);
 assert.ok(actual,input.code+" must resolve its verified floor reference");
 for(const [key,val] of Object.entries(expected))assert.equal(actual[key],val,input.code+" "+key);
 assert.equal(actual.unitCode,input.code);
}
assert.equal(matchVidaBrochure(unit({code:"32A-01",building:"Building 32 A",phase:3,type:"TYPE 2",floor:"Ground",area:93})),null,
 "Phase 3 cannot use phase 1 or 2 drawings");
assert.equal(matchVidaBrochure(unit({code:"21B-02",building:"Building 20 B",phase:2,type:"Type1",floor:"Ground",area:121})),null,
 "Never use another building's plan");
assert.equal(matchVidaBrochure(unit({code:"22-05",building:"Building 22",phase:2,type:"Type4",floor:"Ground+First",area:173.5,kind:"Duplex"})),null,
 "Never use a mismatched building type");
assert.equal(matchVidaBrochure(unit({code:"21B-02",building:"Building 21 B",phase:2,type:"Type1",floor:"Ground",area:89})).unitPage,null,
 "Missing exact brochure area must not substitute another unit plan");
assert.equal(VIDA_BROCHURE_ASSET_DRIVE_ID,"1HvsE5zVPpzJlYtkGUArlO9o_ByzfEpWz",
 "Use visually reviewed masterplan crop v2");
const read=p=>readFileSync("src/"+p,"utf8");
const api=read("app/api/offers/route.ts");
const studio=read("components/Studio.tsx");
const assets=read("app/api/vida/assets/route.ts");
const english=read("lib/workers-pdf.ts"), arabic=read("lib/arabic-pdf.ts");
assert.match(api,/matchVidaBrochure\(unit\)/);
assert.match(api,/const \{sourceHeaders,sourceCells,\.\.\.publicUnit\}=unit/);
assert.match(studio,/loadVidaBrochureImages/);
assert.match(assets,/await currentUser\(\)/);
assert.match(assets,/Cache-Control":"private, no-store/);
for(const source of [english,arabic]){
 assert.match(source,/drawVidaLocationCrops/);
 assert.match(source,/drawOriginalVidaCrop/);
}
console.log("PASS: 86-row Vida inventory mapping samples; original phase 1/2 crops; phase 3 rejection; ambiguous area safe fallback; private assets");
