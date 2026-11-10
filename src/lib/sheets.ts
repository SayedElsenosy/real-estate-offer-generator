import { readGoogleAccount, saveGoogleAccessToken } from "@/lib/public-data";
import { getExcelInventory } from "@/lib/excel-inventory";
import { unitTypeColumnForProject } from "@/lib/unit-type";

export type InventoryUnit = {
  code: string;
  price: string;
  area: string;
  floor: string;
  status: string;
  project: string;
  /** Official optional type/category from the live inventory heading. */
  type?: string;
  /** Server-only raw source fields. Never include in inventory list responses. */
  sourceHeaders?: string[];
  sourceCells?: string[];
};

export function isAvailable(status: string): boolean {
  const normalized = String(status).normalize("NFKC").trim().toLowerCase().replace(/\s+/g, "");
  return ["available", "avail", "for sale", "forsale", "متاح", "متاحة", "متوفر", "متوفرة"].includes(normalized);
}

let inventoryToken: { email: string; token: string; expiresAt: number } | undefined;

function base64Url(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(""))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function inventoryServiceToken(credentials: string): Promise<string> {
  const { client_email: email, private_key: pem } = JSON.parse(credentials) as {
    client_email?: string;
    private_key?: string;
  };
  if (!email || !pem) throw new Error("Inventory service account configuration is incomplete");

  const now = Math.floor(Date.now() / 1000);
  if (inventoryToken?.email === email && inventoryToken.expiresAt > now + 90)
    return inventoryToken.token;

  const tokenUrl = "https://oauth2.googleapis.com/token";
  const encoder = new TextEncoder();
  const keyBytes = Uint8Array.from(
    atob(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "")),
    char => char.charCodeAt(0)
  );
  const key = await crypto.subtle.importKey(
    "pkcs8", keyBytes, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  const claims = {
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly",
    aud: tokenUrl,
    iat: now,
    exp: now + 3600
  };
  const unsigned = base64Url(encoder.encode(JSON.stringify({ alg: "RS256", typ: "JWT" }))) +
    "." + base64Url(encoder.encode(JSON.stringify(claims)));
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(unsigned));
  const response = await fetch(tokenUrl, {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: unsigned + "." + base64Url(new Uint8Array(signature))
    }),
    cache: "no-store"
  });
  if (!response.ok) {
    console.warn("Inventory service account token request failed", { status: response.status });
    throw new Error("Google inventory service authorization failed");
  }
  const payload = await response.json() as { access_token?: string; expires_in?: number };
  if (!payload.access_token || typeof payload.expires_in !== "number")
    throw new Error("Google returned an incomplete inventory service token");
  inventoryToken = { email, token: payload.access_token, expiresAt: now + payload.expires_in };
  return inventoryToken.token;
}

async function accessToken(userId: string): Promise<string> {
  const credentials = process.env.GOOGLE_INVENTORY_SERVICE_ACCOUNT;
  if (credentials) return inventoryServiceToken(credentials);

  const account = await readGoogleAccount(userId);
  if (!account) throw new Error("Google account is not connected");
  if (account.access_token && account.expires_at &&
    account.expires_at > Math.floor(Date.now() / 1000) + 90)
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
  await saveGoogleAccessToken(account.id, payload.access_token, Math.floor(Date.now() / 1000) + payload.expires_in);
  return payload.access_token;
}

export { accessToken as getGoogleAccessToken };

/** Small metadata check to avoid repeatedly downloading and parsing Cairo Plaza XLSX.
 * Requires the same read-only Google Drive scope as its normal download.
 */
export async function getDriveFileRevision(userId: string, fileId: string): Promise<string> {
  const token = await accessToken(userId);
  const url = "https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(fileId) +
    "?fields=" + encodeURIComponent("id,version,modifiedTime,md5Checksum");
  const response = await fetch(url, {
    headers: { Authorization: "Bearer " + token }, cache: "no-store"
  });
  if (!response.ok) throw new Error("Google Drive could not verify the Excel file version");
  const info = await response.json() as { version?: string; modifiedTime?: string; md5Checksum?: string };
  const revision = [info.version || "",info.md5Checksum || "",info.modifiedTime || ""].join(":");
  if (!revision.replace(/:/g,"")) throw new Error("Google Drive returned no Excel file version");
  return revision;
}

