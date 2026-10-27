import { db } from "@/lib/db";

export type InventoryUnit = {
  code: string;
  price: string;
  area: string;
  floor: string;
  status: string;
  project: string;
};

async function accessToken(userId: string): Promise<string> {
  const account = await db().account.findFirst({ where: { userId, provider: "google" } });
  if (!account) throw new Error("Google account is not connected");
  if (account.access_token && account.expires_at && account.expires_at > Math.floor(Date.now() / 1000) + 90)
    return account.access_token;
  if (!account.refresh_token)
    throw new Error("Google authorization needs renewal. Sign out and sign in again.");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: account.refresh_token,
      grant_type: "refresh_token"
    }),
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Google token refresh failed. Please sign in again.");
  const payload = await response.json() as { access_token: string; expires_in: number };
  await db().account.update({ where: { id: account.id }, data: {
    access_token: payload.access_token,
    expires_at: Math.floor(Date.now() / 1000) + payload.expires_in
  } });
  return payload.access_token;
}

function normal(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[\s_\-().]/g, "");
}
function indexOf(headers: string[], names: string[]) {
  return headers.findIndex(header => names.includes(normal(header)));
}
export async function getLiveInventory(
  userId: string, spreadsheetId: string, range: string, projectName: string
): Promise<InventoryUnit[]> {
  const token = await accessToken(userId);
  const url = "https://sheets.googleapis.com/v4/spreadsheets/" +
    encodeURIComponent(spreadsheetId) + "/values/" + encodeURIComponent(range);
  const response = await fetch(url, { headers: { Authorization: "Bearer " + token }, cache: "no-store" });
  if (!response.ok) {
    if (response.status === 403 || response.status === 404)
      throw new Error("This Google account cannot read the selected spreadsheet or range.");
    throw new Error("Google Sheets returned HTTP " + response.status);
  }
  const result = await response.json() as { values?: string[][] };
  const [header, ...rows] = result.values || [];
  if (!header) return [];
  const names = header.map(v => String(v));
  const columns = {
    code: indexOf(names, ["unitcode", "code", "unitid", "unitnumber", "كودالوحدة", "الوحدة"]),
    price: indexOf(names, ["price", "unitprice", "totalprice", "sellingprice", "السعر"]),
    area: indexOf(names, ["area", "netarea", "unitarea", "المساحة"]),
    floor: indexOf(names, ["floor", "floornumber", "الطابق", "الدور"]),
    status: indexOf(names, ["status", "availability", "unitstatus", "الحالة"])
  };
  if (columns.code < 0 || columns.price < 0) throw new Error("Sheet needs Unit Code and Price columns.");
  const unique = new Map<string, InventoryUnit>();
  for (const row of rows) {
    const cell = (col: number) => col < 0 ? "" : String(row[col] || "").trim();
    const code = cell(columns.code);
    if (!code) continue;
    unique.set(code, { code, price: cell(columns.price), area: cell(columns.area),
      floor: cell(columns.floor), status: cell(columns.status) || "UNKNOWN", project: projectName });
  }
  return [...unique.values()];
}
