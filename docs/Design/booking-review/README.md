# Handoff: Booking pages — landlord view (Quni Living)

Two landlord-facing pages that are **two compositions of one shared component system**:

1. **Review request** (`Review request.dc.html`) — an incoming, **not-yet-accepted** booking request. A decision page.
2. **Booking confirmed** (`Booking confirmed.dc.html`) — the **post-acceptance** page for the same booking.

Same marketplace (**Quni Living**, Australian student accommodation), same landlord (Quinn), same **Self-managed (Quni Listing)** tier, same coral/cream design system and tokens. Build them as **one set of reusable components** assembled differently per lifecycle stage — not two bespoke screens.

> ⚠️ **Hard rule — no bond-custody language.** On the Listing tier the bond is collected **off-platform, directly from the renter, and Quni holds nothing and charges the renter nothing**. Never introduce "Quni holds your bond", Stripe, escrow, or "platform fee charged to renter". All copy below is intentional.

## About the design files
The bundled `.dc.html` files are **design references created in HTML** — prototypes of the intended look and behavior, **not production code to copy**. They use an internal prototyping runtime (`support.js`, `<x-dc>`, `{{ }}` holes, `<image-slot>`, `sc-if`) that is **tool-specific — do not reproduce it**.

Your task: **recreate these in the target codebase** — the real Quni app is **React + Tailwind**. Use its existing components, tokens and patterns; if starting fresh, React + Tailwind is the right default. Pull exact values from **Design tokens** below, not from the prototype's inline styles. All visible values (names, dates, amounts, verification states, fit rows, AI text, the student's message) are **current data bound from the booking**, not literals to hardcode.

## Fidelity
**High-fidelity.** Final colors, type, spacing, radii, shadows and interactions are specified. Reuse the app's existing primitives (button, status pill/badge, card, `VerifiedStudentBadge`) where they exist rather than re-building.

---

## Shared component system

Build these once; both pages compose them. Suggested names in **bold**.

| Component | Role | Key props |
| --- | --- | --- |
| **BookingShell** | Page frame: top bar (wordmark + breadcrumb + "Landlord · Quinn"), `max-width:1180px` wrapper, the two-column grid with the **sticky right column**, and the **two-box top strip** in the left column. Renders `leftSlots[]` and a single `rightCard`. | `breadcrumb`, `title`, `statusPill`, `reference`, `receivedAgo`, `property`, `rightCard`, `children` (left detail sections) |
| **StatusPill** | Small rounded pill, 7px leading dot. | `tone` (`info`/`warning`/`success`/`danger`/`neutral`), `label` |
| **TierPill** | Navy-tint pill, static. | `label` ("Self-managed (Quni Listing)") |
| **PropertyBox** | Box 2 of the strip: address + suburb/room + 88px primary-photo thumbnail. | `address`, `locality`, `roomType`, `photoUrl` |
| **ApplicantCard** | Avatar (initials) + name + **VerifiedStudentBadge** + course line. Top of the right card. | `name`, `initials`, `verifiedStudent`, `university`, `course`, `year` |
| **VerificationRows** | Labeled list: each row = icon + label + status pill. | `rows[]` = `{ label, state: 'verified'|'notProvided', icon }` |
| **KeyFacts** | 2-col caption/value grid; supports full-width cells + an optional footnote. | `facts[]` = `{ label, value, sub?, fullWidth? }`, `note?` |
| **FitSummary** | 4-col table (Criteria / Applicant / Listing / Status) with Match/Unknown/Mismatch pills. | `rows[]` = `{ criteria, applicant, listing, status: 'match'|'unknown'|'mismatch' }` |
| **AiAssessment** | AI-accented card (purple): sparkle + eyebrow, optional heading, paragraph, Refresh control + timestamp, disclaimer. | `heading?`, `body`, `updatedLabel`, `onRefresh`, `prominent?` (adds faint purple wash + stronger border) |
| **StudentMessage** | Coral-ruled blockquote + attribution. | `message`, `author` |
| **VerifiedStudentBadge** | Navy role badge w/ check (design-system rule: Student = navy). | — |

The right column is **one card** (`RightSummaryCard`) that stacks: ApplicantCard → divider → VerificationRows → divider → KeyFacts (+ note) → divider → **action region** (the only part that differs between pages) → (Booking confirmed only) a DeadlineHighlight above the action.

---

## The two compositions — what differs

Everything below the line is the entire diff between the pages. Same shell, same shared components.

### What MOUNTS

| Left column (top → bottom) | Review request | Booking confirmed |
| --- | --- | --- |
| WhatHappensNext (green explainer) | ✗ | ✓ (first) |
| TenancyAgreement (Review & sign via DocuSeal) | ✗ | ✓ |
| AiAssessment | ✓ **first, `prominent`** | ✓ (last) |
| FitSummary | ✓ | ✓ |
| StudentMessage | ✓ | ✓ |

