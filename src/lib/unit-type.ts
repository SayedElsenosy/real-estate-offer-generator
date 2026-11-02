/**
 * Optional unit-use category from the official inventory source.
 * Never derive unit type from a code, floor-plan shape, price or area.
 * Different developers use different Arabic/English header spellings.
 */
const ALIASES = new Set([
  "type", "tybe", "unittype", "typeofunit", "propertytype", "unitcategory",
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

/**
 * Verified project-specific column choices. Aqmar has two TYPE headings
 * (B and N), and NASA's official inventory spells TYPE as "TYBE" in D.
 * Keep canonical price/status mapping independent of these metadata fields.
 */
const PROJECT_TYPE_COLUMNS: Record<string, { index: number; headers: string[] }> = {
  nasa: { index: 3, headers: ["tybe","type","unittype"] },
  kawn: { index: 4, headers: ["unittype"] },
  aqmar: { index: 13, headers: ["type","unittype"] },
  vida: { index: 5, headers: ["unittype","type"] }
};

export function unitTypeColumnForProject(headers: readonly string[], projectName: string): number {
  const key = projectName.normalize("NFKC").toLowerCase().replace(/[\\s_-]+/g,"");
  const known = PROJECT_TYPE_COLUMNS[key];
  if (known && known.headers.includes(normalizeHeader(headers[known.index] || ""))) {
    return known.index;
  }
  return unitTypeColumn(headers);
}
