# Section & disclosure pattern — decision doc

**Status:** rule locked (Rob, 14 Jul 2026). Promote PR in flight.
**Purpose:** lock ONE way Quni segments and discloses page content, before the booking re-layout
bakes in a sixth variant.
**Depends on / blocks:** `docs/booking-pages-handoff.md` re-layout waits on §5 steps 1→2 (promote).
**Date:** 14 Jul 2026 (rev. 2 — rule rewrite)

---

## 1. Why this exists

The booking-page restructure (`docs/booking-pages-handoff.md`) was about to introduce a new layout pattern for the
booking pages. Rob stopped it: *"I have identified the different ways the website manages viewing profiles,
bookings and listings. Shouldn't we work out which direction we are locking in first."*

He's right. An audit of the actual surfaces found **five separate section implementations**, two of which are
the same component built twice in two styling systems with opposite state models. Shipping a booking re-layout
on top of that adds a sixth.

---

## 2. What exists today

| Surface | Section container | Disclosure model | Navigation |
|---|---|---|---|
| **Renter profile** `/student-profile` | `ProfileSetupSection` (`src/components/student/profile/ProfileSetupSection.tsx`) — styled by `src/styles/renter-profile.css`, 647 lines of bespoke non-Tailwind CSS | **Uncontrolled.** `useState` lives *inside* each section. `useEffect` force-opens on `todo`, force-closes on `done`. Many sections open at once | `#renter-section-*` hash anchors that **no JS ever reads** — native browser jump only |
| **Landlord profile** `/landlord/dashboard?tab=profile` | `CollapsibleProfileSection` (`src/components/profile/CollapsibleProfileSection.tsx`) — Tailwind `admin-*` tokens, exported from a barrel | **Controlled.** One `expanded` key in the parent. **Single-open accordion**; closing a section reverts to the readiness-derived default | `?section=<key>` → `setExpanded` + `scrollIntoView`. Deep-linked from CTAs across the app |
| **Landlord property form** `/landlord/property/{new,edit/:id}` | `sectionClass()` — a *local function returning JSX*, not a component, not exported (`LandlordPropertyFormPage.tsx:483`) | **None.** All 10 sections permanently open | **Sticky pill bar with `IntersectionObserver` scroll-spy + hash anchors.** The only real section nav in the product. `position: fixed` <768px, `sticky` ≥768px (CSS in `index.css:215-237`) |
| **Property detail** (public) | raw `<section>` + two shared class strings | `CollapsibleProse` — a text-clamp ("Read more") for description and house rules. Not a section primitive | **none.** Headings carry `scroll-mt-below-header` and are anchor-ready, but nothing links to them |
| **Booking pages** | raw cards | none | none |
| **Applicant modal** `LandlordStudentProfileModal` | raw `<section>` cards | none — always expanded; disclosure is conditional rendering | `scrollTo*` props |

**Two readiness drivers** do the same job: `RenterProfileReadinessDriver` (bespoke CSS) and
`ProfileReadinessDriver` (shared, in the barrel, one consumer).

The two profile section components are **visually the same thing** — numbered card, icon chip, status pill,
chevron, collapsed summary line, "Optional ·" divider, sticky readiness driver above. Built twice.

Verified 14 Jul 2026: summary row today only renders when `!expanded && status === 'done' && summary != null`
(`CollapsibleProfileSection.tsx`). That blocks booking Zone 2/3 collapse without a prop change.

### 2.1 Dead code found while auditing (~2,750 lines)

| File | Lines | Why it's dead |
|---|---|---|
| `src/pages/PropertyDetailOriginal.tsx` | 1,009 | Not routed, not imported anywhere in `src` |
| `src/pages/LandlordProfile.tsx` | 1,494 | Orphaned — `/landlord-profile` now renders `LandlordProfileRedirect`. Still listed in `lazyPages.ts` (+ `routeImports.landlordProfile`) |
| `src/components/student/StudentDashboardBookingCard.tsx` | 235 | Not imported. `StudentDashboard.tsx` has a drifted inline copy |

**Bug:** `LandlordPropertyFormPage.tsx:1989` scrolls validation errors to `#section-accommodation`. No element
with that id exists anywhere in `src`. That validation path scrolls nowhere.

Also: `section-lister-role`, `section-authority-to-let` and `section-water-metered-attestation` are `<div id>`,
not `<section>`, so the `section[id^="section-"]` scroll-spy and the nav list can't see them.

---

## 3. The rule (locked)

> **Long scroll-and-read → sticky section nav. Status-bearing sections → collapsible `<Section>`. Neither → plain stack.**

| Pattern | When | Navigation / disclosure |
|---|---|---|
| **Sticky section nav** | Long page the user scrolls and reads (or fills top-to-bottom) with no meaningful collapse summary | Always-open content + sticky pill bar / scroll-spy |
| **Collapsible `<Section>`** | Sections that carry status the user can summarise when collapsed | Controlled collapse; steps-accordion or independent toggles (§3.1) |
| **Plain stack** | Everything else | Raw sections/cards; no chrome |

### 3.1 Surface map

