#!/usr/bin/env python3
"""PyMuPDF assertions for FT6600 execution pages p17-p18 after API dry-run burn-in."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import fitz

FT6600_SIGNATURE_FIELD_NAMES = {
    "landlord": "Landlord Signature",
    "landlord_lis": "Landlord LIS Signature",
    "tenant_1": "Tenant Signature",
    "tenant_tis": "Tenant TIS Signature",
}

DATE_ROW_EXPECTATIONS = [
    ("landlord", 16, "6", "July", "26"),
    ("landlord_lis", 16, "6", "July", "26"),
    ("tenant_1", 16, "6", "July", "26"),
    ("tenant_tis", 17, "6", "July", "26"),
]

TARGET_SIG_HEIGHT_PT = 32.4
HEIGHT_TOL_PT = 3.0
DATE_BOX_TOL_PT = 1.0
DRAWN_INNER_MAX_HEIGHT = 18.8
EXPECTED_ADDENDUM_DATE = "06/07/2026"
AUDIT_MARKERS = ("Document ID", "Reason:", "Signed with", "Digitally signed", "ID:")


def text_spans_on_page(page: fitz.Page) -> list[dict]:
    spans: list[dict] = []
    data = page.get_text("dict")
    for block in data.get("blocks", []):
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                bbox = span.get("bbox")
                if bbox:
                    spans.append({"text": span.get("text", ""), "bbox": fitz.Rect(bbox)})
    return spans


def rects_intersect(a: fitz.Rect, b: fitz.Rect) -> bool:
    return not (a.x1 <= b.x0 or a.x0 >= b.x1 or a.y1 <= b.y0 or a.y0 >= b.y1)


def bbox_inside(inner: fitz.Rect, outer: fitz.Rect, tol: float = DATE_BOX_TOL_PT) -> bool:
    return (
        inner.x0 >= outer.x0 - tol
        and inner.y0 >= outer.y0 - tol
        and inner.x1 <= outer.x1 + tol
        and inner.y1 <= outer.y1 + tol
    )


def inner_date_drawn_boxes(page: fitz.Page) -> list[fitz.Rect]:
    boxes: list[fitz.Rect] = []
    for drawing in page.get_drawings():
        rect = drawing.get("rect")
        if not rect:
            continue
        w = rect.x1 - rect.x0
        h = rect.y1 - rect.y0
        if rect.x0 < 240:
            continue
        if h > DRAWN_INNER_MAX_HEIGHT:
            continue
        if (34 < w < 37) or (100 < w < 104):
            boxes.append(fitz.Rect(rect))
    return boxes


def cluster_date_rows(boxes: list[fitz.Rect]) -> list[list[fitz.Rect]]:
    if not boxes:
        return []
    sorted_boxes = sorted(boxes, key=lambda r: (round(r.y0, 1), r.x0))
    rows: list[list[fitz.Rect]] = []
    for box in sorted_boxes:
        if not rows or abs(box.y0 - rows[-1][0].y0) > 5:
            rows.append([box])
        else:
            rows[-1].append(box)
    for row in rows:
        row.sort(key=lambda r: r.x0)
    return rows


def row_boxes_for_y(rows: list[list[fitz.Rect]], target_y: float) -> list[fitz.Rect] | None:
    for row in rows:
        if abs(row[0].y0 - target_y) <= 5 and len(row) >= 3:
            return row[:3]
    return None


def find_text_bbox_near_row(page: fitz.Page, needle: str, row_boxes: list[fitz.Rect]) -> fitz.Rect | None:
    row_y = row_boxes[0].y0
    best: fitz.Rect | None = None
    best_dist = float("inf")
    for span in text_spans_on_page(page):
        if span["text"].strip() != needle:
            continue
        dist = abs(span["bbox"].y0 - row_y)
        if dist < best_dist:
            best_dist = dist
            best = span["bbox"]
    return best


def assert_fields_snapshot_heights(fields_path: Path, page_height: float = 842.0) -> list[dict]:
    data = json.loads(fields_path.read_text(encoding="utf-8"))
    fields = data.get("fields") or []
    wanted = set(FT6600_SIGNATURE_FIELD_NAMES.values())
    out: list[dict] = []
    for field in fields:
        name = field.get("name")
        if name not in wanted:
            continue
        area = (field.get("areas") or [None])[0]
        if not area:
            continue
        height_pt = round(float(area["h"]) * page_height, 1)
        out.append({"name": name, "height_pt": height_pt, "normalized_h": area["h"]})
        if abs(height_pt - TARGET_SIG_HEIGHT_PT) > HEIGHT_TOL_PT:
            raise AssertionError(
                f"Field {name} area height {height_pt}pt not within {HEIGHT_TOL_PT}pt of {TARGET_SIG_HEIGHT_PT}pt"
            )
    if len(out) < 4:
        raise AssertionError(f"Expected 4 FT6600 signature fields in snapshot, found {len(out)}")
    return out


def assert_signature_images(doc: fitz.Document, fields_path: Path | None = None) -> list[dict]:
    images: list[dict] = []
    for page_index in (16, 17):
        page = doc[page_index]
        for info in page.get_image_info(xrefs=True):
            bbox = info.get("bbox")
            if not bbox:
                continue
            x0, y0, x1, y1 = bbox
            h = y1 - y0
            w = x1 - x0
            if h < 8 or w < 20:
                continue
            if y0 < 150:
                continue
            images.append(
                {
                    "page": page_index + 1,
                    "bbox": [round(v, 1) for v in bbox],
                    "width_pt": round(w, 1),
                    "height_pt": round(h, 1),
                }
            )

    sig_images = [img for img in images if img["height_pt"] >= 10]
    if len(sig_images) < 4:
        raise AssertionError(
            f"Expected >=4 signature images on p17-18 (use image burn-in, not typed-only), found {len(sig_images)}: {sig_images}"
        )

    for img in sig_images[:4]:
        if abs(img["height_pt"] - TARGET_SIG_HEIGHT_PT) > HEIGHT_TOL_PT:
            raise AssertionError(
                f"Signature image height {img['height_pt']}pt not within {HEIGHT_TOL_PT}pt of {TARGET_SIG_HEIGHT_PT}pt: {img}"
            )
    return sig_images[:4]


def assert_date_text_inside_drawn_boxes(doc: fitz.Document) -> dict:
    """Assert each date value text bbox is inside the visible drawn box (get_drawings), not AcroForm widget."""
    row_targets = {
        "landlord": 250.4,
        "landlord_lis": 385.7,
        "tenant_1": 519.4,
        "tenant_tis": 407.3,
    }
    results: dict = {"rows": {}, "ok": True}
    page_rows: dict[int, list[list[fitz.Rect]]] = {}
    for page_index in (16, 17):
        page_rows[page_index] = cluster_date_rows(inner_date_drawn_boxes(doc[page_index]))

    for row_name, page_index, day, month, year in DATE_ROW_EXPECTATIONS:
        page = doc[page_index]
        target_y = row_targets[row_name]
        boxes = row_boxes_for_y(page_rows[page_index], target_y)
        if not boxes or len(boxes) < 3:
            raise AssertionError(f"Date row {row_name}: could not find 3 drawn boxes near y={target_y}")

        day_box, month_box, year_box = boxes[0], boxes[1], boxes[2]
        day_bbox = find_text_bbox_near_row(page, day, boxes)
        month_bbox = find_text_bbox_near_row(page, month, boxes)
        year_bbox = find_text_bbox_near_row(page, year, boxes)
        if not day_bbox or not month_bbox or not year_bbox:
            raise AssertionError(
                f"Date row {row_name}: missing text spans day={bool(day_bbox)} month={bool(month_bbox)} year={bool(year_bbox)}"
            )

        checks = {
            "day": bbox_inside(day_bbox, day_box),
            "month": bbox_inside(month_bbox, month_box),
            "year": bbox_inside(year_bbox, year_box),
        }
        results["rows"][row_name] = {
            **checks,
            "drawn_boxes": {
                "day": list(day_box),
                "month": list(month_box),
                "year": list(year_box),
            },
            "text_bboxes": {
                "day": list(day_bbox),
                "month": list(month_bbox),
                "year": list(year_bbox),
            },
        }
        if not all(checks.values()):
            results["ok"] = False
            raise AssertionError(f"Date row {row_name} text outside drawn boxes: {results['rows'][row_name]}")
    return results


def assert_stamp_not_in_date_boxes(doc: fitz.Document) -> dict:
    violations: list[dict] = []
    row_targets = {
        "landlord": (16, 250.4),
        "tenant_1": (16, 519.4),
    }
    for row_name, (page_index, target_y) in row_targets.items():
        page = doc[page_index]
        rows = cluster_date_rows(inner_date_drawn_boxes(page))
        boxes = row_boxes_for_y(rows, target_y)
        if not boxes:
            continue
        day_rect, month_rect = boxes[0], boxes[1]
        for span in text_spans_on_page(page):
            text = span["text"]
            if not any(m in text for m in AUDIT_MARKERS):
                continue
            bbox = span["bbox"]
            if rects_intersect(bbox, day_rect) or rects_intersect(bbox, month_rect):
                violations.append({"row": row_name, "text": text.strip(), "bbox": list(bbox)})
    if violations:
        raise AssertionError(f"Audit stamp text overlaps date drawn boxes: {violations}")
    return {"violations": violations, "ok": True}


def assert_addendum_dates(doc: fitz.Document) -> dict:
  text = ""
  for page_index in range(doc.page_count):
      text += doc[page_index].get_text("text")
  found = EXPECTED_ADDENDUM_DATE in text
  if not found:
      raise AssertionError(f"Addendum date {EXPECTED_ADDENDUM_DATE} not found in executed PDF")
  return {"expected": EXPECTED_ADDENDUM_DATE, "found": found}


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: assert-ft6600-execution-pdf.py <executed.pdf> [fields-snapshot.json]", file=sys.stderr)
        return 2
    pdf_path = Path(sys.argv[1])
    fields_path = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    if not pdf_path.is_file():
        print(f"file not found: {pdf_path}", file=sys.stderr)
        return 2

    doc = fitz.open(pdf_path)
    report: dict = {"pdf": str(pdf_path), "page_count": doc.page_count, "assertions": {}}
    try:
        if fields_path and fields_path.is_file():
            report["assertions"]["fields_snapshot_heights"] = assert_fields_snapshot_heights(fields_path)
        report["assertions"]["signature_images"] = assert_signature_images(
            doc, fields_path if fields_path and fields_path.is_file() else None
        )
        report["assertions"]["date_drawn_box_containment"] = assert_date_text_inside_drawn_boxes(doc)
        report["assertions"]["stamp_containment"] = assert_stamp_not_in_date_boxes(doc)
        report["assertions"]["addendum_dates"] = assert_addendum_dates(doc)
        report["passed"] = True
    except AssertionError as e:
        report["passed"] = False
        report["error"] = str(e)
    finally:
        doc.close()

    print(json.dumps(report, indent=2))
    return 0 if report.get("passed") else 1


if __name__ == "__main__":
    raise SystemExit(main())
