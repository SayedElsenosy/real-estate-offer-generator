import Decimal from "decimal.js";

export type PaymentTerms = {
  name: string;
  downPaymentPct: string;
  months: number;
  maintenancePct: string;
  startOffsetMonths: number;
  deliveryMonths?: number;
  deliveryCollectionEnabled?: boolean;
  deliveryCollectionPct?: string | null;
  maintenanceDueDate?: string | null;
};
export type ScheduleRow = {
  number: number | null;
  type: "DOWN_PAYMENT" | "INSTALLMENT" | "MAINTENANCE";
  due: string;
  amount: string;
};
function shiftMonths(original: Date, offset: number): string {
  const month = new Date(Date.UTC(original.getUTCFullYear(), original.getUTCMonth() + offset, 1));
  const lastDay = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(),
    Math.min(original.getUTCDate(),lastDay))).toISOString().slice(0,10);
}
export function validIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value+"T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10)===value;
}
function money(value: Decimal) { return value.toDecimalPlaces(2,Decimal.ROUND_HALF_UP); }
function distribute(amount: Decimal, count: number): Decimal[] {
  if (count===0) {
    if (!amount.isZero()) throw new Error("No installment months available for this stage of payments.");
    return [];
  }
  const ordinary = amount.div(count).toDecimalPlaces(2,Decimal.ROUND_DOWN);
  return Array.from({length:count},(_,i)=>i===count-1
    ? amount.minus(ordinary.mul(count-1)) : ordinary);
}
/** Monthly offers. Down payment occupies the initial slot (month 0).
 * Delivery allocation is a TARGET amount paid cumulatively BEFORE delivery:
 * no separate cash collection or row is due on delivery.
 */
export function calculateSchedule(priceInput:string,terms:PaymentTerms,issueDate:Date) {
  const price = new Decimal(priceInput.replace(/[,\s]/g,""));
  if (!price.isFinite()||price.lte(0)) throw Error("Unit price must be a positive amount.");
  if (!Number.isInteger(terms.months)||terms.months<1||terms.months>360)
    throw Error("Payment term must be between 1 and 360 months.");
  if (!Number.isInteger(terms.startOffsetMonths)||terms.startOffsetMonths<0||terms.startOffsetMonths>120)
    throw Error("Invalid first installment offset.");
  const downPct=new Decimal(terms.downPaymentPct);
  const maintenancePct=new Decimal(terms.maintenancePct);
  const preDeliveryPct=terms.deliveryCollectionEnabled
    ? new Decimal(terms.deliveryCollectionPct||"0") : new Decimal(0);
  if([downPct,maintenancePct,preDeliveryPct].some(v=>!v.isFinite()||v.lt(0)||v.gt(100)))
    throw Error("Payment percentages must be between 0 and 100.");
  if(terms.deliveryCollectionEnabled && preDeliveryPct.lt(downPct))
    throw Error("Pre-delivery collection percentage cannot be smaller than the down payment.");
  const deliveryMonths=terms.deliveryCollectionEnabled ? Number(terms.deliveryMonths) : 0;
  if (terms.deliveryCollectionEnabled && (!Number.isInteger(deliveryMonths)||
      deliveryMonths<2||deliveryMonths>=terms.months))
    throw Error("Delivery months must be at least 2 and less than the total term.");
  const maintenanceDate=terms.maintenanceDueDate || null;
  if(maintenancePct.gt(0) && (!maintenanceDate || !validIsoDate(maintenanceDate)))
    throw Error("Choose a valid maintenance deposit due date.");
  if (maintenanceDate && !validIsoDate(maintenanceDate)) throw Error("Invalid maintenance due date.");
  const down=money(price.mul(downPct).div(100));
  const maintenance=money(price.mul(maintenancePct).div(100));
  const preDeliveryTarget=terms.deliveryCollectionEnabled
    ? money(price.mul(preDeliveryPct).div(100)) : down;
  const hasDown=down.gt(0);
  const firstFutureOffset=terms.startOffsetMonths===0?1:terms.startOffsetMonths;
  const lastOffset=terms.months-(hasDown?1:0);
  const offsets:number[]=[];
  for(let month=firstFutureOffset;month<=lastOffset;month++)offsets.push(month);
  if (!offsets.length && !price.eq(down))
    throw Error("The selected duration contains no future installment dates.");
  const before=offsets.filter(month=>deliveryMonths>0 && month<deliveryMonths);
  const after=offsets.filter(month=>deliveryMonths===0||month>=deliveryMonths);
  const beforeAmount=terms.deliveryCollectionEnabled ? preDeliveryTarget.minus(down) : new Decimal(0);
  const afterAmount=terms.deliveryCollectionEnabled ? price.minus(preDeliveryTarget) : price.minus(down);
  if(beforeAmount.lt(0)||afterAmount.lt(0))throw Error("Pre-delivery allocation exceeds the available price.");
  const rows:ScheduleRow[]=[];
  if(hasDown)rows.push({number:1,type:"DOWN_PAYMENT",due:issueDate.toISOString().slice(0,10),amount:down.toFixed(2)});
  let count=hasDown?1:0;
  const addRows=(months:number[],amount:Decimal)=>{
    const amounts=distribute(amount,months.length);
    months.forEach((month,i)=>rows.push({
      number:++count,type:"INSTALLMENT",due:shiftMonths(issueDate,month),
      amount:amounts[i].toFixed(2)
    }));
  };
  addRows(before,beforeAmount);
  addRows(after,afterAmount);
  if(maintenance.gt(0)&&maintenanceDate)
    rows.push({number:null,type:"MAINTENANCE",due:maintenanceDate,amount:maintenance.toFixed(2)});
  rows.sort((a,b)=>a.due.localeCompare(b.due) ||
    (a.type==="DOWN_PAYMENT"?-1:a.type==="MAINTENANCE"?1:0));
  const total=rows.reduce((sum,row)=>sum.plus(row.amount),new Decimal(0));
  if (!total.eq(price.plus(maintenance)))
    throw Error("Payment schedule did not balance exactly to the unit price.");
  return {
    name:terms.name,durationMonths:terms.months,installmentIntervalMonths:1,
    paymentCount:count,futureInstallmentCount:count-(hasDown?1:0),
    totalPrice:price.toFixed(2),downPayment:down.toFixed(2),
    deliveryMonths,deliveryDate:deliveryMonths>0?shiftMonths(issueDate,deliveryMonths):null,
    // The historic name is kept for PDF type compatibility, but is NOT a
    // separate delivery payment; it is the cumulative pre-delivery target.
    deliveryCollection:"0.00",deliveryCollectionPct:preDeliveryPct.toFixed(4),
    preDeliveryTotal:preDeliveryTarget.toFixed(2),
    postDeliveryTotal:price.minus(preDeliveryTarget).toFixed(2),
    maintenanceDueDate:maintenanceDate,
    maintenance:maintenance.toFixed(2),totalIncludingMaintenance:price.plus(maintenance).toFixed(2),
    rows
  };
}
