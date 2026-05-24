# Quni Logo Export — Phase 1

Minimum-viable export pack for the live site, favicons, social previews, and the Landlord AI page.

**Brand:** Quni Living — warm, editorial, trustworthy. Serif wordmark "Quni".

## Colours

| Token | Hex | Use |
|---|---|---|
| Coral (primary) | `#FF6F61` | Wordmark + accents |
| Header cream | `#FEF9E4` | Page background (NOT baked into PNGs) |
| AI purple | `#B65FCF` | Landlord AI page only |
| AI page dark | `#0F0D0B` | Background for `/landlords/ai` |
| White | `#FFFFFF` | Footer wordmark, coral bands |

All wordmark PNGs ship with **true transparent backgrounds**. SVG is the master.

## File mapping

| File | Goes in repo | Used for |
|---|---|---|
| `web/quni-logo.png` | `public/quni-logo.png` | Main site header (cream bg) |
| `web/quni-logo@2x.png` | `public/quni-logo@2x.png` | Retina main site header |
| `web/quni-logo-white.png` | `public/quni-logo-white.png` | Footer on coral |
| `web/quni-logo-white@2x.png` | `public/quni-logo-white@2x.png` | Retina footer |
| `web/quni-logo-ai-purple.png` | `public/quni-logo-ai-purple.png` | `/landlords/ai` header on dark |
| `web/quni-logo-ai-purple@2x.png` | `public/quni-logo-ai-purple@2x.png` | Retina AI header |
| `favicons/favicon.svg` | `public/favicon.svg` | Modern browser tab |
| `favicons/favicon.png` | `public/favicon.png` | 32×32 PNG fallback, JSON-LD logo |
| `favicons/favicon-16x16.png` | `public/favicon-16x16.png` | 16×16 tab icon |
| `favicons/apple-touch-icon.png` | `public/apple-touch-icon.png` | iOS home-screen (180×180, Q on cream) |
| `social/og-default.png` | `public/og-default.png` | iMessage, WhatsApp, Slack, Twitter link previews |
| `social/og-default.jpg` | `public/og-default.jpg` | JPEG fallback (<300 KB) for OG |

## Sources

| File | Notes |
|---|---|
| `source/quni-logo-master.svg` | Horizontal "Quni" wordmark. Coral `#FF6F61`. Transparent artboard. **This is the master — recolor from here.** |
| `source/quni-mark-master.svg` | Standalone Q only, same serif. Master for favicons. |

## HTML snippet

```html
<!-- in <head> -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

<meta property="og:image" content="https://quni.com.au/og-default.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Quni — verified rooms near Australian universities">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://quni.com.au/og-default.png">
```

```html
<!-- header on cream -->
<img src="/quni-logo.png" srcset="/quni-logo.png 1x, /quni-logo@2x.png 2x"
     alt="Quni" height="40" width="auto">

<!-- footer on coral -->
<img src="/quni-logo-white.png" srcset="/quni-logo-white.png 1x, /quni-logo-white@2x.png 2x"
     alt="Quni" height="32" width="auto">

<!-- /landlords/ai header on #0F0D0B -->
<img src="/quni-logo-ai-purple.png" srcset="/quni-logo-ai-purple.png 1x, /quni-logo-ai-purple@2x.png 2x"
     alt="Quni" height="40" width="auto">
```

## Quality bar (verified)

- ✅ Identical letterforms across all wordmark exports (single master path, recolored)
- ✅ Favicon Q readable at 16×16
- ✅ OG image (1200×630) reads as a small thumbnail
- ✅ All wordmark PNGs have transparent backgrounds (no cream rectangle, no baked shadow)
- ✅ OG JPEG under 300 KB

## Do not redesign

This pack is an **export only** of the existing master. If the wordmark needs to change, edit `source/quni-logo-master.svg` and re-export.
