# Quni C3 — `.quni-modal` Classification + Lock (2026-07-21)

Sibling to C1 (#129), C2 (#130), C-lint (#131). Discipline: classify → review → implement → verify → shrink `containerLegacy.json`. Cursor drafted the C3 plan; this doc is the reconciled, signed-off version and is authoritative.

## The primitive
`.quni-modal` is `.quni-card` with the heavier modal shadow — boxed at all breakpoints. Values: border `1px solid var(--quni-line)`, radius `var(--radius-lg)` (16px), background `var(--quni-surface-1)`, box-shadow `var(--shadow-3)`. Place it right after `.quni-card` in `quni-design-tokens.css`. Verified: `--shadow-3` is the "modal / popover" token, and `shadow-admin-modal` already aliases `var(--shadow-3)`.

Scope is the **dialog panel only** — the `fixed inset-0` scrim, `z-*`, `max-w-*`, `max-h-*`, `overflow-*`, and padding all stay per-usage at the call site.

## Locked decisions (signed off 2026-07-21)
1. `.quni-modal` shadow → `--shadow-3` (heavier than cards' `--shadow-1`).
2. Class owns the panel only; overlay/scrim/z-index/max-width/padding stay at the call site.
3. `LegalDocumentModal` → `.quni-modal` + mobile un-elevate utilities (preserve the sheet); ring→border on desktop is an accepted normalize.
4. Drawers / dropdowns / booking bottom sheets → OUT.
5. Admin dialog shells → IN C3; admin page cards → still C4.
6. Add `LandlordMobileProfileTab` delete dialog to the A-set (`shadow-lg` scan miss).
7. `RenterProfileShell` → OUT (CSS-class styled, not a hand-rolled panel).
8. `hand-rolled-modal` CI rule → separate PR right after C3 migrate.

### C3 PR order
1. Add `.quni-modal` to `quni-design-tokens.css`.
2. Convert dedicated `*Modal` A-set + `LegalDocumentModal` + `LandlordMobileProfileTab` delete dialog.
3. Convert inline product dialogs.
4. Convert admin dialog shells.
5. Shrink `containerLegacy.json` for cleared files.
6. Verify + PR. Modal lint = next PR.
