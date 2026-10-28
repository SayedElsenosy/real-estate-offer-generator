import assert from "node:assert/strict";
import Decimal from "decimal.js";
import { calculateSchedule } from "../src/lib/payment.ts";
const date=new Date("2026-10-29T12:00:00Z");
const terms={name:"80 month example",downPaymentPct:"10",months:80,maintenancePct:"6",
  startOffsetMonths:1,deliveryMonths:15,deliveryCollectionEnabled:true,deliveryCollectionPct:"35",
  maintenanceDueDate:"2027-04-29"};
const schedule=calculateSchedule("10000000",terms,date);
assert.equal(schedule.downPayment,"1000000.00");
assert.equal(schedule.preDeliveryTotal,"3500000.00");
assert.equal(schedule.postDeliveryTotal,"6500000.00");
assert.equal(schedule.maintenance,"600000.00");
assert.equal(schedule.maintenanceDueDate,"2027-04-29");
assert.equal(schedule.durationMonths,80);
assert.equal(schedule.installmentIntervalMonths,1);
assert.equal(schedule.rows.filter(r=>r.type==="DOWN_PAYMENT").length,1);
assert.equal(schedule.rows.filter(r=>r.type==="INSTALLMENT").length,79);
assert.equal(schedule.rows.filter(r=>r.type==="MAINTENANCE").length,1);
assert.equal(schedule.rows.find(r=>r.number===1)?.amount,"1000000.00");
assert.equal(schedule.rows.find(r=>r.number===2)?.due,"2026-11-29");
assert.equal(schedule.rows.find(r=>r.number===80)?.due,"2033-05-29");
assert.equal(schedule.rows.some(r=>r.type==="DELIVERY"),false);
const monthly=schedule.rows.filter(r=>r.type==="INSTALLMENT");
const before=monthly.filter(r=>r.due<"2028-01-29");
assert.equal(before.length,14);
assert.equal(before.reduce((a,r)=>a.plus(r.amount),new Decimal("1000000")).toFixed(2),"3500000.00");
assert.equal(schedule.rows.reduce((a,r)=>a.plus(r.amount),new Decimal(0)).toFixed(2),"10600000.00");
const zero=calculateSchedule("1000000",{...terms,downPaymentPct:"0",maintenancePct:"0",
  maintenanceDueDate:null,deliveryMonths:10,deliveryCollectionPct:"25"},date);
assert.equal(zero.rows.filter(r=>r.type==="INSTALLMENT").length,80);
assert.equal(zero.preDeliveryTotal,"250000.00");
assert.equal(zero.postDeliveryTotal,"750000.00");
assert.throws(()=>calculateSchedule("1000000",{...terms,deliveryMonths:80},date),/Delivery months/);
assert.throws(()=>calculateSchedule("1000000",{...terms,deliveryCollectionPct:"5"},date),/smaller/);
assert.throws(()=>calculateSchedule("1000000",{...terms,maintenanceDueDate:null},date),/maintenance/);
console.log("PASS: monthly pre/post delivery allocation, 80 slots, exact totals, no delivery lump sum, maintenance dates");
