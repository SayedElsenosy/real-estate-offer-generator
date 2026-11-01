import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { unitTypeColumn } from "../src/lib/unit-type.ts";

for (const header of [
  "Unit Type", "TYPE", "Type of Unit", "Property Type", "Unit Category",
  "Unit Usage", "نوع الوحدة", "نوع الوحده", "تصنيف الوحدة"
]) {
  assert.equal(unitTypeColumn(["Unit Code","Status",header,"Price"]),2,header);
}
assert.equal(unitTypeColumn(["Unit Code","Status","Price"]),-1,
  "No type column must remain unknown, not inferred.");
assert.equal(unitTypeColumn(["Type","نوع الوحدة","Status"]),-1,
  "Ambiguous sources must not silently choose a type.");
const read = p => readFileSync("src/"+p,"utf8");
const sheets=read("lib/sheets.ts");
const excel=read("lib/excel-inventory.ts");
const studio=read("components/Studio.tsx");
const cairo=read("components/CairoPlazaInteractiveMap.tsx");
const nasa=read("components/NasaInteractiveMap.tsx");
const plans=read("components/ArchitecturalPlan.tsx");
assert.match(sheets,/unitTypeColumn\(headers\)/);
assert.match(excel,/unitTypeColumn\(headings\)/);
for (const [name,source] of [
  ["Studio",studio],["Cairo Plaza",cairo],["NASA",nasa],["Architectural Plan",plans]
]) {
  assert.match(source,/unit\.type|chosen\.live\?\.type|currentStock\?\.type/,name+" must display actual source type");
}
console.log("PASS: optional authoritative Unit Type from Arabic/English Sheet/XLSX headers and unit selection views");
