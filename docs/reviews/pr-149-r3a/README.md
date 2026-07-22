# PR #149 R3a visual gate

After shots of form field Tailwind migration (desktop 1280×900, mobile 390×844).

Harness forced focus/error-focus via class mirrors of `:focus` so screenshots capture rings without live focus.

| File | Check |
| --- | --- |
| `*-01-input-rest.png` | Input at rest (`--quni-line` border) |
| `*-02-input-focused.png` | Coral focus ring (`--shadow-focus`) |
| `*-03-input-error.png` | Danger border + field error text |
| `*-04-input-error-focused.png` | Danger border + red focus glow |
| `*-05-select-textarea.png` | Select + textarea chrome |
| `*-06-form-grid.png` | Auto-fit `minmax(232px,1fr)` — 2-col desktop / 1-col mobile |
| `*-07-form-grid-stack.png` | Forced single-column stack grid |
| `*-08-validation-chrome.png` | Section banner, field error, save hint, success flash, save btn |
| `*-09-checkbox-error.png` | Checkbox danger outline (not ring) |