| Surface | Pattern | Why |
|---|---|---|
| **Public listing page** (`PropertyDetail`) | Sticky section nav (**new**) | Airbnb has one. Headings already carry `scroll-mt-below-header`; two already have ids. Reuse the `IntersectionObserver` scroll-spy from `LandlordPropertyFormPage`. Keep `CollapsibleProse` clamps — **do not** collapse amenities or house rules for a renter who's deciding. **Own PR after the promote — do not fold into booking.** |
| **Landlord property form** | Sticky pills (**keep as is**) | No per-section status model → nothing to summarise when collapsed, and collapsing hides validation errors |
| **Booking pages** | Collapsible `<Section>` | Has status (pre/post acceptance) |
| **Profiles** (landlord + renter) | Collapsible `<Section>` | Has status (done/todo/locked) |
| **Applicant modal** | Plain stack (for now) | No status model shared with profiles; disclosure is conditional rendering |

### 3.2 Disclosure policy on `<Section>` (a prop of the parent, not a second component)

| Content type | Policy | Default open | Example |
|---|---|---|---|
| **Steps** — the user must complete them in order | Single-open accordion. Closing reverts to the readiness default | first incomplete section | landlord profile (already does this), renter profile (should) |
| **Reference** — the user reads or acts on them independently | Independent toggles. Many open at once | driven by status | booking (applicant expands pre-acceptance, collapses after) |

The renter profile's **uncontrolled + `useEffect` force-sync** model is the one to drop. It's why saving a
section makes it slam shut under you. Controlled state in the parent, always.

---

## 4. The component

`CollapsibleProfileSection` is already the right shape for status-bearing surfaces. It is controlled, uses
`admin-*` tokens, and — crucially — its collapsed state renders a **summary row with an inline Edit link**.
That is exactly what booking Zone 2 (collapsed applicant) and Zone 3 (agreed terms) need.

**Promote it** out of `src/components/profile/` — it isn't a profile component, it's the section primitive.
Home: `src/components/ui/Section.tsx` (re-export from the profile barrel so landlord profile keeps compiling
during the swap).

### 4.1 Gaps to close (promote PR)

| Gap | Why it matters | Locked API |
|---|---|---|
| No `id` | Scroll-anchor / deep-link | `id: string` (required) — renders `<section id>` + `scroll-mt-below-header` |
| `status` has no `'locked'` | Renter profile Locked state | add `'locked'` |
| `status` is required | Booking history has no status | make `status` **optional** — omit pill when absent |
| `icon` is required | Not every section wants one | make optional |
| Summary row only when `status === 'done'` | Booking collapse isn't "done" | show summary whenever collapsed **and** `summary != null` |
| No `collapsible={false}` | Non-collapsible chrome if a status-bearing surface needs it open | `collapsible?: boolean` (default `true`) — no chevron, no toggle |
| No `tone` | Booking Zone 1 | `tone?: 'default' \| 'warning' \| 'danger'` |

All additive for the landlord-profile consumer (pass through existing wrappers' ids onto `id`).

### 4.2 Also promote (later)

`ProfileReadinessDriver` — reuse for renter profile when #5 lands; delete `RenterProfileReadinessDriver`.
Fix landlord `stickyTop` to use `--quni-fixed-header-offset` in that PR or a tiny follow-up. **Not in the
promote PR.**

---

## 5. Migration order

| # | Surface | Work | Size | When |
|---|---|---|---|---|
| 1 | **Promote `<Section>`** | `src/components/ui/Section.tsx` + §4.1 props + profile barrel re-export | **S** | **now** |
| 2 | **Landlord profile** | Import swap + pass `id` (replace wrapper `<div id>`) | **XS** | **with #1** |
| 3 | **Booking pages** | Four-zone layout on `<Section>` (`booking-pages-handoff.md`) | **L** | after #1–2 |
| 4 | **PropertyDetail sticky nav** | Reuse form scroll-spy; keep `CollapsibleProse`; do **not** collapse amenities/rules | **M** | **own PR after promote** — not booking |
| 5 | **Property form** | Keep sticky pills; optional later polish (`#section-accommodation` fix, `<div id>` → `<section>`) | **M** | separate |
| 6 | **Renter profile rebuild** | Delete `ProfileSetupSection` / nested / renter CSS; controlled `<Section>` | **XL** | **explicitly deferred** |
| 7 | **Dead code** | Delete orphaned files (~2,750 lines) | **XS** | separate PR, anytime |

---

## 6. What this decides for the booking re-layout

- Zone 1 (action) → `<Section tone="warning" collapsible={false}>`
- Zone 2 (who) → `<Section>` — expanded pre-acceptance, collapsed after, summary + `editLabel="View applicant"`
- Zone 3 (terms) → `<Section>` — summary + `editLabel="Edit terms"`
- Zone 4 (history) → `<Section>` — collapsed by default; no status pill

Token sweep (`booking-pages-handoff.md`) remains orthogonal and can land anytime.

**PropertyDetail sticky nav is not part of booking.** Own PR after promote.

---

## 7. Decisions (locked)

| # | Decision | Status |
|---|---|---|
| 1 | Rule in §3 | **Locked** |
| 2 | Promote → `src/components/ui/Section.tsx` | **Locked — building now** |
| 3 | Renter-profile rebuild | **Explicitly deferred** |
| 4 | Dead-code deletion | Own PR, anytime |
| 5 | Property form pill bar | **Keep as is** |
| 6 | PropertyDetail sticky nav | **Own PR after promote** |
| 7 | `docs/section-pattern-decision.md` | **Deleted** — superseded by this file |
