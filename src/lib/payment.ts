import Decimal from "decimal.js";

export type PaymentTerms = {
  name: string;
  downPaymentPct: string;
  months: number;
  maintenancePct: string;
  startOffsetMonths: number;
};
export type ScheduleRow = { number: number; type: "DOWN_PAYMENT" | "INSTALLMENT" | "MAINTENANCE"; due: string; amount: string };
function shiftMonths(original: Date, offset: number): string {
  const start = new Date(Date.UTC(original.getUTCFullYear(), original.getUTCMonth() + offset, 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), Math.min(original.getUTCDate(), end))).toISOString().slice(0, 10);
}
export function calculateSchedule(priceInput: string, terms: PaymentTerms, issueDate: Date) {
  const price = new Decimal(priceInput.replace(/[,\s]/g, ""));
  if (!price.isFinite() || price.lte(0)) throw new Error("Unit price is not a positive numeric amount");
  if (!(terms.months > 0 && terms.months <= 360)) throw new Error("Unsupported payment duration");
  const percent = new Decimal(terms.downPaymentPct);
  const maintenancePercent = new Decimal(terms.maintenancePct);
  if (percent.lt(0) || percent.gt(100) || maintenancePercent.lt(0) || maintenancePercent.gt(100))
    throw new Error("Invalid percentage");
  const down = price.mul(percent).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const maintenance = price.mul(maintenancePercent).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const remainder = price.minus(down);
  const ordinary = remainder.div(terms.months).toDecimalPlaces(2, Decimal.ROUND_DOWN);
  const rows: ScheduleRow[] = [{ number: 0, type: "DOWN_PAYMENT", due: issueDate.toISOString().slice(0, 10), amount: down.toFixed(2) }];
  for (let i = 0; i < terms.months; i++) {
    rows.push({ number: i + 1, type: "INSTALLMENT",
      due: shiftMonths(issueDate, terms.startOffsetMonths + i),
      amount: (i === terms.months - 1 ? remainder.minus(ordinary.mul(terms.months - 1)) : ordinary).toFixed(2) });
  }
  if (maintenance.gt(0)) rows.push({ number: terms.months + 1, type: "MAINTENANCE", due: issueDate.toISOString().slice(0, 10), amount: maintenance.toFixed(2) });
  return { name: terms.name, totalPrice: price.toFixed(2), downPayment: down.toFixed(2),
    maintenance: maintenance.toFixed(2), totalIncludingMaintenance: price.plus(maintenance).toFixed(2), rows };
}
