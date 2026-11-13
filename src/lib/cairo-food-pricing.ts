import Decimal from "decimal.js";

/**
 * Food and beverage values from Cairo Plaza's original, read-only XLSX:
 * "Gross Area (sqm)", "Price per sqm", "Out Area",
 * "Price per sqm ( Out area )" and "Total Price".
 *
 * Source rates are in EGP thousands in the verified November 2026 workbook.
 * Never guess units: reconcile (indoor × rate + outdoor × rate) against
 * the actual total before publishing either rate in EGP.
 */
export type CairoFoodPricing = {
  indoorAreaSqm: string;
  outdoorAreaSqm: string;
  indoorRateEgp: string;
  outdoorRateEgp: string;
};

function norm(value: unknown): string {
  return String(value ?? "").normalize("NFKC").trim().toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]/g, "");
}

function getCell(headers: readonly string[], cells: readonly string[], header: string): string | null {
  const matched = headers.map((value, i) => norm(value)===norm(header) ? i : -1).filter(i=>i>=0);
  if(matched.length!==1)return null;
  return String(cells[matched[0]] ?? "").trim();
}
function decimal(value: string | null): Decimal | null {
  if(value===null)return null;
  const cleaned=value.replace(/[,\s]/g, "");
  if(!/^\d+(?:\.\d+)?$/.test(cleaned))return null;
  const d=new Decimal(cleaned);
  return d.isFinite()&&d.gt(0)?d:null;
}

export function getCairoFoodPricing(
  headers: readonly string[], cells: readonly string[], type: string, liveTotal: string
): CairoFoodPricing | null {
  if(norm(type)!=="foodandbeverage")return null;
  const indoor=decimal(getCell(headers,cells,"Gross Area (sqm)"));
  const outdoor=decimal(getCell(headers,cells,"Out Area"));
  const inRate=decimal(getCell(headers,cells,"Price per sqm"));
  const outRate=decimal(getCell(headers,cells,"Price per sqm ( Out area )"));
  const total=decimal(liveTotal);
  if(!indoor||!outdoor||!inRate||!outRate||!total)return null;
  const rawTotal=indoor.mul(inRate).plus(outdoor.mul(outRate));
  // Both original row and total must agree; don't infer a price from a
  // different sheet, wrong unit, or a missing/ambiguous column.
  const conversion=[new Decimal(1000),new Decimal(1)].find(scale=>
    rawTotal.mul(scale).minus(total).abs().lte(new Decimal("1")));
  if(!conversion)return null;
  return {
    indoorAreaSqm:indoor.toString(),
    outdoorAreaSqm:outdoor.toString(),
    indoorRateEgp:inRate.mul(conversion).toFixed(2),
    outdoorRateEgp:outRate.mul(conversion).toFixed(2)
  };
}
