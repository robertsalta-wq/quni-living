# Technical debt register

Items that are acceptable for now but must be revisited before related work ships or dependencies upgrade.

## DocuSeal — duplicate signature tags on official FT6600 (NSW)

**Added:** 2026-06-03  
**Area:** `api/lib/docuseal.shared.js`, future NSW official-fill generator  
**Risk:** High — signing can silently break on DocuSeal upgrade.

### What we depend on (undocumented)

On the official NSW Fair Trading FT6600 PDF (`docs/nsw/residential-tenancy-agreement-form-2025-12.pdf`), after `fill → flatten → overlay` production DocuSeal tags, the parser only returns two submitters when **two extra 14pt black tags** duplicate the names `Landlord Signature` and `Tenant Signature`. Invisible (1pt white) tags do not parse.

This is **not** documented DocuSeal API behaviour; it is spike-observed only.

### Instance pin

- **Production signing:** `https://sign.quni.com.au` (self-hosted DocuSeal).
- **Pin:** Record the running DocuSeal app version in infrastructure notes when deploying `sign.quni.com.au`. Do **not** upgrade that instance without re-running the official FT6600 submission smoke test below.

### Before any DocuSeal upgrade

1. Build or open `scripts/test-official-form-spike/refined-b-v2.pdf` (flattened official PDF + widget tags).
2. Add parser anchors at **page index 16**, bottom-left: `(12, 18)` and `(12, 34)` (see `docs/nsw/ft6600-acroform-mapping.md` § Signing).
3. POST via `createDocusealSubmissionFromPdf` with `DOCUSEAL_SEND_EMAIL=false`.
4. **Pass:** `First Party` + `Second Party`, ≥7 signature/date fields, field areas on page 16 at official signature column (~`x` 0.06, `y` 0.18–0.78), not mid-body.
5. **Fail:** Do not promote the upgrade; investigate anchor/tag recipe.

### Executed PDF tag literals (micro-spike 2026-06-03)

Completed submission **87** (deleted after test): source upload had **9** `{{` occurrences; **downloaded executed PDF had 0** — DocuSeal consumes tag text on completion. Visible literals on the draft/source PDF are **cosmetic only**; margin-anchor recipe `(12,18)` / `(12,34)` on page 16 is acceptable for signing module.

Re-run: `node scripts/test-ft6600-executed-tag-spike.mjs` after DocuSeal upgrades.

## Official FT6600 — schedule AcroForm misaligned with printed boxes

**Added:** 2026-06-03  
**Area:** `api/lib/documents/officialNswFt6600Fill.ts`, `officialNswFt6600BurnIn.ts`  
**Risk:** High — schedule text lands in wrong rows if enabled without calibration.

### Problem

The Dec 2025 Fair Trading PDF attaches almost all widgets to page 0, but **widget rectangles do not line up with the visible “Landlord Name (1)”, tenant rows, etc.** Mapping by AcroForm name (`Text field 1.3`, `2.4`, …) or by widget rect still produces scrambled output in DocuSeal and downloads.

### Fix shipped (2026-06-03)

Burn-in now resolves the correct PDF page per widget (`findTextFieldWidgetPageIndex` — do not default to page 0). Re-run `node scripts/export-ft6600-widget-placements.mjs` after template updates.

### Production default

Prescribed Fair Trading PDF via `officialNswFt6600Fill.ts` + `officialNswFt6600BurnIn.ts`. React-pdf only when `NSW_USE_OFFICIAL_FT6600_REACT_PDF_FALLBACK=1`.

### Follow-up (when implementing NSW signing module)

- Use approved margin anchors on page 16 (not body `(40,600)`).
- Widget tags ≥12pt at signature rects (see `refined-b-v2.pdf` baseline).
