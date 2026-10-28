#!/usr/bin/env python3
"""Produce an auditable, NON-APPROVED CAD mapping review bundle from the engineering DXF.

Usage: pip install ezdxf
python scripts/extract-cairo-cad-review.py --dxf drawing.dxf --out cad-review.json

This intentionally does NOT pair arbitrary closed polylines with a unit code.
Label coordinates and candidate outline coordinates are evidence for review,
not trusted floor polygons. No customer-facing map is published by this script.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re

import ezdxf

EXPECTED_DXF_SHA = "855b5b71af07fcadfda33b5a9d15dba2738b008d85ed28009d8c456088740fbb"
CODE = re.compile(r"(?<![A-Z0-9])[A-Z]/(?:BA|GR|FR|2ND|3RD|4TH|5TH|6TH)/[A-Z0-9]+/[0-9]{1,3}(?:-?[A-Z])?(?![A-Z0-9])", re.I)

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dxf", required=True, type=Path)
    p.add_argument("--out", required=True, type=Path)
    p.add_argument("--labels-out", type=Path, help="Optional floor-grouped original CAD code positions for review")
    args = p.parse_args()
    if hashlib.sha256(args.dxf.read_bytes()).hexdigest() != EXPECTED_DXF_SHA:
        raise SystemExit("DXF fingerprint mismatch: do not mix drawings or revisions")
    doc = ezdxf.readfile(args.dxf)
    labels = []
    candidate_polylines = []
    for ent in doc.modelspace():
        typ = ent.dxftype()
        if typ in ("TEXT", "MTEXT"):
            raw = ent.dxf.get("text", "") if typ == "TEXT" else ent.text
            insert = ent.dxf.get("insert")
            if insert is None:
                continue
            for match in CODE.finditer(raw):
                labels.append({
                    "code": match.group().upper(), "handle": ent.dxf.handle,
                    "layer": ent.dxf.layer, "x": round(insert.x, 5),
                    "y": round(insert.y, 5), "raw": raw[:160],
                })
        elif typ == "LWPOLYLINE" and ent.closed and len(ent) >= 3:
            points = [[round(float(x), 5), round(float(y), 5)]
                      for x, y in ent.get_points("xy")]
            # Bulges are retained because curved CAD boundaries must never
            # be silently converted into straight line SVG polygons.
            bulges = [round(float(b), 8) for _x, _y, b in ent.get_points("xyb")]
            candidate_polylines.append({
                "handle": ent.dxf.handle, "layer": ent.dxf.layer,
                "points": points, "bulges": bulges,
                "requiresReview": True,
            })
    dupes = {k: v for k, v in Counter(x["code"] for x in labels).items() if v > 1}
    result = {
        "project": "cairo-plaza", "inputDxfSha256": EXPECTED_DXF_SHA,
        "sourceType": "native CAD DXF", "approvalStatus": "DRAFT_REVIEW_ONLY",
        "labels": labels, "candidateClosedPolylines": candidate_polylines,
        "duplicateCodeOccurrences": dupes,
        "warnings": [
            "A closed polyline may represent a wall, column, detail or common area rather than a unit.",
            "All INSERT block transformations, rotations, scale and floor assignments must be reviewed.",
            "Labels are not unit boundaries. Do not publish these candidates as floor shapes.",
            "CAD codes missing from Sheet1 must be Sold Out only after exact code and floor pairing is approved.",
        ],
    }
    if args.labels_out:
        floor_codes = {"BA":"-1","GR":"0","FR":"1","2ND":"2","3RD":"3","4TH":"4","5TH":"5","6TH":"6"}
        grouped = {number: [] for number in floor_codes.values()}
        for label in labels:
            floor = floor_codes[label["code"].split("/")[1]]
            grouped[floor].append(label)
        manifest = {"sourceDxfSha256": EXPECTED_DXF_SHA, "reviewStatus": "DRAFT",
                    "warning": "CAD text positions are not unit footprints and are not approved geometry.",
                    "floors": grouped}
        args.labels_out.parent.mkdir(parents=True, exist_ok=True)
        args.labels_out.write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + "\\n", encoding="utf-8")
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"labels":len(labels),"candidatePolylines":len(candidate_polylines),
                      "duplicateCodes":len(dupes),"approval":"DRAFT_REVIEW_ONLY"}))

if __name__ == "__main__":
    main()
