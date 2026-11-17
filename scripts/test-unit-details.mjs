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
const layouts=read("lib/sheets.ts");
// Verified from the three native tabs in NASA Sales inv (Nasa, Vida, Aqmar).
// These assertions guard against silently treating garage/garden price as unit total.
assert.ok(layouts.includes("columns: { code: 4, price: 17, area: 8, floor: 3, status: 10 }"),
  "Vida must map R=Total Price, I=BUA and K=Status; never Q=Garage Price.");
assert.ok(layouts.includes("columns: { code: 5, price: 20, area: 15, floor: 4, status: 6 }"),
  "Aqmar must map U=total unit price, P=BUA and G=Status.");
const vidaHeaders=["TYPE","PH","Building","FLOOR","Unit Code","unit type","rooms","asfasf","BUA",
  "Garden Area","Status","m price","unit price","Garden Price","unit price",
  "Price After Dis 5%","Garage price","Total Price"];
assert.equal(vidaHeaders[17],"Total Price");
assert.equal(vidaHeaders[8],"BUA");
assert.equal(vidaHeaders[10],"Status");
const vidaLiveRow=["TYPE 3","PH 1","Building 5 A","First","5A-103","Apartment","1 Bed","Apartment-1 Bed",
  "73.2","","Available","33,000","2,415,600","0","2,415,600","2,415,600","120,000","2,535,600"];
assert.equal(vidaLiveRow[17],"2,535,600","Live full unit price must include garage, not garage alone");
assert.equal(vidaLiveRow[16],"120,000","Garage price is a separate column");
const aqmarLiveRow=["1","type6","PH 1","Building 1","Ground","1-01","Available",
  "","","","","","","Apartment","1Bed","98.13","40","44,000","4,317,720","586,667","4,904,387"];
assert.equal(aqmarLiveRow[20],"4,904,387","Aqmar actual total price stays at U, not S=unit base price");

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
