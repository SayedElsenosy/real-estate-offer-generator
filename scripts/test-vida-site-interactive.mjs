import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {vidaSiteBuildings,vidaHotspotPoints,getVidaSiteBuilding,VIDA_SITE_WIDTH,VIDA_SITE_HEIGHT} from "../src/lib/vida-site-map.ts";
import {vidaSiteAssetFileIds} from "../src/lib/vida-site-assets.ts";
const read=path=>readFileSync("src/"+path,"utf8");
assert.equal(vidaSiteBuildings.length,42,"All 42 numbered buildings on the uploaded masterplan must be present");
assert.deepEqual(vidaSiteBuildings.map(x=>x.id),Array.from({length:42},(_,i)=>i+1));
assert.equal(vidaSiteBuildings.filter(x=>x.phase===1).length,18);
assert.equal(vidaSiteBuildings.filter(x=>x.phase===2).length,13);
assert.equal(vidaSiteBuildings.filter(x=>x.phase===3).length,11);
for(const x of vidaSiteBuildings){
 assert.ok(x.cx>20&&x.cx<VIDA_SITE_WIDTH-20&&x.cy>20&&x.cy<VIDA_SITE_HEIGHT-20);
 assert.ok(x.rx>=20&&x.ry>=20&&x.rx<=75&&x.ry<=80);
 assert.equal(vidaHotspotPoints(x).split(" ").length,4,"Polygon must have four clickable corners");
 assert.equal(getVidaSiteBuilding(x.id)?.id,x.id);
}
assert.equal(Object.keys(vidaSiteAssetFileIds).length,73,
 "Full original site image + 72 original floor-locator crop images must all exist");
assert.ok(vidaSiteAssetFileIds["vida_site_original.jpg"]);
for(const filename of Object.keys(vidaSiteAssetFileIds)){
 assert.ok(filename==="vida_site_original.jpg"||/^p[12]_\\d{2}_locator\\.jpg$/.test(filename));
}
const viewer=read("components/VidaInteractiveMap.tsx");
const picker=read("components/VidaSitePicker.tsx");
const api=read("app/api/vida/artwork/route.ts");
const download=read("lib/vida-brochure-download.ts");
const pdfEn=read("lib/workers-pdf.ts");
const pdfAr=read("lib/arabic-pdf.ts");
const pdfImage=read("lib/vida-pdf-image.ts");
const studio=read("components/VidaBrochurePreview.tsx");
assert.match(viewer,/VidaSitePicker/);
assert.match(viewer,/phaseBuildings/);
assert.match(viewer,/setFloor\(/);
assert.match(viewer,/api\/vida\/lookup/);
assert.match(viewer,/page=loc-/);
assert.match(viewer,/single-unit outline|حدود الشقة الواحدة/);
assert.match(picker,/vidaHotspotPoints/);
assert.match(picker,/onSelectBuilding\(s\.id\)/);
assert.match(picker,/vida_site_original|page=site/);
assert.match(api,/await currentUser\(\)/);
assert.match(api,/siteImage=page==="site"/);
assert.match(api,/floorLocator/);
assert.match(download,/vidaSiteAssetFileIds/);
assert.match(download,/locatorImage/);
assert.match(pdfEn,/drawOriginalVidaSiteWithMarker/);
assert.match(pdfEn,/locatorImage/);
assert.match(pdfAr,/drawOriginalVidaSiteWithMarker/);
assert.match(pdfAr,/locatorImage/);
assert.match(pdfImage,/page\.drawEllipse/);
assert.match(pdfImage,/getVidaSiteBuilding\(building\)/);
assert.match(studio,/getVidaSiteBuilding\(value\.building\)/);
assert.match(studio,/page=loc-/);
console.log("PASS: original full Vida site mapped with 42 selectable building hotspots, phases 1/2 floor drilldown, 72 authentic inset crops and both PDF building markers");
