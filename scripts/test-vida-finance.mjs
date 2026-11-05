import assert from "node:assert/strict";
import Decimal from "decimal.js";
import {readFileSync} from "node:fs";
import {calculateVidaWorkbookSchedule,vidaWorkbookPlans,VIDA_WORKBOOK_PLAN_IDS} from "../src/lib/vida-payments.ts";

const basePrice="3443125";
const issued=new Date("2026-11-05T00:00:00.000Z");
const [eightId,sixId]=VIDA_WORKBOOK_PLAN_IDS;
const eight=calculateVidaWorkbookSchedule(basePrice,eightId,issued);
const six=calculateVidaWorkbookSchedule(basePrice,sixId,issued);
const payments=vidaWorkbookPlans();
assert.equal(payments.length,2);
assert.equal(payments[0].id,eightId);
assert.equal(payments[1].id,sixId);
assert.equal(eight.originalPrice,"3443125.00");
assert.equal(eight.totalPrice,"3443125.00");
assert.equal(eight.downPayment,"172156.25");
assert.equal(eight.rows.filter(x=>x.type==="INSTALLMENT").length,32);
assert.equal(eight.rows[1].due,"2027-02-05");
assert.equal(eight.rows[10].amount,"172156.25","The 10th 8-year quarterly payment is 5%");
assert.equal(eight.rows[1].amount,"99958.69","8-year ordinary installment derived from Main!E9");
assert.equal(eight.rows[32].due,"2034-11-05","Last installment at month 96");
assert.equal(eight.maintenance,"275450.00","Maintenance 8% of original list price per Main!E43");
assert.equal(eight.rows.at(-1).type,"MAINTENANCE");
assert.equal(eight.rows.at(-1).due,"");

assert.equal(six.originalPrice,"3443125.00");
assert.equal(six.totalPrice,"2754500.00","20% discount Main!K7");
assert.equal(six.downPayment,"413175.00","15% down on discounted price Main!K8");
assert.equal(six.rows.filter(x=>x.type==="INSTALLMENT").length,26);
assert.equal(six.rows[1].amount,"137725.00","Special first quarter is 5% Main!K9");
assert.equal(six.rows[2].amount,"88141.00","Regular quarterly amount Main!K10");
assert.equal(six.rows[26].due,"2033-05-05","Last installment month 78");
assert.equal(six.maintenance,"275450.00","Maintenance is computed on original, not discounted price");
assert.equal(six.rows.at(-1).due,"");

for(const p of [eight,six]){
 assert.equal(p.paymentCount,p.futureInstallmentCount+1,"Down payment occupies a financial slot");
 assert.equal(p.rows.length,p.paymentCount+1,"Plus separate final maintenance");
 const sum=p.rows.reduce((v,row)=>v.plus(row.amount),new Decimal(0));
 assert.equal(sum.toFixed(2),p.totalIncludingMaintenance,"Every cent must balance");
 assert.ok(p.rows.every(x=>/^\\d+\\.\\d{2}$/.test(x.amount)),"All amounts are two-decimal EGP");
 assert.equal(p.rows.filter(x=>x.type==="MAINTENANCE").length,1);
}
const server=readFileSync("src/app/api/offers/route.ts","utf8");
const ui=readFileSync("src/components/Studio.tsx","utf8");
const read=readFileSync("src/lib/public-data.ts","utf8");
assert.match(server,/calculateVidaWorkbookSchedule\(unit.price,plan.id,date\)/);
assert.match(ui,/calculateVidaWorkbookSchedule\(unit.price,plan.id,date\)/);
assert.match(read,/p.id==="vida" \? vidaWorkbookPlans\(\)/);
assert.match(read,/projectId==="vida" \? vidaWorkbookPlans\(\)/);
console.log("PASS: Vida financial plans exactly reproduce 8-year/6.5-year workbook sample values, 5% special quarters, quarter dates, original-price 8% maintenance, final rounding and UI/server parity");
