/** Match identifiers on architectural drawings to inventory without treating case-only suffix changes as Sold Out. */
export function unitKey(code: string): string {
  return String(code).normalize("NFKC").trim().toUpperCase();
}
