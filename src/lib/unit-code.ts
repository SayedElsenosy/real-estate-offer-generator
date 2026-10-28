/** Use the entire, unmodified unit identifier for stock lookups.
 * SR and SH are distinct unit types, including in Cairo Plaza basement.
 * Normalize only Unicode and letter case — never rewrite code segments.
 */
export function unitKey(code: string): string {
  return String(code).normalize("NFKC").trim().toUpperCase();
}
