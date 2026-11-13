import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
let revision='v1', price='100', reads=0, checks=0, unavailable=false;
globalThis.__inventoryTest={
  getDriveFileRevision:async()=>{checks++;if(unavailable)throw Error('offline');return revision;},
  getLiveInventory:async()=>{reads++;return [{code:'A1',price,status:'Available'}];}
};
const source=(await readFile('src/lib/inventory-cache.ts','utf8')).replace(/^import[^\n]+\n/, 'const {getLiveInventory,getDriveFileRevision}=globalThis.__inventoryTest;\n');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {getRecentInventory}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const read=(fresh=false,name='Cairo Plaza')=>getRecentInventory('u','file','tab',name,fresh);
await read();assert.equal(reads,1);
await read();assert.equal(reads,1);
const before=checks;
await read(true);assert.ok(checks>before,'Issuing an offer must verify the live revision even within TTL');assert.equal(reads,1);
revision='v2';price='200';assert.equal((await read(true)).units[0].price,'200');assert.equal(reads,2);
unavailable=true;price='300';assert.equal((await read(true)).units[0].price,'300','Metadata failures must read the source, never use old rows');assert.equal(reads,3);
await read(true,'Nasa');await read(true,'Nasa');assert.equal(reads,5,'Native Sheets offer issuance must always read fresh values');
delete globalThis.__inventoryTest;
console.log('PASS: fresh offer verification, changed prices, metadata failure fallback and native Sheets freshness');