function normalize(value: string): string {
  return String(value).normalize("NFKC").toLowerCase().replace(/[\s_\-().\n/]/g, "");
}
function findColumn(headers: string[], names: string[]): number {
  return headers.findIndex(header => names.includes(normalize(header)));
}
type ColumnKey = "code" | "price" | "area" | "floor" | "status";
type Layout = { columns: Record<ColumnKey, number>; expected: Partial<Record<ColumnKey, string[]>> };
const layoutByProject: Record<string, Layout> = {
  kawn: {
    columns: { code: 0, price: 12, area: 8, floor: 3, status: 10 },
    expected: { code: ["unitcode"], price: ["totalprice"], area: ["grossarea"],
      floor: ["floorno"], status: ["status"] }
  },
  nasa: {
    columns: { code: 4, price: 10, area: 5, floor: 2, status: 13 },
    expected: { code: ["unitcode"], price: ["totalunit"], area: ["grossarea"],
      floor: ["floor"], status: ["status"] }
  },
  aqmar: {
    columns: { code: 5, price: 20, area: 15, floor: 4, status: 6 },
    expected: { code: ["unit"], price: ["totalunitprice"], area: ["bua"],
      floor: ["floor"], status: ["status"] }
  },
  vida: {
    columns: { code: 4, price: 17, area: 8, floor: 3, status: 10 },
    expected: { code: ["unitcode"], price: ["totalprice"], area: ["bua"],
      floor: ["floor"], status: ["status"] }
  }
};
const defaultColumnNames: Record<ColumnKey, string[]> = {
  code: ["unitcode", "code", "unitid", "unitnumber", "كودالوحدة", "الوحدة"],
  price: ["totalprice", "totalunitprice", "totalunit", "price", "unitprice", "sellingprice", "السعر"],
  area: ["grossarea", "bua", "area", "netarea", "unitarea", "المساحة"],
  floor: ["floorno", "floor", "floornumber", "الطابق", "الدور"],
  status: ["status", "availability", "unitstatus", "الحالة"]
};
function getColumns(projectName: string, headers: string[]): Record<ColumnKey, number> {
  const normalizedName = projectName.toLowerCase().replace(/\s+/g, "-");
  const layout = layoutByProject[normalizedName];
  if (layout) {
    for (const key of Object.keys(layout.columns) as ColumnKey[]) {
      const actual = normalize(headers[layout.columns[key]] || "");
      if (!layout.expected[key]?.includes(actual))
        throw new Error(
          "Inventory column layout for " + projectName + " changed at " + key +
          ". Expected a compatible " + key + " column but got " +
          (headers[layout.columns[key]] || "(empty)") + ". No price was guessed."
        );
    }
    return layout.columns;
  }
  const columns = {} as Record<ColumnKey, number>;
  for (const key of Object.keys(defaultColumnNames) as ColumnKey[]) {
    columns[key] = findColumn(headers, defaultColumnNames[key]);
  }
  return columns;
}
export async function getLiveInventory(
  userId: string, spreadsheetId: string, range: string, projectName: string
): Promise<InventoryUnit[]> {
  const token = await accessToken(userId);
  if (projectName.toLowerCase().replace(/\s+/g, "-") === "cairo-plaza") {
    return getExcelInventory(token, spreadsheetId, range, projectName);
  }
  const url = "https://sheets.googleapis.com/v4/spreadsheets/" +
    encodeURIComponent(spreadsheetId) + "/values/" + encodeURIComponent(range);
  const response = await fetch(url, {
    headers: { Authorization: "Bearer " + token }, cache: "no-store"
  });
  if (!response.ok) {
    if (response.status === 403)
      throw new Error("Google Sheets permission denied: this Google account needs Reader access and Sheets scope.");
    if (response.status === 404)
      throw new Error("Spreadsheet was not found or the selected worksheet is unavailable.");
    if (response.status === 400)
      throw new Error("Google Sheets cannot read this range or document. Check that it is a native Google Sheet and verify its tab.");
    throw new Error("Google Sheets returned HTTP " + response.status);
  }
  const result = await response.json() as { values?: (string | number)[][] };
  const [headersRaw, ...rows] = result.values || [];
  if (!headersRaw) return [];
  const headers = headersRaw.map(String);
  const columns = getColumns(projectName, headers);
  const typeColumn = unitTypeColumnForProject(headers,projectName);
  if (columns.code < 0 || columns.price < 0 || columns.status < 0)
    throw new Error("Sheet must include Unit Code, Total Price and Status columns.");
  const unique = new Map<string, InventoryUnit>();
  for (const row of rows) {
    const cell = (column: number): string =>
      column < 0 ? "" : String(row[column] ?? "").trim();
    const code = cell(columns.code);
    if (!code) continue;
    const rawPrice = cell(columns.price);
    const priceValue = Number(rawPrice.replace(/[,\s]/g, ""));
    if (!Number.isFinite(priceValue) || priceValue <= 0) continue;
    const status = cell(columns.status);
    if (!status) continue;
    unique.set(code, {
      code, price: rawPrice, area: cell(columns.area), floor: cell(columns.floor),
      status, project: projectName, type: cell(typeColumn),
      sourceHeaders: headers, sourceCells: row.map(v => String(v??"").trim())
    });
  }
  return [...unique.values()];
}
