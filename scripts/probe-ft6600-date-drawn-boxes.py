#!/usr/bin/env python3
"""Probe drawn date box rects on FT6600 template/executed PDF."""
import fitz
import sys

path = sys.argv[1] if len(sys.argv) > 1 else "docs/nsw/ft6600-renamed.pdf"
doc = fitz.open(path)

for page_index in (16, 17):
    page = doc[page_index]
    print(f"=== page {page_index + 1} drawings ===")
    for i, d in enumerate(page.get_drawings()):
        r = d.get("rect")
        if not r:
            continue
        w = r.x1 - r.x0
        h = r.y1 - r.y0
        if w < 20 or h < 10 or h > 25:
            continue
        if r.x0 < 240 or r.x0 > 500:
            continue
        print(
            i,
            f"x0={r.x0:.1f} y0={r.y0:.1f} x1={r.x1:.1f} y1={r.y1:.1f}",
            f"w={w:.1f} h={h:.1f}",
        )
    print(f"=== page {page_index + 1} text '6'/'July'/'26' spans ===")
    for span in page.get_text("dict").get("blocks", []):
        for line in span.get("lines", []):
            for s in line.get("spans", []):
                t = s.get("text", "").strip()
                if t in ("6", "July", "26"):
                    b = s["bbox"]
                    print(t, [round(x, 1) for x in b])

doc.close()
