import { getLiveInventory, getDriveFileRevision, type InventoryUnit } from "@/lib/sheets";

// Store resolved, non-secret inventory rows only. Never retain an in-flight
// Promise or a database/Google response across Worker request contexts.
// This reduces repetitive XLSX downloads/parsing during short polling cycles.
// Each isolate has its own cache: these are freshness targets, not SLA promises.
const REVALIDATE_MS = 3000;
const MAX_ENTRIES = 12;
type Entry = { units: InventoryUnit[]; expiresAt: number; lastReadAt: number; revision: string|null };
const entries = new Map<string, Entry>();

export async function getRecentInventory(
  userId: string, spreadsheetId: string, range: string, projectName: string,
  forceFresh = false
): Promise<{ units: InventoryUnit[]; lastReadAt: number; source: "live" | "recent" }> {
  const key = JSON.stringify([userId, spreadsheetId, range, projectName]);
  const cached = entries.get(key);
  if (!forceFresh && cached && cached.expiresAt > Date.now())
    return { units: cached.units, lastReadAt: cached.lastReadAt, source: "recent" };
  // Cairo Plaza is an XLSX attachment (not a native Google Sheet).
  // When it is unchanged, a tiny Drive metadata request avoids repeatedly
  // downloading and reparsing the entire spreadsheet every polling interval.
  const isExcel = projectName.toLowerCase().replace(/\s+/g,"-")==="cairo-plaza";
  let revision: string|null = null;
  if (isExcel && !forceFresh && cached?.revision) {
    try {
      revision = await getDriveFileRevision(userId,spreadsheetId);
      if (revision === cached.revision) {
        const lastReadAt = Date.now();
        entries.set(key,{...cached,lastReadAt,expiresAt:lastReadAt+REVALIDATE_MS});
        return {units:cached.units,lastReadAt,source:"recent"};
      }
    } catch { /* Fall back to full source verification; never serve stale stock. */ }
  }
  // Offers always call getLiveInventory directly, bypassing this cache.
  const units = await getLiveInventory(userId, spreadsheetId, range, projectName);
  if (isExcel && !revision) {
    try {revision = await getDriveFileRevision(userId,spreadsheetId);}
    catch {revision=null;}
  }
  const lastReadAt = Date.now();
  entries.set(key, { units, lastReadAt, expiresAt: lastReadAt + REVALIDATE_MS,revision });
  while (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value!);
  return { units, lastReadAt, source: "live" };
});
  while (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value!);
  return { units, lastReadAt, source: "live" };
}
