import assert from "node:assert/strict";
import {calculateSchedule} from "../src/lib/payment.ts";
import {projectPaymentOverrides} from "../src/lib/project-payment-overrides.ts";

const amount="3443125";
const day=new Date("2026-11-05T00:00:00Z");
const maintenance="275450.00"; // 8% of original 3,443,125
const base={
  maintenancePct:"8",startOffsetMonths:3,installmentIntervalMonths:3,
  deliveryCollectionEnabled:false,quarterlyEndAtTerm:true,
  ordinaryInstallmentRebate:"3"
};

const eight=calculateSchedule(amount,{
  ...base,name:"Vida 8 Years",months:96,downPaymentPct:"5",
  discountPct:"0",secondDownPaymentPct:"5",secondDownOffsetMonths:30,
  ...projectPaymentOverrides("vida","vida-8-years")
},day);
assert.equal(eight.futureInstallmentCount,31);
assert.equal(eight.rows.filter(r=>r.type==="INSTALLMENT").length,31);
assert.equal(eight.rows.find(r=>r.type==="SECOND_DOWN_PAYMENT")?.due,"2029-05-05");
assert.equal(eight.rows.filter(r=>r.due==="2029-05-05").length,1,
  "Special 5% replaces ordinary quarter at month 30");
assert.equal(eight.rows.find(r=>r.type==="INSTALLMENT")?.due,"2027-02-05");
assert.equal(eight.rows.at(-2)?.due,"2034-11-05");
assert.equal(eight.rows.at(-1)?.type,"MAINTENANCE");
assert.equal(eight.rows.at(-1)?.due,"");
assert.equal(eight.maintenance,maintenance);
assert.equal(eight.totalPrice,"3443125.00");

const six=calculateSchedule(amount,{
  ...base,name:"Vida 6.5 Years (20% Discount)",months:78,
  downPaymentPct:"15",discountPct:"20",
  secondDownPaymentPct:"5",secondDownOffsetMonths:3,
  ...projectPaymentOverrides("vida","vida-6-5-years")
},day);
assert.equal(six.discountPct,"20.0000");
assert.equal(six.totalPrice,"2754500.00");
assert.equal(six.futureInstallmentCount,25);
assert.equal(six.rows.filter(r=>r.type==="INSTALLMENT").length,25);
assert.equal(six.rows.find(r=>r.type==="SECOND_DOWN_PAYMENT")?.due,"2027-02-05");
assert.equal(six.rows.find(r=>r.type==="INSTALLMENT")?.due,"2027-05-05");
assert.equal(six.rows.at(-2)?.due,"2033-05-05");
assert.equal(six.maintenance,maintenance,"Maintenance must be 8% of original, not discounted selling price");
assert.equal(six.rows.at(-1)?.due,"");
assert.equal(six.totalIncludingMaintenance,"3029950.00");

const unrelated=projectPaymentOverrides("nasa","vida-8-years");
assert.deepEqual(unrelated,{}, "No change to NASA or Cairo Plaza payment logic.");
console.log("PASS: actual Vida 8y and discounted 6.5y Excel schedules; extra 5% position; 8% original-price maintenance; original terms preserved");
