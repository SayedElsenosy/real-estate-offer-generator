"""Recheck stored perimeters; optionally re-extract their original PDF commands and Sheet1 rows.
Usage: python scripts/verify-cairo-geometry.py [--pdf source.pdf --inventory stock.xlsx]
Requires shapely; optional source checks also require pymupdf and openpyxl.
"""
import argparse, hashlib, json, re, unicodedata
from pathlib import Path
from shapely.geometry import Polygon

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets/cairo-plaza'
args = argparse.ArgumentParser()
args.add_argument('--pdf', type=Path)
args.add_argument('--inventory', type=Path)
options = args.parse_args()
old = json.loads((ASSETS / 'trace-drafts-347.json').read_text())
new = json.loads((ASSETS / 'trace-drafts-361.json').read_text())
added = json.loads((ASSETS / 'new-source-perimeters.json').read_text())
def key(code): return unicodedata.normalize('NFKC', code).strip().upper()
def points(path):
    assert not re.search(r'[^\d\s,.+\-eEMLZ]', path), 'Unsupported path command'
    nums = [float(n) for n in re.findall(r'[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?', path)]
    assert len(nums) % 2 == 0
    return list(zip(nums[::2], nums[1::2]))
assert key('A/BA/SR/01') != key('A/BA/SH/01')
assert len(added) == 14
assert new['status'] == 'DRAFT'
max_overlap = 0
for floor, shapes in new['byFloor'].items():
    assert shapes[:len(old['byFloor'][floor])] == old['byFloor'][floor], 'Baseline modified'
    assert len({key(s['unitCode']) for s in shapes}) == len(shapes)
    polygons = [Polygon(points(s['d'])) for s in shapes]
    for i,p in enumerate(polygons):
        assert p.is_valid and p.area > 0
        assert p.bounds[0] >= 0 and p.bounds[1] >= 0 and p.bounds[2] <= 2267.72 and p.bounds[3] <= 1700.79
        for q in polygons[:i]:
            overlap = p.intersection(q).area
            max_overlap = max(max_overlap, overlap)
            # Preserve source coordinates. No snapping to hide export rounding.
            assert overlap <= 0.01, f'Overlap exceeds PDF rounding allowance: {overlap}'
for s in added:
    assert s['reviewStatus'] == 'DRAFT'
    e = s['evidence']; items = e['originalItems']
    if len(items) == 1 and items[0][0] == 'qu':
        q = items[0][1]; expected = [q[0],q[1],q[3],q[2]]
    else:
        assert all(it[0] == 'l' for it in items)
        assert items[0][1] == items[-1][2], 'Open path cannot become polygon'
        assert all(a[2] == b[1] for a,b in zip(items,items[1:]))
        expected = [it[1] for it in items]
    actual = points(s['d'])
    assert len(actual) == len(expected)
    assert all(abs(x-y) <= 0.00000051 for a,b in zip(actual,expected) for x,y in zip(a,b))
    assert key(s['unitCode']) == key(e['printedCode'])
if options.pdf:
    import pymupdf
    source_hash = hashlib.sha256(options.pdf.read_bytes()).hexdigest()
    doc = pymupdf.open(options.pdf)
    pages = {}
    def plain(v):
        if isinstance(v,(pymupdf.Point,pymupdf.Rect,pymupdf.Quad)): return list(v)
        raise TypeError(type(v))
    for s in added:
        e = s['evidence']; assert source_hash == e['sourceSha256']
        pg = e['page']
        if pg not in pages: pages[pg] = doc[pg-1].get_drawings()
        items = pages[pg][e['drawingIndex']]['items']
        if e['subpathIndex'] is not None: items = [items[e['subpathIndex']]]
        assert json.loads(json.dumps(items,default=plain)) == e['originalItems']
if options.inventory:
    import openpyxl
    before = hashlib.sha256(options.inventory.read_bytes()).hexdigest()
    wb = openpyxl.load_workbook(options.inventory,read_only=True,data_only=True)
    rows = list(wb['Sheet1'].values)
    stock = [r for r in rows[1:] if r[0] and r[11] and isinstance(r[12],(float,int)) and r[12]>0]
    assert len(stock) == 153
    matches = sum(key(r[0]) in {key(s['unitCode']) for s in new['byFloor'].get(str(int(r[4])),[])} for r in stock)
    assert matches == 140
    for s in added:
        e=s['evidence'];r=rows[e['sheet1Row']-1]
        assert key(r[0]) == key(s['unitCode']) and str(int(r[4])) == e['floor'] and r[6] == e['printedGrossAreaSqm']
    wb.close()
    assert before == hashlib.sha256(options.inventory.read_bytes()).hexdigest()
print(json.dumps({'result':'PASS','perimeters':361,'newSourcePerimeters':14,'unchangedBaseline':347,'maxOverlapPdfPointsSquared':max_overlap,'overlapAllowancePdfPointsSquared':0.01,'pdfReextracted':bool(options.pdf),'sheet1ReadOnlyVerified':bool(options.inventory)}))
