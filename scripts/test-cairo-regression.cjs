// Exercise the real offer handler, calculation and PDF renderer with isolated DB/auth/stock adapters.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const Decimal = require('decimal.js');
const ReactPDF = require('@react-pdf/renderer');
let writes = [], captured = [], units = [], user = { id: 'test-user' };
const floor = { floor: '0', reviewStatus: 'DRAFT', viewBox: '0 0 100 100', backgroundData: null,
  shapes: [{ unitCode: 'D/GR/SH/23', d: 'M 0 0 L 10 0 L 10 10 L 0 10 Z' }] };
const plan = { id: 'plan', name: 'Test terms', downPaymentPct: '10', months: 3, maintenancePct: '5', startOffsetMonths: 1 };
const project = { id: 'cairo-plaza', name: 'Cairo Plaza', companyName: 'Offer Atelier TEST', spreadsheetId: 'test-only', sheetRange: 'Sheet1!A:M', logoUrl: null, floorPlans: [floor] };
const database = { project: { findUnique: async () => project }, paymentPlan: { findMany: async () => [plan] }, offer: { create: async value => { writes.push(value.data); return value.data; } } };
const cache = new Map();
function load(relative) {
  const filename = path.resolve(__dirname, '..', relative);
  if (cache.has(filename)) return cache.get(filename);
  const m = { exports: {} }; cache.set(filename, m.exports);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  function localRequire(id) {
    if (id === '@/lib/db') return { db: () => database };
    if (id === '@/lib/guards') return { currentUser: async () => user };
    if (id === '@/auth') return { auth: async () => null };
    if (id === '@/lib/sheets' && !filename.endsWith('sheets.ts')) return { getLiveInventory: async () => units, isAvailable: load('src/lib/sheets.ts').isAvailable };
    if (id === '@react-pdf/renderer') return { ...ReactPDF, renderToBuffer: async node => { captured.push(node.props); return ReactPDF.renderToBuffer(node); } };
    if (id.startsWith('@/')) {
      const stem = 'src/' + id.slice(2);
      return load(stem + (fs.existsSync(path.resolve(__dirname, '..', stem + '.ts')) ? '.ts' : '.tsx'));
    }
    return require(id);
  }
  vm.runInThisContext('(function(require,module,exports){' + source + '\n})', { filename })(localRequire, m, m.exports);
  cache.set(filename, m.exports); return m.exports;
}
const { unitKey } = load('src/lib/unit-code.ts');
const { calculateSchedule } = load('src/lib/payment.ts');
const { POST } = load('src/app/api/offers/route.ts');
const request = (overrides = {}) => new Request('http://localhost/api/offers', { method: 'POST', body: JSON.stringify({ projectId: 'cairo-plaza', unitCode: 'D/GR/SH/23', unitFloor: '0', planIds: ['plan'], ...overrides }) });
async function main() {
  assert.notEqual(unitKey('A/BA/SR/01'), unitKey('A/BA/SH/01'));
  assert.notEqual(unitKey('B/GR/SH/04-a'), unitKey('B/GR/SH/4a'));
  assert.equal(unitKey('G/FR/SH/01a'), unitKey('G/FR/SH/01A'));
  const schedule = calculateSchedule('100,000.01', plan, new Date('2026-01-31T00:00:00Z'));
  assert.equal(schedule.rows.filter(r => r.type !== 'MAINTENANCE').reduce((sum,r) => sum.plus(r.amount), new Decimal(0)).toFixed(2), '100000.01');
  assert.equal(schedule.rows[1].due, '2026-02-28');
  assert.equal(schedule.maintenance, '5000.00');
  const fixture = { code: 'D/GR/SH/23', floor: '0', area: '35', price: '100000.01', status: 'Available', project: 'Cairo Plaza' };
  units = [fixture];
  const response = await POST(request());
  assert.equal(response.status, 200); const bytes = Buffer.from(await response.arrayBuffer()); assert.equal(bytes.subarray(0,4).toString(), '%PDF');
  assert.equal(captured.at(-1).floor, null, 'DRAFT must not reach PDF geometry');
  assert.equal(writes.at(-1).unitSnapshot.price, fixture.price);
  assert.equal(writes.at(-1).unitSnapshot.status, fixture.status);
  assert.equal(writes.at(-1).scheduleSnapshots[0].totalPrice, '100000.01');
  const out = process.env.TEST_OUTPUT_DIR;
  if (out) { fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'synthetic-offer-test.pdf'), bytes); }
  let prior = writes.length;
  units = [{ ...fixture, status: 'Reserved' }]; assert.equal((await POST(request())).status, 409); assert.equal(writes.length, prior);
  units = [fixture]; assert.equal((await POST(request({ unitFloor: '1' }))).status, 404);
  units = [{ ...fixture, code: 'D/GR/SR/23' }]; assert.equal((await POST(request())).status, 404);
  units = [fixture, { ...fixture }]; assert.equal((await POST(request())).status, 409);
  units = [fixture]; assert.equal((await POST(request({ planIds: ['plan','plan'] }))).status, 400);
  user = null; assert.equal((await POST(request())).status, 401); user = { id: 'test-user' };
  floor.reviewStatus = 'APPROVED';
  assert.equal((await POST(request())).status, 200); assert.equal(captured.at(-1).floor.shapes[0].status, 'AVAILABLE');
  assert.equal(writes.length, prior + 1);
  console.log('PASS: exact identity, SR/SH separation, punctuation preservation, case normalization, payment reconciliation, month-end dates, real PDF rendering, DRAFT exclusion, stock price/status snapshots, reserved/wrong-floor/wrong-type/ambiguous/duplicate-plan/unauthenticated rejection, APPROVED control. DB writes isolated in memory.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
