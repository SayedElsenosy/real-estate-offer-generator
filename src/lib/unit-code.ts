/** Canonical lookup for inventory identifiers; never mutate the owner's original sheet. */
export function unitKey(code: string): string {
  return String(code).normalize("NFKC").trim().toUpperCase();
}

/**
 * Cairo Plaza basement's signed architectural PDF calls seven shops
 * A/BA/SR/NN, while the private sheet calls the same numbered, area-matched
 * units A/BA/SH/NN. Verified by PDF text and each unit's GSA (sqm):
 * 01=64, 03=158, 04=171, 05=171, 06=171, 07=180, 08=140.
 * 02 is NOT on the sheet and is intentionally excluded.
 * No arbitrary SR→SH rewrites are permitted elsewhere.
 */
const VERIFIED_CAIRO_BASEMENT_ALIASES = new Set(["01","03","04","05","06","07","08"]);
export function inventoryKeyForDrawing(code: string, projectId: string, floor: string | null | undefined): string {
  const canonical = unitKey(code);
  if (projectId === "cairo-plaza" && floor === "-1") {
    const match = /^A\/BA\/SR\/(\d\d)$/.exec(canonical);
    if (match && VERIFIED_CAIRO_BASEMENT_ALIASES.has(match[1]))
      return "A/BA/SH/" + match[1];
  }
  return canonical;
}
