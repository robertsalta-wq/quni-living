# Quni container system — card-lint heuristic tighten (2026-07)

Follow-up to C2/C-lint (#131) and C4 (#134). Scripts-only precision pass.

## Why

C-lint’s padding tell (`px-*` / `py-*`) correctly caught axis-padded cards, but also matched buttons, inputs, chips, and `py-1` menus. Those files sat on `containerLegacy.json`, so a *new* hand-rolled card dropped into them would not fail CI.

## Exclusions (not cards)

- `inline-flex` — button clusters
- `rounded-full` — chips / pills
- `placeholder:`, `quni-input-border`, `focus:ring|border|shadow` — inputs (cards use `focus-visible:*`)
- `hover:bg-*` without uniform `p-*` — axis-padded buttons
- Vertical-only padding (`py-*` without `px-*` / `p-*`) — menus
- Resting `bg-*` / `shadow-*` only — ignore `hover:` / `focus:` / `active:` prefixes

## Result

`containerLegacy.json` shrinks to leftover toast / popover / nested-inset chrome (candidates for a later menu or toast primitive). Pure-control files leave the grandfather list and become actively locked.
