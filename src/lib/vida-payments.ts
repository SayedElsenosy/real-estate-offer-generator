import Decimal from "decimal.js";
import type { OfferSchedule } from "@/lib/pdf";
import type { ScheduleRow } from "@/lib/payment";

/**
 * Source: user supplied NEW VIDA 24-9-2026.xlsx > Main (rows 6..43).
 * 8 years: 5% down, 32 quarterly installments, 10th quarter is 5%;
 *   31 ordinary quarters each have a 3 EGP rebate, reconciled at last slot.
 * 6.5 years: 20% list-price discount, 15% down, 26 quarterly installments;
 *   first quarter is 5%, 25 ordinary quarters have 3 EGP rebate.
 * Maintenance: 8% of ORIGINAL unit list price, not discounted price,
 * as the workbook's maintenance total 275,450 confirms for both examples.
 */
export const VIDA_WORKBOOK_PLAN_IDS = ["vida-sheet-8-years","vida-sheet-6-5-years"] as const;
export type VidaWorkbookPlanId = typeof VIDA_WORKBOOK_PLAN_IDS[number];
type Rules={id:VidaWorkbookPlanId;name:string;term:number;discount:number;
 down:number;quarters:number;specialQuarter:number;maintenance:number};
const rules:Record<VidaWorkbookPlanId,Rules>={
 "vida-sheet-8-years": {
  id:"vida-sheet-8-years",name:"Vida · 8 Years · 5% Down (Sep 2026 Sheet)",
  term:96,discount:0,down:5,quarters:32,specialQuarter:10,maintenance:8
 },
 "vida-sheet-6-5-years": {
  id:"vida-sheet-6-5-years",name:"Vida · 6.5 Years · 20% Discount · 15% Down (Sep 2026 Sheet)",
  term:78,discount:20,down:15,quarters:26,specialQuarter:1,maintenance:8
 }
};
export function isVidaWorkbookPlanId(id:string):id is VidaWorkbookPlanId {
 return Object.prototype.hasOwnProperty.call(rules,id);
}
export function vidaWorkbookPlans() {
 return Object.values(rules).map(x=>({
  id:x.id,projectId:"vida",name:x.name,
  downPaymentPct:new Decimal(x.down),months:x.term,
  maintenancePct:new Decimal(x.maintenance),
  startOffsetMonths:3,installmentIntervalMonths:3,
  discountPct:new Decimal(x.discount),secondDownPaymentPct:new Decimal(0),
  secondDownOffsetMonths:0,quarterlyEndAtTerm:true,
  ordinaryInstallmentRebate:new Decimal(3),
  deliveryDate:null,deliveryMonths:null,
  deliveryCollectionEnabled:false,deliveryCollectionPct:new Decimal(0),
  createdAt:new Date("2026-09-24T00:00:00Z"),
  updatedAt:new Date("2026-09-24T00:00:00Z")
 }));
}
function money(v:Decimal){return v.toDecimalPlaces(2,Decimal.ROUND_HALF_UP);}
function shift(date:Date,months:number) {
 const d=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+months,1));
 const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
 d.setUTCDate(Math.min(date.getUTCDate(),last));
 return d.toISOString().slice(0,10);
}
export function calculateVidaWorkbookSchedule(listPrice:string,id:VidaWorkbookPlanId,date:Date):OfferSchedule{
 const r=rules[id];
 const original=money(new Decimal(listPrice.replace(/[,\s]/g,"")));
 if(!original.isFinite()||original.lte(0))throw Error("Vida unit live price is invalid");
 const discounted=money(original.mul(100-r.discount).div(100));
 const down=money(discounted.mul(r.down).div(100));
 const special=money(discounted.mul(5).div(100));
 const maintenance=money(original.mul(r.maintenance).div(100));
 const others=r.quarters-1;
 const pool=discounted.minus(down).minus(special);
 const regular=pool.div(others).minus(3).toDecimalPlaces(2,Decimal.ROUND_DOWN);
 if(regular.lte(0))throw Error("Vida quarterly installments would be negative");
 const lastOrdinary=pool.minus(regular.mul(others-1));
 const rows:ScheduleRow[]=[
  {number:1,type:"DOWN_PAYMENT",due:shift(date,0),amount:down.toFixed(2)}
 ];
 let ordinaryIndex=0;
 for(let i=1;i<=r.quarters;i++){
   const amount=i===r.specialQuarter?special:
     (++ordinaryIndex===others?lastOrdinary:regular);
   rows.push({number:i+1,type:"INSTALLMENT",due:shift(date,i*3),
      amount:amount.toFixed(2)});
 }
 rows.push({number:null,type:"MAINTENANCE",due:"",amount:maintenance.toFixed(2)});
 const total=rows.reduce((a,x)=>a.plus(x.amount),new Decimal(0));
 if(!total.eq(discounted.plus(maintenance)))
   throw Error("Vida workbook payment schedule did not reconcile");
 return {
  name:r.name,durationMonths:r.term,installmentIntervalMonths:3,
  paymentCount:r.quarters+1,futureInstallmentCount:r.quarters,
  originalPrice:original.toFixed(2),discountPct:r.discount.toFixed(4),
  secondDownPayment:"0.00",secondDownOffsetMonths:0,
  totalPrice:discounted.toFixed(2),downPayment:down.toFixed(2),
  deliveryMonths:0,deliveryDate:null,deliveryCollection:"0.00",deliveryCollectionPct:"0.0000",
  preDeliveryTotal:down.toFixed(2),
  postDeliveryTotal:discounted.minus(down).toFixed(2),
  maintenanceDueDate:null,maintenance:maintenance.toFixed(2),
  totalIncludingMaintenance:discounted.plus(maintenance).toFixed(2),
  rows
 };
}
