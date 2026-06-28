# Handoff: Quni renter dashboard (cleanup & reorder)

## Overview
The renter dashboard for **Quni Living** (Australian student-accommodation marketplace). This is a **cleanup and reorder of an existing page**, not a new feature. Two redundant profile-completion prompts were collapsed into one, and the stat cards were promoted from the bottom of the page to directly under the welcome heading so the hierarchy reads top-down.

The page models its visual treatment on the existing **landlord dashboard** (same stat-card style, same coral-highlighted profile card, same tab row).

## About the design files
The files in this bundle are **design references created in HTML** — a prototype showing the intended look and behaviour, not production code to ship directly. Recreate this design in the target codebase (the live Quni app is **React + Tailwind**) using its established components, tokens, and patterns. The `.dc.html` file is a self-contained prototype; open it in a browser to see the live design (it shows desktop and mobile side by side on a pannable canvas).

## Fidelity
**High-fidelity.** Final colours, typography, spacing, and interactions. Recreate the UI pixel-perfectly using the codebase's existing primitives. All exact values are in [Design tokens](#design-tokens) below.

## Screens / views
The prototype shows **one screen at two widths**.

### 1. Renter dashboard — desktop (1240px frame, 1176px content max-width)
**Purpose:** the renter's home; see bookings/messages at a glance, finish profile setup, find a place, manage rent billing.

Top-to-bottom layout:
1. **Cream header** — logo lockup (Playfair "Quni" wordmark + sparkle mark), primary nav (Listings / For students / Pricing / For landlords / Universities), and right-side Messages link, Dashboard link, avatar button. Unchanged from the rest of the app.
2. **Eyebrow** — "Dashboard" in coral, 13px/600.
3. **Welcome block** — `h1` "Welcome back, {name}" (Playfair) + a one-line subline, with a coral "Browse listings" button right-aligned at the baseline.
4. **Stat-card row** — a 5-column CSS grid, `gap:16px`. This is the dashboard's spine. Cards in order:
   - **Bookings** — count (default 0) + "No requests".
   - **Messages** — count + subtext that turns coral & semibold when unread ("1 unread"), else grey "No new messages".
   - **Your profile** — *highlighted card* (coral border + 6% coral fill + coral eyebrow). Shows "{percent}%" + "complete", a thin coral progress bar, and a "Finish setup →" link. **This is the ONLY profile-completion UI on the page** — the old full step-list checklist was removed; it lives on the separate Profile page.
   - **Find accommodation** — short blurb + "Browse listings →".
   - **Get support** — short blurb + "Contact support →".
