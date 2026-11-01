/**
 * Optional unit-use category from the official inventory source.
 * Never derive unit type from a code, floor-plan shape, price or area.
 * Different developers use different Arabic/English header spellings.
 */
const ALIASES = new Set([
  "type", "unittype", "typeofunit", "propertytype", "unitcategory",
  "unitusage", "usage", "unituse",
  "نوع", "نوعالوحدة", "نوعالوحده", "نوعالعقار", "تصنيفالوحدة",
  "تصنيفالوحده", "استخدامالوحدة", "استخدامالوحده"
]);

function normalizeHeader(value: string): string {
  return String(value).normalize("NFKC").toLowerCase()
    .replace(/[\u064b-\u065f\u0670]/g,"")
    .replace(/[^a-z0-9\u0600-\u06ff]/g,"");
}

/** Zero-based optional column; -1 if missing or ambiguous. */
export function unitTypeColumn(headers: readonly string[]): number {
  let match = -1;
  for (let i = 0; i < headers.length; i++) {
    if (!ALIASES.has(normalizeHeader(headers[i]))) continue;
    // Refuse ambiguous headers rather than silently choose the wrong type.
    if (match !== -1) return -1;
    match = i;
  }
  return match;
}
