/**
 * Unit detail snapshot derived from ONE official row of ONE project's sheet.
 * This never combines cells across projects, and preserves source column order.
 * Personal/customer notes must not be exposed through shared offer links.
 */
export type UnitSourceField = {column: number; label: string; value: string};
const BLOCKED = /(?:customer|client|buyer|ownername|tenant|phone|mobile|whatsapp|email|e.mail|nationalid|passport|contact|salesperson|salesagent|notes?|comment|reservationdate|contractdate|رقم(?:ال)?هاتف|موبايل|تليفون|واتساب|البريد|عميل|العميل|عملاء|اسم(?:ال)?مشتري|اسم(?:ال)?مالك|ملاحظات|بطاقة|رقمقومي)/i;
function unsafeColumn(label: string): boolean {
  const compact = label.normalize("NFKC").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g,"");
  return BLOCKED.test(compact);
}
function stringify(value: unknown): string {
  return String(value ?? "").trim().slice(0, 180);
}
export function extractUnitSourceFields(
  headers: readonly string[], cells: readonly unknown[]
): UnitSourceField[] {
  const fields: UnitSourceField[] = [];
  for (let i=0; i<Math.min(headers.length,64); i++) {
    const label = String(headers[i]??"").replace(/\\s+/g," ").trim().slice(0,100);
    if (!label || unsafeColumn(label)) continue;
    fields.push({column:i+1,label,value:stringify(cells[i])});
  }
  return fields;
}
