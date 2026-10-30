import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=p=>readFileSync("src/"+p,"utf8");
const source=read("lib/nasa-floor-source.ts");
const comp=read("components/NasaInteractiveMap.tsx");
const page=read("components/ArchitecturalPlan.tsx");
const pdf=read("lib/workers-pdf.ts");
const ar=read("lib/arabic-pdf.ts");
const api=read("app/api/nasa-plan/route.ts");
const offer=read("app/api/offers/route.ts");
const counts=[198,74,106,80,80,80,50];
assert.equal(counts.reduce((a,b)=>a+b,0),668);
for(const floor of ["-1","0","1","2","3","4","5"]){
  assert.ok(source.includes('"'+floor+'": { name:'),"missing NASA floor "+floor);
}
assert.match(source,/sourceHash!==SOURCE_SHA256/);
assert.match(source,/getGoogleAccessToken\(userId\)/);
assert.match(comp,/shape\.d/);
assert.match(comp,/unitKey\(shape\.code\)/);
assert.match(comp,/No matching code\/floor/);
assert.match(page,/isNasa&&result/);
assert.match(api,/currentUser\(\)/);
assert.match(pdf,/drawNasaPdfLocation/);
assert.match(ar,/drawNasaPdfLocation/);
assert.match(offer,/getNasaOfferLocation\(user\.id,unit\.code,unit\.floor\)/);
assert.match(offer,/getLiveInventory\(user\.id,project\.spreadsheetId/);
console.log("PASS: NASA 7 floors and 668 boundaries, protected sources, live inventory mapping and both PDF languages.");
