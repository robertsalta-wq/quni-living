# Quni Logo Export — Phase 2

Second export pack. All files in this folder are recolors, recrops, or rescales of the Phase 1 masters — no redrawn paths.

**Masters used (read-only inputs):**
- `quni-logo-export-phase1/source/quni-logo-master.svg` — every wordmark variant
- `quni-logo-export-phase1/source/quni-mark-master.svg` — every Q-only mark

## File map

| File | Spec | Repo destination |
|---|---|---|
| `web/quni-logo.svg` | Coral wordmark, transparent | `public/quni-logo.svg` |
| `marketing/quni-logo-navy.svg` | Navy `#1F2A44` wordmark, vector | `public/quni-logo-navy.svg` |
| `marketing/quni-logo-navy.png` | Navy wordmark, 176×80, transparent | `public/quni-logo-navy.png` |
| `marketing/quni-logo-navy@2x.png` | Navy wordmark, 352×160 | `public/quni-logo-navy@2x.png` |
| `lockup/quni-logo-living-lockup.svg` | `Quni` + `Living` lockup, `#lockup-h` and `#lockup-stacked` symbols. Wordmark path inlined inside each symbol. **PRE-PM-SIGN-OFF DRAFT.** | Hold until decision below |
| `lockup/quni-logo-living-lockup-h.svg` | Standalone horizontal variant (renders directly via `<img>`) | Hold until sign-off |
| `lockup/quni-logo-living-lockup-stacked.svg` | Standalone stacked variant (renders directly via `<img>`) | Hold until sign-off |
| `favicons/favicon-48x48.png` | Mark, coral on cream, 48×48 | `public/favicon-48x48.png` |
| `pdf/quni-logo-pdf.svg` | Coral wordmark, vector | PDF generators that support SVG |
| `pdf/quni-logo-pdf.png` | Coral wordmark, 240×109, transparent | PDF generators that don't |
| `android/quni-launcher-master-1024.png` | Mark coral on cream, 1024², optical-lifted | Play Store + adaptive icon source |
| `android/quni-launcher-foreground.png` | Mark only, 432×432, fits 264 safe circle, transparent | Android adaptive-icon foreground layer |
| `android/quni-splash-cream.png` | Coral mark on cream, 1242×2688 | Default splash |
| `android/quni-splash-coral.png` | White mark on coral, 1242×2688 | Brand-forward splash variant |
| `print/quni-logo-black.svg` | Black `#0F0D0B` wordmark, vector | Print, fax, embroidery handoff |
| `print/quni-logo-black.png` | Black wordmark, 240×109 | Raster fallback |
| `print/quni-logo-black@2x.png` | Black wordmark, 480×218 | Retina print decks |
| `admin/quni-logo-admin-compact.svg` | Mark only, square viewBox, `width="24" height="24"` | Collapsed admin sidebar |

## Open question — lockup ships AFTER decision

`lockup/quni-logo-living-lockup.svg` is a **working draft**, not signed off.

- Type for "Living": currently drafted as **Fraunces italic 400**, same family as the wordmark, +22 letter-spacing, ~0.45× cap height (matches Phase 1 preview option `01 — Fraunces italic`).
- Layout: ships with **both** `<symbol id="lockup-h">` and `<symbol id="lockup-stacked">`; the default rendered shape is horizontal.
- The "Living" text is **not outlined** — depends on Fraunces being available wherever the SVG renders. Outline-to-path is required before final ship to PDF / print.

Block on PM sign-off, then re-export with outlined text.

## Preview

Open `preview/phase2-exports.html` to see every output rendered on a neutral page.

## Acceptance check (Phase 2 quality bar)

- ✅ All wordmark variants come from a single `replace(/#FF6F61/g, ...)` pass on the master — letterforms identical to Phase 1
- ✅ All mark variants come from a single transform on the mark master — Q geometry identical to Phase 1
- ✅ Every PNG has a true transparent background unless the spec called for cream/coral
- ✅ Launcher master optical-lifted 2.5% to compensate for serif Q's bottom-right weight
- ✅ Foreground mark fits inside Android's 264-unit safe circle (height = 0.92 × 264)
- ⏳ Lockup type & layout pending PM sign-off — do not deploy
- ⏳ Lockup "Living" not yet outlined to paths — required before final ship

## Out of scope

Same as Phase 2 spec — no animated/Lottie, no email signatures, no merch/large-format vector retracing, no new colourways beyond navy/black/cream/coral/white.