5. **Section tabs** — Bookings (active, coral underline) · Messages (with coral count badge) · Profile. Bottom border rule. (No "Listings" tab — renters don't publish rooms.)
6. **Rent billing card** — full-width white card, heading + Stripe explainer + coral "Save a card for rent" button.
7. **"View sample agreements →"** coral text link.

### 2. Renter dashboard — mobile / app (390px frame)
Same content, single column. Differences:
- Compact cream header: wordmark + avatar + hamburger.
- Welcome heading 30px; full-width "Browse listings" button.
- Stat cards **stack**: Bookings + Messages share one row (two columns); the highlighted **Your profile** card is full-width with "Finish setup →" inline top-right; Find accommodation and Get support become full-width tappable rows with a coral "→" chevron.
- Same tab row, then the rent-billing card (button full-width), then the sample-agreements link.

## Components

### Stat card (default)
- Surface `#fff`, border `1px solid #E5E4E7`, radius `16px`, shadow `0 1px 2px rgba(8,6,13,.05)`, padding `18px` (desktop) / `16px` (mobile), `min-height:160px` (desktop row).
- Eyebrow label: `11px / 600`, `letter-spacing:.04em`, `text-transform:uppercase`, colour `#908897`.
- Metric number: `34px` (desktop) / `30px` (mobile), `700`, colour `#08060D`, `font-variant-numeric:tabular-nums`.
- Subtext: `13px`, colour `#6B6375` (or coral `#CC4A3C`/600 when it's a live count like unread messages).
- Link: `13px / 600`, coral `#FF6F61`, no underline, pinned to card bottom (`margin:auto 0 0`).

### Stat card (Your profile — highlighted)
- Same shape, but background `rgba(255,111,97,.06)`, border `1px solid rgba(255,111,97,.35)`, eyebrow colour `#B25548`.
- Progress track: height `6px`, radius `999px`, background `rgba(255,111,97,.18)`; fill `#FF6F61`, width = `{percent}%`.

### Section tabs
- Flex row, `gap:28px` (desktop), bottom border `1px solid #E5E4E7`.
- Active tab: `14px / 600`, `#08060D`, `border-bottom:2px solid #FF6F61` (offset `-1px` to sit on the rule).
- Inactive tab: `14px / 500`, `#6B6375`.
- Message badge: pill, `min-width:18px; height:18px`, background `#FF6F61`, text `#fff` `11px / 700`.

### Primary button
- Background `#FF6F61`, text `#fff` `14px / 600`, padding `11px 18px`, radius `10px`. Hover → `#F2604F`; press → `#CC4A3C` (no scale).

### Cream header
- Background `#FEF9E4`, bottom border `1px solid #E8E0CC`. Avatar circle uses navy tint `rgba(31,42,68,.10)` / text `#1F2A44`.

## Interactions & behaviour
- **"Finish setup →"** (profile card) and the **Profile** tab navigate to the renter Profile page (the page that holds the full multi-step setup checklist). That page is out of scope for this cleanup but is the link target.
- **Messages** card subtext + tab badge are driven by the unread count: `count > 0` → coral semibold "{n} unread" + visible badge; `0` → grey "No new messages".
- **Browse listings** → listings/search. **Save a card for rent** → Stripe card-capture flow. **Contact support** → support/help centre. **View sample agreements** → static agreements.
- Card hover (per design system): lift `translateY(-2px)`, shadow step up, `200ms cubic-bezier(0.2,0,0,1)`. Links shift to `#CC4A3C` + underline on hover.
- Responsive: 5-up grid on desktop collapses to the stacked mobile layout described above.

## State management
- `name: string` — renter's first name.
- `percent: number (0–100)` — profile completion; drives the % label and progress-bar width.
- `bookings: number` — active booking-request count.
- `messages: number` — unread message count; derives the subtext string, its colour/weight, and the tab badge.
- No data fetching in the prototype; wire these to the renter's profile/bookings/messages queries.

## Design tokens
These map to the Quni Living design system (`colors_and_type.css`). Use the codebase's existing CSS custom properties / Tailwind tokens rather than raw hex where they exist.

Colours
- Coral (brand / primary): `#FF6F61` · hover `#F2604F` · active/press & link-hover `#CC4A3C`
- Coral tints: fill `rgba(255,111,97,.06–.08)` · progress track `rgba(255,111,97,.18)` · border `rgba(255,111,97,.35)` · eyebrow text `#B25548`
- Cream panel: `#FEF9E4` · cream border `#E8E0CC`
- Navy (avatar / secondary): `#1F2A44` · tint `rgba(31,42,68,.10)`
- Ink ramp: heading `#08060D` · body `#4A4253` · secondary `#6B6375` · tertiary/eyebrow `#908897`
- Line: `#E5E4E7` · page background: `#F7F8FA` · surface: `#FFFFFF`

Typography
- Display / wordmark / welcome `h1`: **Playfair Display** 700, `letter-spacing:-.02em`; 40px desktop / 30px mobile, line-height ~1.1.
- Everything else: **Inter** (400/500/600/700). Body 14–16px, line-height ~1.5; eyebrow 11px uppercase `.04em`.

Radius: cards `16px` · buttons/inputs `10px` · pills/badges/avatars `999px`.
Shadow (resting card): `0 1px 2px rgba(8,6,13,.05)`.
Spacing: card gap `16px`; section gaps `24–28px`; card padding `16–18px`.
Motion: `200ms` `cubic-bezier(0.2,0,0,1)`; no bounce/spring.

## Assets
- **Quni wordmark** — rendered in Playfair Display as a text placeholder (`#FF6F61`). Production uses a raster `/quni-logo.png`; swap it in.
- **Sparkle mark** — small inline SVG next to the wordmark.
- Icons elsewhere should use **Lucide** (outline, 1.5–2px stroke) per the design system. No emoji.

## Files
- `Renter Dashboard.dc.html` — the prototype (desktop + mobile frames on a canvas). Open in a browser to view.
- `support.js` — runtime needed for the `.dc.html` prototype to render standalone. Not part of the design to implement.
