import assert from "node:assert/strict";
import Decimal from "decimal.js";
import {calculateSchedule} from "../src/lib/payment.ts";
const start=new Date("2026-10-01T00:00:00Z");
const base={name:"NASA source",discountPct:"5",maintenancePct:"8",installmentIntervalMonths:3,
  startOffsetMonths:3,quarterlyEndAtTerm:true,ordinaryInstallmentRebate:"3",
  secondDownPaymentPct:"0",secondDownOffsetMonths:0,
  deliveryCollectionEnabled:false,downPaymentPct:"10",months:144,
  maintenanceDueDate:"2030-10-01"};
function verify(term,expect){
  const s=calculateSchedule("9541800",term,start);
  const deposit=s.rows.filter(r=>r.type==="DOWN_PAYMENT");
  const second=s.rows.filter(r=>r.type==="SECOND_DOWN_PAYMENT");
  const inst=s.rows.filter(r=>r.type==="INSTALLMENT");
  assert.equal(s.originalPrice,"9541800.00");
  assert.equal(s.totalPrice,"9064710.00");
  assert.equal(s.maintenance,"725176.80");
  assert.equal(s.totalIncludingMaintenance,"9789886.80");
  assert.equal(deposit.length,1);
  assert.equal(inst.length,expect.count);
  assert.equal(second.length,expect.second?1:0);
  assert.equal(inst[0].due,expect.first);
  assert.equal(inst.at(-1).due,expect.last);
  assert.equal(inst[0].amount,expect.amount);
  assert.equal(s.downPayment,expect.down);
  assert.equal(s.secondDownPayment,expect.second||"0.00");
  assert.equal(s.rows.filter(r=>r.type!=="MAINTENANCE").reduce(
    (sum,r)=>sum.plus(r.amount),new Decimal(0)).toFixed(2),"9064710.00");
  assert.equal(s.rows.reduce((sum,r)=>sum.plus(r.amount),new Decimal(0)).toFixed(2),"9789886.80");
  assert.ok(new Decimal(inst.at(-1).amount).gt(new Decimal(inst[0].amount)));
  return s;
}
verify(base,{count:48,first:"2027-01-01",last:"2038-10-01",amount:"169960.31",down:"906471.00"});
verify({...base,name:"10 Years",months:120,downPaymentPct:"5"},
  {count:40,first:"2027-01-01",last:"2036-10-01",amount:"215283.86",down:"453235.50"});
const nine=verify({...base,name:"9 Years",months:111,downPaymentPct:"2.5",
  secondDownPaymentPct:"2.5",secondDownOffsetMonths:3},
  {count:36,first:"2027-04-01",last:"2036-01-01",amount:"239204.62",
  down:"226617.75",second:"226617.75"});
assert.equal(nine.rows.find(r=>r.type==="SECOND_DOWN_PAYMENT")?.due,"2027-01-01");
assert.equal(nine.rows.find(r=>r.type==="SECOND_DOWN_PAYMENT")?.amount,"226617.75");
console.log("PASS: NASA workbook 12y/10y/9y plans: 5% discount, 8% maintenance, precise 3 EGP rebates, 2nd deposit and exact totals");
