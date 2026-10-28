import { getLiveInventory, type InventoryUnit } from "@/lib/sheets";

// Store resolved, non-secret inventory rows only. Never retain an in-flight
// Promise or a database/Google response across Worker request contexts.
// This reduces repetitive XLSX downloads/parsing during short polling cycles.
// Each isolate has its own cache: these are freshness targets, not SLA promises.
const REVALIDATE_MS = 3000;
const MAX_ENTRIES = 12;
type Entry = { units: InventoryUnit[]; expiresAt: number; lastReadAt: number };
const entries = new Map<string, Entry>();

export async function getRecentInventory(
  userId: string, spreadsheetId: string, range: string, projectName: string,
  forceFresh = false
): Promise<{ units: InventoryUnit[]; lastReadAt: number; source: "live" | "recent" }> {
  const key = JSON.stringify([userId, spreadsheetId, range, projectName]);
  const cached = entries.get(key);
  if (!forceFresh && cached && cached.expiresAt > Date.now())
    return { units: cached.units, lastReadAt: cached.lastReadAt, source: "recent" };
  // Always fetch the live Google source after the short TTL. Never serve stale
  // status/prices when revalidation fails, and never use this for PDF issuance.
  const units = await getLiveInventory(userId, spreadsheetId, range, projectName);
  const lastReadAt = Date.now();
  entries.set(key, { units, lastReadAt, expiresAt: lastReadAt + REVALIDATE_MS });
  while (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value!);
  return { units, lastReadAt, source: "live" };
}
