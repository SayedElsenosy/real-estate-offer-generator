import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {readXlsxRows} from '../src/lib/xlsx-values.ts';
const wb=new ExcelJS.Workbook();
const sheet=wb.addWorksheet('Inventory & Prices');
sheet.addRow(['Column 1','Gross Area SQM','Floor Number','Availability Status','Total Price']);
sheet.addRow(['A/01',64,-1,'Available',15360000]);
sheet.addRow(['وحدة & <2>',87,0,'متاحة',{formula:'10000*2',result:20000}]);
sheet.addRow(['A03',88,1,{richText:[{text:'Avail'},{text:'able'}]},1234.56]);
sheet.getCell('Z4').value='ignore';
const bytes=new Uint8Array(await wb.xlsx.writeBuffer());
const rows=await readXlsxRows(bytes,'Inventory & Prices');
for(let r=1;r<=4;r++)for(let c=1;c<=5;c++){
 const cell=sheet.getRow(r).getCell(c),value=cell.value;
 const expected=typeof value==='number'||typeof value==='string'?String(value).trim():cell.text.trim();
 assert.equal(rows[r-1][c-1],expected,`ExcelJS parity at ${r},${c}`);
}
await assert.rejects(()=>readXlsxRows(bytes,'Missing'),/configured tab/);
await assert.rejects(()=>readXlsxRows(bytes.slice(0,20),'Inventory'),/Invalid/);
console.log('PASS: selective XLSX reader matches ExcelJS for numbers, formula results, Arabic, XML entities, rich text and sparse columns');
