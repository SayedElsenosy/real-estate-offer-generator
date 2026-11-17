import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {getCairoFoodPricing} from "../src/lib/cairo-food-pricing.ts";

const headers=["Column 1","Project Name","phase","Building Name","Floor Number",
  "Unit Type","Gross Area (sqm)","Price per sqm","Out Area",
  "Price per sqm ( Out area )","Delivery Status","Availability Status","Total Price"];
const row=(code,type,indoor,inRate,outdoor,outRate,total)=>[
  code,"Cairo Plaza","Phase 1","A-THIRD FLOOR","3",type,String(indoor),
  String(inRate),String(outdoor),String(outRate),"Core And Shell","Available",String(total)
];
// Representative real cells from Cairo Plaza Price List.xlsx / Sheet1 as updated 2026-11-12.
const cases=[
  ["A/3RD/F&B/06",76,113.3,50,37.76666667,"10499133.33","113300.00","37766.67"],
  ["A/3RD/F&B/07",70,103,41,34.33333333,"8617666.667","103000.00","34333.33"],
  ["A/3RD/F&B/08",54,103,31,34.33333333,"6626333.333","103000.00","34333.33"],
  ["A/3RD/F&B/10",76,103,50,34.33333333,"9544666.667","103000.00","34333.33"],
  ["A/3RD/F&B/11",81,103,47,34.33333333,"9956666.667","103000.00","34333.33"],
  ["A/3RD/F&B/15",54,103,32,34.33333333,"6660666.667","103000.00","34333.33"],
  ["A/3RD/F&B/16",70,103,42,34.33333333,"8652000","103000.00","34333.33"]
];
for(const [code,inside,insidePrice,outside,outsidePrice,total,wantInside,wantOutside] of cases){
  const cells=row(code,"Food and beverage",inside,insidePrice,outside,outsidePrice,total);
  const result=getCairoFoodPricing(headers,cells,"Food and beverage",String(total));
  assert.ok(result,code+" should have verified separate prices from the same source row");
  assert.equal(result.indoorAreaSqm,String(inside));
  assert.equal(result.outdoorAreaSqm,String(outside));
  assert.equal(result.indoorRateEgp,wantInside);
  assert.equal(result.outdoorRateEgp,wantOutside);
}
const sample=row("A/3RD/F&B/06","Food and beverage",76,113.3,50,37.76666667,"10499133.33");
assert.equal(getCairoFoodPricing(headers,sample,"Retail","10499133.33"),null,"Only Food and beverage should use split price");
assert.equal(getCairoFoodPricing(headers,sample,"Food and beverage","10000000"),null,"Totals must reconcile");
assert.equal(getCairoFoodPricing([...headers,"Out Area"],[...sample,"50"],"Food and beverage","10499133.33"),null,"Duplicate headers are unsafe");
assert.equal(getCairoFoodPricing(headers,row("no-outdoor","Food and beverage",76,113.3,0,0,"8610800"),"Food and beverage","8610800"),null,"Missing outdoor area never creates a fake rate");
const read=p=>readFileSync("src/"+p,"utf8");
const studio=read("components/Studio.tsx");
const english=read("lib/workers-pdf.ts");
const arabic=read("lib/arabic-pdf.ts");
const excel=read("lib/excel-inventory.ts");
const api=read("app/api/offers/route.ts");
assert.match(studio,/availableFloors/);
assert.match(studio,/setMinArea/);
assert.match(studio,/setMaxArea/);
assert.match(studio,/setMinPrice/);
assert.match(studio,/setMaxPrice/);
assert.match(studio,/area-asc/);
assert.match(studio,/area-desc/);
assert.match(studio,/price-asc/);
assert.match(studio,/price-desc/);
assert.match(studio,/visibleUnits.length/);
assert.doesNotMatch(studio,/\.slice\(0,\s*100\)/,"Never truncate the visible sheet to first 100");
assert.match(excel,/getCairoFoodPricing\(headings,row/);
assert.match(english,/INDOOR PRICE PER SQM/);
assert.match(english,/OUTDOOR PRICE PER SQM/);
assert.match(arabic,/سعر المتر الداخلي بالجنيه/);
assert.match(arabic,/سعر المتر الخارجي بالجنيه/);
assert.match(api,/unit: offerUnit/,"Authenticated offer contains sanitized retail rate summary");
assert.match(api,/sourceHeaders: _sourceHeaders, sourceCells: _sourceCells/,"Never expose private raw sheet data in offer JSON");
console.log("PASS: all seven Cairo Plaza F&B sheet rates reconcile with original totals; 100-row UI cutoff removed; floor and min/max/range/sort filters; bilingual PDF rate separation");
