import assert from "node:assert/strict";
import fs from "node:fs";
const floorIds=["-1","0","1","2","3","4","5","6"];
const expected={"-1":18,"0":282,"1":259,"2":67,"3":35,"4":37,"5":37,"6":37};
const qualified=/^M[-\d.,L\s]+Z$/;
let sum=0,reviews=0,missing=0;
for(const floor of floorIds){
 const file=`src/data/cairo-svg-floor-${floor}.json`;
 const data=JSON.parse(fs.readFileSync(file,"utf8"));
 assert.equal(data.units.length,expected[floor],`Incorrect unit count on floor ${floor}`);
 const unique=new Set();
 for(const u of data.units){
  assert.equal(typeof u.code,"string");
  assert.ok(!unique.has(u.code),`Duplicate: ${u.code}`);
  unique.add(u.code);
  assert.equal(typeof u.d,"string",`Missing polygon for ${u.code}`);
  assert.ok(qualified.test(u.d),`Invalid SVG path for ${u.code}`);
  if(u.status==="REVIEW")reviews++;
  sum++;
 }
 console.log(`PASS floor ${floor}: ${data.units.length} polygons`);
}
assert.equal(sum,772);
const component=fs.readFileSync("src/components/CairoPlazaInteractiveMap.tsx","utf8");
assert.ok(!component.includes("<circle r={isSelected"),"Legacy marker still present");
assert.ok(!component.includes("return <g key={shape.code}"),"Legacy marker branch still present");
console.log(`PASS: ${sum} interactive polygons, zero marker fallbacks, ${reviews} review-tagged boundaries`);