The three post-acceptance cards (**WhatHappensNext, TenancyAgreement, and the rail's DeadlineHighlight**) only exist once a request is accepted — the tenancy agreement doesn't exist until then. On Review request they are not rendered.

### Right-card ACTION REGION (the key swap)

- **Review request** — a two-button **decision**:
  - **Accept request** — coral primary (`#FF6F61`), full width, check icon. Safe default.
  - **Decline** — secondary/muted (transparent, `1px #E5E4E7` border, text `#6B6375`), full width.
  - Decline is **destructive → requires a confirm step**: clicking Decline replaces the buttons with a red confirm box ("Decline this request? Geonho will be notified and the room stays listed for other students.") + **Confirm decline** (filled red `#DC2626`) and **Keep request** (tertiary). Confirm → declined; Keep → back to the two buttons.
  - After **Accept** → a green confirmation note ("Request accepted. The tenancy agreement and bond steps are now unlocked."). After **Confirm decline** → a neutral note ("Request declined. The room remains listed for other students.").
- **Booking confirmed** — a one-way primary action:
  - **Bond received from renter** — coral primary; on click becomes green "Bond received" and flips the status pill + deadline box. Plus a secondary **Sign tenancy agreement** link.

### Other per-page values

| | Review request | Booking confirmed |
| --- | --- | --- |
| Breadcrumb | "Bookings · Review request" | "Bookings" |
| Box-1 title | "Booking request" | "Booking confirmed" |
| Status pill (default) | **info** — "Awaiting your response" (`bg #E0F2FE`, `fg #075985`) | **warning** — "Bond pending" (`bg #FEF3C7`, `fg #92400E`) |
| Status pill (after action) | success "Request accepted" / danger "Request declined" | success "Bond received" |
| KeyFacts — Bond | "$800" + note "Bond is collected off-platform, directly from the renter, **after you accept**. Quni holds nothing." | "$800" + "off-platform" |
| KeyFacts — Platform fee | "$0" | "$0" |
| DeadlineHighlight | **none** (no deadline until accepted) | coral box "Confirm bond received by · 1 July 2026" (→ green "Bond confirmed" after action) |
| AiAssessment | most prominent (top, purple wash). Heading "Should you accept Geonho's request?". Pre-decision copy flags that **ID/enrolment aren't provided** and **bills need confirming**. | standard white card at the bottom. Post-acceptance fit summary copy. |

---

## Shared data (same booking, both pages)
- **Reference** D414F981 · Received 5 days ago.
- **Property**: 18 Malvina Street, Ryde, NSW 2112 · Private room · primary photo (88×88, rounded, `object-fit:cover`).
- **Applicant**: Geonho Lee (initials GL), Verified Student, Macquarie University, Bachelor of Professional Accounting, Year 2.
- **Verification**: University email = Verified; ID document = Not provided; Enrolment = Not provided.
- **Booking facts**: Move-in 7 Jul 2026; Lease 6 months; Bond $800 (off-platform); Platform fee $0; Service model Self-managed (Quni Listing).
- **Fit summary** (`status` enum Match | Unknown | Mismatch):
  - Move-in date | 7 Jul 2026 | Available 1 Jul 2026 | Match
  - Lease length | 6 months | 6–12 months | Match
  - Occupancy | Single occupant | 1 person | Match
  - Pets | Not specified | No pets | Unknown
  - Bills | Expects bills included | Bills excluded | Mismatch
  - Furnishing | Furnished preferred | Furnished | Match
- **Student message**: "Hi Quinn, I'm a second-year Professional Accounting student at Macquarie, hoping to move in around the 7th of July. I'm quiet and tidy, don't smoke, and I'm happy to provide references or have a quick call. Thanks for considering my application!" — Geonho Lee

---

## Layout & responsive (BookingShell)
- Page bg `#F8F6F1`; container `max-width:1180px`, padding `28px 24px 72px`.
- Top bar: flex space-between; wordmark "Quni" (Playfair 700, 22px, coral, -0.02em) + breadcrumb (13px `#908897`); right "Landlord · Quinn" (13px `#908897`).
- Grid `bk-grid`: `grid-template-columns: minmax(0,1fr) 372px; gap: 28px; align-items: start;`.
  - Left column: flex column `gap:20px`. First child is the **two-box strip** (`grid-template-columns:1fr 1fr; gap:20px`) holding Box 1 (title/status/tier/reference) and Box 2 (Property). Then the detail sections.
  - Right column `bk-rail`: `position: sticky; top: 24px;` — a single card; it's top-aligned with the two strip boxes and pins on scroll.
- Responsive: `@media (max-width:900px)` → grid is 1 column and the right column becomes static with `order:-1` (summary/action first on mobile). Two-box strip → 1 column at `max-width:560px`. Fit table hides its header row and reflows to 2 columns at `max-width:600px`.

## Interactions & state
- **Review request** — `decision: 'pending' | 'confirmDecline' | 'accepted' | 'declined'`. `pending` shows Accept/Decline; Decline → `confirmDecline`; Confirm → `declined`; Keep → `pending`; Accept → `accepted`. Status pill + action region derive from `decision`. Wire Accept/Decline to the real accept/decline mutations.
- **Booking confirmed** — `bondReceived: boolean`. Drives status pill, deadline box, and primary button. Wire to the "mark bond received" mutation.
- **Both** — AiAssessment Refresh: `aiRefreshing` boolean shows a 2px ring spinner for ~1.2s then updates `aiUpdated`; wire to the AI re-evaluation call.
- **Hover/motion**: coral darkens to `#F2604F`, navy to `#161E33`, red to `#B91C1C`; muted/tertiary tint to `#F8F6F1`; coral primary may use `brightness(0.95)`. ~200ms, ease `cubic-bezier(0.2,0,0,1)`. No scale/bounce.
- **Sticky** stops below 900px (right column moves above the left content).

## Design tokens
Map to the Quni Living design system (`colors_and_type.css`, included). Use the codebase's tokens where present.

**Brand** — coral `#FF6F61`, hover `#F2604F`, active `#CC4A3C`, tints `rgba(255,111,97,.08/.15)`, border `.25`. Cream `#FEF9E4`, cream-border `#E8E0CC`. Navy `#1F2A44`, hover `#161E33`, tint `rgba(31,42,68,.08/.10)`. AI purple `#AA3BFF` (AI only); wash `rgba(170,59,255,.035)`; tint `.10`; borders `.18/.28/.35/.45`.

**Neutral (warm — never cool greys)** — ink `#08060D`, ink-2 `#2A2433`, ink-3 `#4A4253`, ink-4 `#6B6375`, ink-5 `#908897`. Line `#E5E4E7`, line-soft `#EFEDE9`. Surfaces: white `#FFFFFF`, surface-2 `#F8F6F1` (page), surface-3 `#F4F3EC`.

**Semantic (status only)** — success bg `#E6F4EE` fg `#0F6E56`, mid-green `#1D9E75`. Warning bg `#FEF3C7` fg `#92400E`. Info bg `#E0F2FE` fg `#075985`. Danger bg `#FEF2F2` fg `#991B1B`, solid `#DC2626` (hover `#B91C1C`), border `#FECACA`. Neutral pill bg `#F1EEEA` fg `#6B6375`.

**Type** — Inter for all UI/body/headings; Playfair Display for the wordmark only. Sizes: 11px eyebrow (600, uppercase, .04em, `#908897`), 12–13px captions, 14px body, 15px values/lead, 16px property title, 18px section h2 (600), 23px page h1 (700, -0.015em), 22px wordmark. Body line-height 1.5–1.65.

**Radius** — pills 999px; buttons/fields/thumbnail 10px; cards 16px; blockquote/notes/deadline 8–12px.

**Shadow** — shadow-1 (resting card) `0 1px 2px rgba(8,6,13,.05), 0 1px 1px rgba(8,6,13,.03)`; shadow-2 (right summary card) `0 4px 12px rgba(8,6,13,.06), 0 2px 4px rgba(8,6,13,.04)`.

**Spacing** — 4px base; card padding 18–24px; grid gaps 12/16/20/28px; left section stack gap 20px.

**Card spec** — white bg, `1px #E5E4E7` border, radius 16, shadow-1, padding 18–24. Right summary card uses shadow-2. No colored left-border accents except the message blockquote (intentional quote rule) and the AiAssessment purple border.

## Assets
- **Icons**: Lucide outline (1.5–2px) — check-circle, calendar, file-text, graduation-cap, file-check, check. The AI **sparkle** is the one custom icon (purple, AI only). Verified-Student check is a filled 20-viewBox check. Use the app's existing Lucide set.
- **Wordmark**: production uses `quni-logo.png`; prototype renders "Quni" in Playfair as a placeholder.
- **Property primary photo**: real listing photograph, 88×88 rounded cover; comes from listing data. None bundled.

## Files
- `Review request.dc.html` — the pre-acceptance decision page (reference).
- `Booking confirmed.dc.html` — the post-acceptance page (reference).
- `colors_and_type.css` — authoritative Quni Living design tokens.
