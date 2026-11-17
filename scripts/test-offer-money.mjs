import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatOfferMoney } from "../src/lib/offer-money.ts";

const cases = [
  ["28,800,000.00","28,800,000"],
  ["1,440,000.00","1,440,000"],
  ["8,640,000.00","8,640,000"],
  ["20,160,000.00","20,160,000"],
  ["0.00","0"],
  ["1,234.50","1,234.5"],
  ["1,234.05","1,234.05"],
  ["1090.99","1,090.99"],
  ["1,000,000","1,000,000"],
  ["-1250.00","-1,250"],
  ["0.01","0.01"],
  ["2026-10-29","2026-10-29"],
  ["-","-"]
];
for (const [raw, expected] of cases) {
  assert.equal(formatOfferMoney(raw), expected, "money formatting of " + raw);
}
const ar = readFileSync("src/lib/arabic-pdf.ts","utf8");
const en = readFileSync("src/lib/workers-pdf.ts","utf8");
assert.match(ar,/const amount = formatOfferMoney;/);
assert.ok(ar.includes("amount(payment.amount)"),"Arabic rows should use display money formatter");
for(const field of ["totalPrice","downPayment","preDeliveryTotal","postDeliveryTotal","maintenance","totalIncludingMaintenance"]){
  assert.ok(en.includes("formatOfferMoney(schedule."+field+")"),"English "+field+" should be formatted");
  assert.ok(ar.includes("amount(schedule."+field+")"),"Arabic "+field+" should be formatted");
}
assert.ok(en.includes("formatOfferMoney(entry.amount)"),"English installment amounts should be formatted");
console.log("PASS: no redundant decimal zeros in Arabic/English offer values; non-zero decimals preserved");
