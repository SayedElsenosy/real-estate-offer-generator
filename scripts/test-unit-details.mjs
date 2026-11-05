import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {unitTypeColumnForProject} from "../src/lib/unit-type.ts";
import {extractUnitSourceFields} from "../src/lib/unit-details.ts";

const nasaHeaders=["","BUILDING","FLOOR","TYBE","UNIT CODE","Gross Area",
  "Outdoor","price/m","total indoor price","total outdoor price",
  "total unit","TOTAL UNIT AFTAR DISCOUNT 5%","Maintenance8%","Status"];
const nasaRow=["","B 6","Third","Admin","B6_303","138.74","",
  "110,000","15,261,400","0","15,261,400","14,498,330","1,159,866","Available"];
assert.equal(unitTypeColumnForProject(nasaHeaders,"Nasa"),3);
assert.equal(nasaRow[unitTypeColumnForProject(nasaHeaders,"NASA")],"Admin");
const fields=extractUnitSourceFields(nasaHeaders,nasaRow);
assert.deepEqual(fields.map(x=>x.label),nasaHeaders.slice(1));
assert.equal(fields.find(x=>x.label==="Gross Area")?.value,"138.74");
assert.equal(fields.find(x=>x.label==="TYBE")?.value,"Admin");
assert.equal(fields.find(x=>x.label==="Maintenance8%")?.value,"1,159,866");
assert.equal(fields.find(x=>x.label==="Outdoor")?.value,"");

const aqmarHeaders=["","Type","Phase1","Building","FLOOR","Unit","Status",
  "reservation date","Contract Date","month","Payment plan","دولي/محلي",
  "Notes","TYPE","ROOM","BUA","Garden Area"];
assert.equal(unitTypeColumnForProject(aqmarHeaders,"Aqmar"),13,
  "Aqmar's Unit Type is at column N, not column B");
const aqmarFields=extractUnitSourceFields(aqmarHeaders,aqmarHeaders);
assert.equal(aqmarFields.filter(x=>x.label.toLowerCase()==="type").length,2,
  "Duplicate headers are preserved with unique column indices");
assert.ok(!aqmarFields.some(x=>x.label==="Notes"||x.label==="Contract Date"||
  x.label==="reservation date"),"Exclude private buyer/contract notes");
assert.equal(unitTypeColumnForProject(["Unit Code","Unit Type"],"Kawn"),1);
assert.equal(unitTypeColumnForProject(["TYPE","PH","Building","FLOOR","Unit Code","unit type"],"Vida"),5);
assert.equal(unitTypeColumnForProject(["Code","Price","Status"],"Cairo Plaza"),-1);
assert.deepEqual(extractUnitSourceFields(["Buyer name","Mobile number","Property Type","Notes"],
  ["Example","010...","Admin","private"]),[{column:3,label:"Property Type",value:"Admin"}]);

const read=p=>readFileSync("src/"+p,"utf8");
const inventory=read("app/api/inventory/route.ts");
const detailApi=read("app/api/unit-details/route.ts");
assert.match(inventory,/sourceUnits\.map\(\(\{sourceHeaders,sourceCells,\.\.\.publicUnit\}\)=>publicUnit\)/,
  "Bulk 10-second polling must not return complete raw rows");
assert.match(detailApi,/await currentUser\(\)/,"Single-unit details must require authenticated user");
assert.match(detailApi,/unitKey\(u\.code\)===unitKey\(code\)/,
  "Match by selected unit in the requested project only");
for(const path of ["Studio","CairoPlazaInteractiveMap","NasaInteractiveMap","ArchitecturalPlan"]) {
  assert.match(read("components/"+path+".tsx"),/UnitSourceDetails/,
    path+" must show complete source details when selected");
}
console.log("PASS: actual NASA TYBE=Admin, Aqmar/Vida/Kawn project mappings, every safe source column, protected detail API and lean polling");
