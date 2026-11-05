import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {getVidaBrochureLocation,vidaGroupForBuilding} from "../src/lib/vida-brochure.ts";
import {vidaBrochureFileIds} from "../src/lib/vida-brochure-assets.ts";

const sourceNames=Object.keys(vidaBrochureFileIds);
assert.equal(sourceNames.length,74,"74 original PDF JPG crops must be registered");
assert.ok(sourceNames.includes("p1_master.jpg")&&sourceNames.includes("p2_master.jpg"));
const groups=Array.from({length:31},(_,i)=>vidaGroupForBuilding(i+1));
assert.ok(groups.every(Boolean),"Buildings 1–31 must have one official brochure type");
assert.equal(vidaGroupForBuilding(32),null,"No phase 3 brochure was supplied");
const heads=["TYPE","PH","Building"];
function sample(code,floor,area,type,phase,building) {
 return {
  code,floor,area:String(area),price:"3000000",status:"Available",project:"Vida",
  sourceHeaders:heads,sourceCells:[type,"PH "+phase,"Building "+building]
 };
}
for(const [args,expectPage] of [
 [["5A-103","First",73.2,"TYPE 3",1,"5 A"],32],
 [["10A-01","Ground+First",170,"TYPE 3",1,"10 A"],47],
 [["10B-304","Third",136,"TYPE 3",1,"10 B"],53],
 [["21B-02","Ground",121,"Type1",2,"21 B"],13],
 [["20A-103","First",132,"Type1",2,"20 A"],16],
 [["23-01","Ground+First",173.5,"Type3",2,"23"],30],
 [["23-106","First",73.5,"Type3",2,"23"],32],
 [["23-302","Third",138.5,"Type3",2,"23"],33],
 [["28-03","Ground",151.5,"Type4",2,"28"],39],
 [["30-102","First",190,"Type4",2,"30"],42]
 ]) {
 const u=sample(...args);
 const result=getVidaBrochureLocation(u);
 assert.equal(result?.status,"matched","Must match brochure page for "+u.code);
 assert.equal(result?.brochurePage,expectPage,"Exact original PDF drawing page for "+u.code);
 assert.equal(result?.phase,Number(u.sourceCells[1].slice(-1)));
 assert.ok(vidaBrochureFileIds["p"+result.phase+"_"+String(expectPage).padStart(2,"0")+".jpg"]);
}
const ambiguous=sample("7-101","First",93.5,"Type4",1,"7");
assert.equal(getVidaBrochureLocation(ambiguous)?.status,"needs-review",
 "Ambiguous pages 71/72 cannot be chosen by assumption");
const conflict=sample("28-03","Ground",151.5,"Type3",2,"28");
assert.equal(getVidaBrochureLocation(conflict)?.status,"needs-review",
 "Wrong architectural type must never map");
const mismatch=sample("26-104","First",133.5,"Type4",2,"26");
assert.equal(getVidaBrochureLocation(mismatch)?.status,"needs-review",
 "Conflicting area in brochure and live inventory must not silently match");
const ph3=sample("32B-01","Ground",91.5,"Type2",3,"32 B");
assert.equal(getVidaBrochureLocation(ph3)?.status,"out-of-scope");
assert.equal(getVidaBrochureLocation({...ph3,project:"Nasa"}),null,
 "Only Vida is eligible for the brochure images");
const ui=readFileSync("src/components/VidaInteractiveMap.tsx","utf8");
const studio=readFileSync("src/components/Studio.tsx","utf8");
const offer=readFileSync("src/app/api/offers/route.ts","utf8");
const english=readFileSync("src/lib/workers-pdf.ts","utf8");
const arabic=readFileSync("src/lib/arabic-pdf.ts","utf8");
const art=readFileSync("src/app/api/vida/artwork/route.ts","utf8");
const fetching=readFileSync("src/lib/vida-brochure-download.ts","utf8");
assert.match(ui,/phaseBuildings/, "Phase+building selector present");
assert.match(ui,/setFloor/, "Floor selection present");
assert.match(ui,/api\/vida\/lookup/, "Unit-to-brochure lookup present");
assert.match(studio,/VidaBrochurePreview/, "Offer studio shows original drawing");
assert.match(offer,/getVidaPdfDrawing\(user\.id,unit\)/, "Offer keeps server side mapping");
assert.match(english,/drawOriginalVidaImage\(pdf,map/, "English PDF embeds original cropped drawing");
assert.match(arabic,/drawOriginalVidaImage\(pdf,planPage/, "Arabic PDF embeds original cropped drawing");
assert.match(art,/await currentUser\(\)/, "Brochure images are protected");
assert.match(fetching,/Object\.values\(vidaBrochureFileIds\)\.includes\(fileId\)/,
 "JPGs are retrieved only from preapproved private Drive file IDs");
console.log("PASS: Vida original PDF crops, 31 verified building groups, live unit mapping, safe skips, both PDF languages, and protected artworks");
