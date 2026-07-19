# Quni App Chrome — Template System Brief (Header + Action Bar) — LOCKED v4

**Purpose:** End the "four headers / scattered buttons / mobile change breaks desktop" class of bug by replacing per-screen chrome with **two enforced shell components** and **one mode decision**.

**Landlord chrome rule (v4):** a landlord is **always** in either the **dashboard template** (`map` — brand + "Dashboard" + global nav) or the **marketing template** (public `Header`). Landlords never enter Task / `task-header` chrome. Listing edit, booking review, and every other landlord app-shell surface stay on Map so global nav (Listings, etc.) is always available.

**Renter note:** renter apply remains `task-header` on mobile / `map` on desktop until a later pass. Renter dashboards stay `map`.

**The rule everything derives from:** every authenticated surface has one **chrome mode**. The header and the bottom bar are each ONE component that renders per mode, and **both shells always match the declared mode per device — never independently.** Mode values:

| Mode | Header | Bottom bar (mobile) | Used by |
|---|---|---|---|
| `map` | Map header (brand + "Dashboard" + desktop tabs) | **Nav** bar (global tabs) | **All landlord app-shell surfaces**; renter dashboards / messages / profile |
| `task` | Task header (back + title) | **Action** bar (page-scoped) | Reserved — not used for landlords |
| `task-header` *(Phase 1 only)* | Task header (back + title) | **Nav** bar still | Renter apply on mobile only |

Marketing / public / admin pages are outside this system (they keep the marketing `Header`). The app header must *visually match* the marketing brand lockup (same logo asset + size) but is a separate shell.

---

## 1. The two shells

### 1a. `AppHeader` — one component, header modes

**Invariants (identical every mode):** logo = `QuniLogoHomeLink` (always → `/`, `/quni-logo.png` at `h-9 sm:h-10`, no text stand-in); background `var(--brand-header-bg)`; border-bottom `var(--brand-header-border)`; height, safe-area top, sticky/z, focus-ring — all fixed here.

- **Map header:** brand lockup + the **constant "Dashboard" companion label** (never the section name — the active section is shown by the active nav item, not the header) + (desktop) section tabs + account control right.
- **Task header (`task` and `task-header`):** reliable, obvious **back control** (`‹ {destination}`) + task title + optional profile. **Landlords do not use this.**

### 1b. `AppActionBar` — one component, bar modes

**Invariants:** container `bg-white`, border-top `--brand-header-border`, `px-2 pt-2`, safe-area bottom padding. Item `flex-1 min-h-[44px]`, icon **22px** + label **10.5px**, active coral, inactive grey.

- **Nav bar** (`map`, and `task-header` in Phase 1): global nav items (icon+label), active item coral.
- **Action bar** (`task`): page-scoped items — unused for landlords; listing drill-in Cancel/Save live **in-page**.

---

## 2. Coherence

One function: `appChromeMode(pathname, isMobile): 'map' | 'task' | 'task-header' | null`.

- **Landlord:** every app-shell path → `map` (ignore viewport for mode).
- **Renter apply:** mobile `task-header` / desktop `map`.
- **Section dashboards / messages:** `map`.

Both shells read that one value. Viewport = `useIsMobile()` / `src/lib/breakpoints.ts` (`sm` = 640).

**Sticky header:** on `sm+`, stickiness is owned by the `AppShellLayout` chrome wrapper (`sticky top-0 z-50`), not by `overflow-x-clip` on the `<header>` itself.

**Coherence test:** for each surface × breakpoint, header shape and bar match the mode. A `map` surface never renders an Action bar.

---

## 3. Surface × mode matrix (verify every cell)

| Surface | Mode | Header | Bottom bar (mobile) |
|---|---|---|---|
| `/landlord/dashboard` (all tabs) | `map` | Brand + "Dashboard" + tabs (desktop) | Nav: Overview · Listings · Messages · Bookings · Profile |
| `/student-dashboard` | `map` | Brand + "Dashboard" + tabs | Nav: Overview · Bookings · Saved · Messages · Profile |
| `/student-profile`, `/student/profile` | `map` | Brand + "Dashboard" | Nav (renter, Profile active) |
| `/messages` and `/messages/:conversationId` | `map` | Brand + "Dashboard" | Nav (role-appropriate, Messages active) |
| `/landlord/property/edit/:id` (hub) | `map` | Map dashboard | Nav (Listings active). Preview in-page on hub. |
| `/landlord/property/new` (hub) | `map` | Map dashboard | Nav (Listings active) |
| Listing drill-in (`…/basic`, `…/section/:id`) | `map` | Map dashboard | Nav. Cancel · Save (or Draft · Next) **in-page**. |
| `/landlord/bookings/:id/review` | `map` | Map dashboard | Nav (Bookings active). Inline actions unchanged. |
| `/booking/:propertyId` (renter apply) | mobile `task-header` / desktop `map` | Mobile: Back + "Apply". Desktop: Map. | Mobile: Nav retained; inline actions. |
| Marketing / admin / invite / sample-agreements / public property | *(outside)* | Marketing `Header` + lockup → `/` | *(none)* |

**Desktop placement:** bottom bar is mobile-only. On desktop, Map nav lives as header tabs.

**Preview:** navigates to the public listing when active; lives on the hub identity row (not a bottom-bar item under Map chrome).

---

## 4. Tokens — one source

Header colours = `--brand-header-bg` and `--brand-header-border` **everywhere**. No raw hex / no `--quni-cream` direct for chrome.

---

## 5. Locked decisions

1. **"Dashboard" label size:** optically match the *Quni letterforms*, not the 36/40px image box. Low-20s px.
2. **Map companion label:** always **"Dashboard"**, never the section name.
3. **Landlord never leaves Map** while in the app shell — exit via global nav (Listings / Bookings / …).
4. **Listing hub:** Preview is in-page; Health is the hub itself. State-driven action pair (Publish / Pause / etc.) remains a future step — wire as in-page or Map-adjacent controls, not Task chrome.
5. **Action bar styling** (if `task` is used later): no divider; current view + primary = coral; secondary = grey.

---

## 6. Enforcement

- **Lint:** forbid hand-rolled app-shell chrome outside `AppHeader` / `AppActionBar` — `npm run lint:app-chrome`.
- **Structure:** both shells from `AppShellLayout`, driven by `appChromeMode`.
- **Tests:** mode function pins landlord focus paths to `map` at both breakpoints; coherence per §2.

---

## 7. Acceptance

- Landlord app-shell surfaces are always `map` (dashboard template); public/marketing stay marketing `Header`.
- Listing edit shows Map header + global nav; landlord can tap Listings (or any tab) to leave edit without relying on a lying back control.
- Drill-in Cancel/Save (and setup Draft/Next) are in-page.
- Renter apply may still be `task-header` on mobile until converted.
