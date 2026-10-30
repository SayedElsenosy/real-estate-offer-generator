import ExcelJS from "exceljs";
import type { InventoryUnit } from "@/lib/sheets";

const MAX_XLSX_BYTES = 10 * 1024 * 1024;

function normalize(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g, "");
}

function valueAt(row: ExcelJS.Row, column: number): string {
  const cell = row.getCell(column);
  const value = cell.value;
  if (typeof value === "number" || typeof value === "string") return String(value).trim();
  return (cell.text || "").trim();
}

/**
 * Read an XLSX attachment stored in Google Drive. The source file is never modified,
 * converted, exported, copied or written back to Drive. Sheets API cannot read XLSX.
 */
export async function getExcelInventory(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  projectName: string
): Promise<InventoryUnit[]> {
  const requestedTab = range.includes("!") ? range.slice(0, range.lastIndexOf("!")) : range;
  const tab = requestedTab.replace(/^'|'$/g, "").replace(/''/g, "'").trim();
  if (!tab) throw new Error("An Excel worksheet name must be configured.");

  const sourceUrl = "https://www.googleapis.com/drive/v3/files/" +
    encodeURIComponent(spreadsheetId) + "?alt=media";
  // Workerd rejects fetch({redirect:"error"}). Follow Drive's signed download
  // redirects explicitly, never forwarding the OAuth bearer token to another
  // origin, and never following an arbitrary external host.
  let currentUrl = sourceUrl;
  let response = await fetch(currentUrl, {
    headers: { Authorization: "Bearer " + accessToken },
    cache: "no-store",
    redirect: "manual"
  });
  for (let hop = 0; hop < 3 && response.status >= 300 && response.status < 400; hop++) {
    const location = response.headers.get("location");
    if (!location) throw new Error("Google Drive returned a redirect without a destination.");
    const target = new URL(location, currentUrl);
    const host = target.hostname.toLowerCase();
    const trusted = target.protocol === "https:" &&
      (host === "google.com" || host.endsWith(".google.com") ||
       host === "googleapis.com" || host.endsWith(".googleapis.com") ||
       host === "googleusercontent.com" || host.endsWith(".googleusercontent.com"));
    if (!trusted) throw new Error("Google Drive returned an untrusted download redirect.");
    const sameOrigin = target.origin === new URL(sourceUrl).origin;
    currentUrl = target.toString();
    response = await fetch(currentUrl, {
      headers: sameOrigin ? { Authorization: "Bearer " + accessToken } : {},
      cache: "no-store",
      redirect: "manual"
    });
  }
  if (response.status >= 300 && response.status < 400)
    throw new Error("Google Drive returned too many download redirects.");
  if (!response.ok) {
    let providerReason = "";
    try {
      const errorPayload = await response.json() as {
        error?: { status?: string; errors?: { reason?: string }[] };
      };
      providerReason = String(errorPayload.error?.errors?.[0]?.reason ||
        errorPayload.error?.status || "").slice(0, 70).replace(/[^a-zA-Z0-9_-]/g, "");
    } catch { /* Some errors do not have a JSON body. */ }
    if (response.status === 401)
      throw new Error("Google Drive token expired or invalid. Reconnect your Google account.");
    if (response.status === 403) {
      if (/accessNotConfigured|SERVICE_DISABLED|SERVICE_USAGE_LIMIT_EXCEEDED|API_KEY_SERVICE_BLOCKED/i.test(providerReason))
        throw new Error("Google Drive API is not enabled for this OAuth project's Google Cloud account. Enable Google Drive API, then refresh.");
      if (/insufficientPermissions|ACCESS_TOKEN_SCOPE_INSUFFICIENT/i.test(providerReason))
        throw new Error("Google OAuth token lacks Drive read-only permission. Sign out and consent again.");
      if (/fileNotDownloadable|cannotDownloadFile|downloadRestrictedForRevision/i.test(providerReason))
        throw new Error("The owner of Cairo Plaza's Excel file disabled downloads. The app cannot read its XLSX bytes until the owner allows downloading; the source stays untouched.");
      throw new Error("Google Drive denied reading Cairo Plaza Excel (HTTP 403" +
        (providerReason ? ", reason: " + providerReason : "") +
        "). Check Drive API activation, file Viewer access and the owner's download restrictions.");
    }
    if (response.status === 404)
      throw new Error("Cairo Plaza Excel file was not found in this Google account's accessible Drive files.");
    throw new Error("Google Drive Excel download returned HTTP " + response.status);
  }
  const announcedSize = Number(response.headers.get("content-length") || 0);
  if (announcedSize > MAX_XLSX_BYTES)
    throw new Error("Excel inventory exceeds the allowed 10MB read limit.");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_XLSX_BYTES || bytes[0] !== 0x50 || bytes[1] !== 0x4b)
    throw new Error("Google Drive did not return a valid supported XLSX file.");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.getWorksheet(tab);
  if (!sheet)
    throw new Error("The Excel workbook does not contain the configured tab: " + tab);

  const headings = sheet.getRow(1);
  const columnNamed = (label: string | string[]): number => {
    const aliases = (Array.isArray(label) ? label : [label]).map(normalize);
    const found: number[] = [];
    for (let i = 1; i <= headings.cellCount; i++) {
      if (aliases.includes(normalize(valueAt(headings, i)))) found.push(i);
    }
    if (found.length !== 1)
      throw new Error("Cairo Plaza Excel header " + aliases.join("/") +
        " missing or ambiguous. Price and availability cannot be guessed.");
    return found[0];
  };
  // The native XLSX Sheet1 uses "Column 1" at A1 for Unit Codes.
  // Google Drive's CSV preview adds a synthetic leading row-index column
  // which does NOT exist in the native Excel worksheet.
  const columns = {
    code: columnNamed(["column1", "unitcode"]),
    area: columnNamed("grossareasqm"),
    floor: columnNamed("floornumber"),
    status: columnNamed("availabilitystatus"),
    price: columnNamed("totalprice")
  };

  const items = new Map<string, InventoryUnit>();
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const code = valueAt(row, columns.code);
    const price = valueAt(row, columns.price);
    const status = valueAt(row, columns.status);
    const numericPrice = Number(price.replace(/[,\s]/g, ""));
    if (!code || !status || !Number.isFinite(numericPrice) || numericPrice <= 0) return;
    if (items.has(code)) throw new Error("Duplicate Cairo Plaza Unit Code: " + code);
    items.set(code, {
      code, price, area: valueAt(row, columns.area), floor: valueAt(row, columns.floor), status, project: projectName
    });
  });
  return [...items.values()];
}
