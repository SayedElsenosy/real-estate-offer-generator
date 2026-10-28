#!/usr/bin/env python3
"""Inspect a DXF exported from the *registered* Cairo Plaza engineering DWG.

The native DWG is the source of truth. This script never reads PDF artwork and
never fabricates unit boundaries. It only inventories CAD entities and labels.
For AC1027, export DXF with AutoCAD or the official ODA File Converter first.

Usage:
  pip install ezdxf
  python scripts/analyze-cairo-engineering-cad.py --dwg "original.dwg" --dxf "export.dxf" --out "cad-report.json"
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re

import ezdxf

EXPECTED_SOURCE_SHA256 = "9c9aac1fcf2b330fbbb5e3555b86300b922ac1a33037e4ea51510ece82792c6a"
CODE_REGEX = re.compile(r"\b[A-Z]/(?:BA|GR|FR|2ND|3RD|4TH|5TH|6TH)/[A-Z0-9]+/[0-9]{1,3}(?:[-]?[A-Z])?\b", re.I)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dwg", required=True, type=Path)
    parser.add_argument("--dxf", required=True, type=Path)
    parser.add_argument("--out", default="cad-report.json", type=Path)
    args = parser.parse_args()
    original_hash = hashlib.sha256(args.dwg.read_bytes()).hexdigest()
    if original_hash != EXPECTED_SOURCE_SHA256:
        raise SystemExit("ERROR: supplied DWG does not match the approved engineering-department file SHA-256")
    if args.dwg.read_bytes()[:6] != b"AC1027":
        raise SystemExit("ERROR: source DWG is not AC1027 as registered")
    doc = ezdxf.readfile(args.dxf)
    entities = list(doc.modelspace())
    entity_types = Counter(e.dxftype() for e in entities)
    layers = Counter(e.dxf.layer for e in entities)
    units = doc.header.get("$INSUNITS")
    text_matches = []
    for ent in entities:
        tp = ent.dxftype()
        if tp not in ("TEXT", "MTEXT", "ATTRIB", "ATTDEF"):
            continue
        raw = ent.dxf.get("text", "") if tp != "MTEXT" else ent.text
        for match in CODE_REGEX.finditer(raw):
            text_matches.append({
                "code": match.group().upper(),
                "layer": ent.dxf.layer,
                "handle": ent.dxf.handle,
                "text": raw[:300],
            })
    poly_counts = {
        "closed_lwpolyline": sum(bool(e.closed) for e in entities if e.dxftype() == "LWPOLYLINE"),
        "closed_polyline": sum(bool(e.is_closed) for e in entities if e.dxftype() == "POLYLINE"),
        "hatch": entity_types.get("HATCH", 0),
        "insert": entity_types.get("INSERT", 0),
    }
    report = {
        "project": "cairo-plaza",
        "source": "engineering DWG only",
        "dwg_sha256": original_hash,
        "dwg_version": "AC1027",
        "dxf_version": doc.dxfversion,
        "insunits": units,
        "entity_count_modelspace": len(entities),
        "entity_types": dict(entity_types.most_common()),
        "layers": dict(layers.most_common()),
        "entity_candidates": poly_counts,
        "unit_code_text_candidates": text_matches,
        "unit_code_count": len(text_matches),
        "caveat": "Closed CAD polylines are not necessarily unit boundaries. Extracted codes are not linked to geometry until architectural verification, block expansion, and floor/layer identification.",
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"result": "CAD_INVENTORY_ONLY", "entities": len(entities), "layers": len(layers), "text_codes": len(text_matches), "out": str(args.out)}))

if __name__ == "__main__":
    main()
