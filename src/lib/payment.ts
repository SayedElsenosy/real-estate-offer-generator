import Decimal from "decimal.js";

export type PaymentTerms = {
  name: string;
  downPaymentPct: string;
  months: number;
  maintenancePct: string;
  startOffsetMonths: number;
  installmentIntervalMonths?: number;
  deliveryDate?: string | null;
  deliveryCollectionEnabled?: boolean;
  deliveryCollectionPct?: string | null;
};
export type ScheduleRow = {
  number: number | null;
  type: "DOWN_PAYMENT" | "INSTALLMENT" | "MAINTENANCE" | "DELIVERY";
  due: string;
  amount: string;
};
function shiftMonths(original: Date, offset: number): string {
  const start = new Date(Date.UTC(original.getUTCFullYear(), original.getUTCMonth() + offset, 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), Math.min(original.getUTCDate(), end))).toISOString().slice(0, 10);
}
export function validIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
export function calculateSchedule(priceInput: string, terms: PaymentTerms, issueDate: Date) {
  const price = new Decimal(priceInput.replace(/[,\s]/g, ""));
  if (!price.isFinite() || price.lte(0)) throw new Error("Unit price is not a positive numeric amount");
  if (!Number.isInteger(terms.months) || terms.months < 1 || terms.months > 360) throw new Error("Unsupported payment duration");
  if (!Number.isInteger(terms.startOffsetMonths) || terms.startOffsetMonths < 0 || terms.startOffsetMonths > 120) throw new Error("Invalid first installment offset");
  const interval = terms.installmentIntervalMonths ?? 1;
  if (!Number.isInteger(interval) || interval < 1 || interval > 36)
    throw new Error("Installment interval must be an integer from 1 to 36 months");
  // Duration includes the deposit as payment #1 if a deposit exists.
  // Example: 80 monthly months = deposit + 79 installments; 36 quarterly months = deposit + 11.
  // A zero-down plan has no deposit row and retains all installment slots.
  const totalSlots = Math.ceil(terms.months / interval);
  const hasDownPayment = new Decimal(terms.downPaymentPct).gt(0);
  const futureInstallmentCount = totalSlots - (hasDownPayment ? 1 : 0);
  if (futureInstallmentCount > 0) {
    const lastDueOffset = terms.startOffsetMonths + (futureInstallmentCount - 1) * interval;
    if (lastDueOffset > terms.months)
      throw new Error("Installment dates exceed the total duration; adjust first installment offset or interval");
  }
  const percent = new Decimal(terms.downPaymentPct);
  const maintenancePercent = new Decimal(terms.maintenancePct);
  const deliveryPercent = terms.deliveryCollectionEnabled ? new Decimal(terms.deliveryCollectionPct || 0) : new Decimal(0);
  if (!percent.isFinite() || !maintenancePercent.isFinite() || !deliveryPercent.isFinite() ||
      percent.lt(0) || percent.gt(100) || maintenancePercent.lt(0) || maintenancePercent.gt(100) ||
      deliveryPercent.lt(0) || deliveryPercent.gt(100) || percent.plus(deliveryPercent).gt(100))
    throw new Error("Invalid payment percentages: down payment plus delivery collection cannot exceed 100%");
  const deliveryDate = terms.deliveryDate || null;
  if (deliveryDate && !validIsoDate(deliveryDate)) throw new Error("Invalid delivery date");
  if (terms.deliveryCollectionEnabled && (!deliveryDate || !deliveryPercent.gt(0)))
    throw new Error("An enabled delivery collection requires a delivery date and a positive percentage");
  const down = price.mul(percent).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const delivery = price.mul(deliveryPercent).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const maintenance = price.mul(maintenancePercent).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const remainder = price.minus(down).minus(delivery);
  if (remainder.gt(0) && futureInstallmentCount === 0)
    throw new Error("The duration and interval allow only the down payment; choose a longer term or a shorter interval");
  const ordinary = futureInstallmentCount > 0
    ? remainder.div(futureInstallmentCount).toDecimalPlaces(2, Decimal.ROUND_DOWN) : new Decimal(0);
  const rows: ScheduleRow[] = hasDownPayment
    ? [{ number: 1, type: "DOWN_PAYMENT", due: issueDate.toISOString().slice(0, 10), amount: down.toFixed(2) }]
    : [];
  if (remainder.gt(0)) {
    for (let i = 0; i < futureInstallmentCount; i++) {
      rows.push({ number: i + (hasDownPayment ? 2 : 1), type: "INSTALLMENT",
        due: shiftMonths(issueDate, terms.startOffsetMonths + i * interval),
        amount: (i === futureInstallmentCount - 1
          ? remainder.minus(ordinary.mul(futureInstallmentCount - 1)) : ordinary).toFixed(2) });
    }
  }
  if (terms.deliveryCollectionEnabled && deliveryDate) {
    rows.push({ number: null, type: "DELIVERY", due: deliveryDate, amount: delivery.toFixed(2) });
  }
  if (maintenance.gt(0)) rows.push({ number: null, type: "MAINTENANCE", due: issueDate.toISOString().slice(0, 10), amount: maintenance.toFixed(2) });
  const rank = (type: ScheduleRow["type"]) => type === "DOWN_PAYMENT" ? 0 : type === "INSTALLMENT" ? 1 : type === "DELIVERY" ? 2 : 3;
  rows.sort((a, b) => a.due.localeCompare(b.due) || rank(a.type) - rank(b.type));
  return { name: terms.name, durationMonths: terms.months, installmentIntervalMonths: interval,
    paymentCount: remainder.gt(0) ? totalSlots : (hasDownPayment ? 1 : 0), futureInstallmentCount: remainder.gt(0) ? futureInstallmentCount : 0,
    totalPrice: price.toFixed(2), downPayment: down.toFixed(2),
    deliveryDate, deliveryCollection: delivery.toFixed(2),
    deliveryCollectionPct: deliveryPercent.toFixed(4),
    maintenance: maintenance.toFixed(2), totalIncludingMaintenance: price.plus(maintenance).toFixed(2), rows };
}
