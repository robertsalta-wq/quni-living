# Quni Admin — The Living Console

A redesign of the Quni Living admin shell. Replaces the prior flat-sidebar admin with a calm, dense operations console rooted in the Quni Living Design System.

> **Naming note:** the hero label is **The Living Console** (renamed from *Mission Control* per the brief). The sidebar subtitle echoes it.

## How this differs from the previous admin

| Area | Previous | The Living Console |
| --- | --- | --- |
| Sidebar IA | 19 flat items | 4 collapsible sections (Marketplace · People · Operations · Settings) — 19 items, grouped |
| Active state | Indigo tint | Coral tint (`--quni-coral-tint-15`) with coral-active text |
| Top chrome | None | Persistent top bar: breadcrumb · ⌘K search · env badge · notifications · avatar |
| Overview | KPI grid only | Editorial Playfair hero + ATTENTION strip + 6 zone cards + Marketplace Pulse |
| Tables | Generic | Toolbar with chip filters · sticky header · zebra rows · row → drawer · tabular-nums |
| Pricing CTAs | Green `#1D9E75` | Coral primary (green retained only for `LIVE · PHASE 1` lifecycle pill) |
| Verification badges | Mixed (emerald + indigo ring + emoji) | Role-based: Landlord coral · Student navy · Identity ink — Lucide check, no emoji |
| Icons | Mixed inline SVG + emoji | Single Lucide outline set, 1.75 stroke |
| Empty states | Ad-hoc | One canonical: text + Lucide glyph + single coral CTA |
| Loading | Skeletons / mixed | 2 px coral ring spinner |
| Error | Generic | Quiet ink-3 message + Lucide warning + navy "Retry" |

All tokens (colour, type, radius, shadow, spacing) come from `colors_and_type.css`. No new values were invented.

## Screens

1. **Shell** — applies to every screen. 224 px cream sidebar, sticky top bar at 56 px height, `max-w-[1600px]` content, `px-10 py-8` page padding.
2. **Overview — The Living Console** — opens on sign-in.
3. **Bookings** — canonical dense table; right-side drawer is shown open on row 3.
4. **Pricing** — heavy form with live preview card and immutable change log.
5. **States** — every other sidebar item routes to one of empty / loading / error.

Switch screens via the sidebar.

## New patterns introduced

These are gap-fill patterns. They were not in the design system and should be promoted into it as components, not invented again locally:

| Pattern | Where | Notes |
| --- | --- | --- |
| **Zone card** | Overview | Card + tinted icon square + title/eyebrow + inline sparkline + 3 dotted status rows + "Open zone →" footer link. Coral or navy sparkline based on whether the metric is coral-primary. |
| **Inline sparkline** | Zone cards + Marketplace Pulse cells | Pure SVG, single-colour fill at 8 % under the line. No legend, no axes. |
| **ATTENTION strip** | Overview | Cream-tinted bar; pill list with semantic dots (red/amber/navy) and inline "Fix →" links. Acts as a triage queue above the fold. |
| **Marketplace Pulse cell** | Overview | Four-column row, each: eyebrow · large tabular-nums value · delta pill · sparkline · drill-in link. Coral series only when the metric itself is coral-primary; navy otherwise. |
| **Table toolbar with chip filters** | Bookings | Search input + 4 chip filters (`Status: All ▾` form) + right-aligned count + sort indicator. Chips toggle to coral-tint-15 when active. |
| **Detail drawer (sticky panel)** | Bookings | 380 px right-rail card; sticky to top bar; auto-opens on row click with coral left-edge marker on the selected row. |
| **Live preview card** | Pricing | Sticky right-column card mirroring the landlord-facing tier card with the form's unsaved values. |
| **Immutable change log table** | Pricing | Diff cells using `success-bg` (added) / `danger-bg` (removed, line-through) per system semantics. |
| **Env badge** | Top bar | Status pill with dot — green Live / amber Preview. |

## Design-system gaps to fill

Patterns I reached for that the system doesn't formally cover. Suggested as additions:

- **Sparkline primitive** — single-series chart, colours from `--chart-1`/`--chart-2`. Add to `preview/` as a card.
- **Top-bar pattern** — breadcrumb, command-bar search, env badge, notifications, avatar menu. Sidebar exists; the matching top bar doesn't.
- **Right-rail drawer** — used for booking detail, but also relevant for property, student, landlord, payment detail views.
- **Page-section eyebrow + Playfair display title** — already in marketing hero, but not formalised for in-app editorial moments like The Living Console.
- **Status-dot pill** — pill-with-leading-dot variant (used in ATTENTION strip and lifecycle pills). Different shape than the existing role-verification pills.
- **Chip filter** — used heavily in the Bookings toolbar; not currently a documented control.
- **Diff cell** — semantic-coloured monospace span with strikethrough, for change logs.

## File layout

```
index.html              shell + script loader
colors_and_type.css     copied from design system (unmodified)
icons.jsx               Lucide-style inline SVG set used across the admin
shell.jsx               Sidebar, TopBar, Shell wrapper, Card/Button/Pill/Eyebrow/Sparkline/VerifiedBadge primitives
overview.jsx            The Living Console — hero, ATTENTION, 6 zones, Marketplace Pulse
bookings.jsx            dense table + drawer + chip filters + pagination
pricing.jsx             tabbed form, live preview, change log
states.jsx              empty / loading / error canonical examples
app.jsx                 router
```

## Validation against the brief

- ✅ Coral is canonical (`#FF6F61`) — no `#FF7261` drift anywhere.
- ✅ Coral = primary CTAs + sidebar active state. Navy = secondary + chart series 2. Greens/ambers/reds/sky = status only.
- ✅ Purple `--quni-ai` not used (no AI surface in scope).
- ✅ Lucide outline throughout. No emoji.
- ✅ Inter for UI; Playfair only for the editorial hero (`The Living Console.`, with *Console* italic).
- ✅ Four-section grouped IA, 19 items.
- ✅ No glassmorphism, no gradient heroes inside admin, no oversized illustrations in empty states.
- ✅ Light-only.
