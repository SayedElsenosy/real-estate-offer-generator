import Decimal from "decimal.js";

/**
 * Display-only money formatter for downloaded offers.
 * The payment engine continues calculating to two decimal places; only
 * unnecessary trailing fractional zeros are removed from the PDF.
 *
 * 28,800,000.00 -> 28,800,000
 * 1,250.50      -> 1,250.5
 * 1,250.05      -> 1,250.05
 */
export function formatOfferMoney(value: unknown): string {
  const original = String(value ?? "").trim();
  const raw = original.replace(/,/g, "");
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(raw)) return original || "-";
  try {
    const number = new Decimal(raw);
    if (!number.isFinite()) return original || "-";
    const [whole, cents = ""] = number.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      .toFixed(2).split(".");
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const fraction = cents.replace(/0+$/, "");
    return fraction ? grouped + "." + fraction : grouped;
  } catch {
    return original || "-";
  }
}
