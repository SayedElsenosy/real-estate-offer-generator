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

  const response = await fetch(
    "https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(spreadsheetId) + "?alt=media",
    {
      headers: { Authorization: "Bearer " + accessToken },
      cache: "no-store",
      redirect: "error"
    }
  );
  if (!response.ok) {
    if (response.status === 401 || response.status === 403)
      throw new Error("Excel access denied. Sign in again and allow Google Drive read-only access, and confirm that this account can view the file.");
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
  const requiredHeaders = [
    { column: 1, valid: ["column1", "unitcode"] },
    { column: 7, valid: ["grossareasqm"] },
    { column: 12, valid: ["availabilitystatus"] },
    { column: 13, valid: ["totalprice"] }
  ];
  for (const required of requiredHeaders) {
    if (!required.valid.includes(normalize(valueAt(headings, required.column))))
      throw new Error("Cairo Plaza XLSX column structure has changed. Expected the " +
        required.valid.join("/") + " column at " + required.column + "; no values were guessed.");
  }

  const items = new Map<string, InventoryUnit>();
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const code = valueAt(row, 1);
    const price = valueAt(row, 13);
    const status = valueAt(row, 12);
    const numericPrice = Number(price.replace(/[,\s]/g, ""));
    if (!code || !status || !Number.isFinite(numericPrice) || numericPrice <= 0) return;
    if (items.has(code)) throw new Error("Duplicate Cairo Plaza Unit Code: " + code);
    items.set(code, {
      code, price, area: valueAt(row, 7), floor: valueAt(row, 5), status, project: projectName
    });
  });
  return [...items.values()];
}
