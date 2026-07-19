# Quni App Chrome — Template System Brief (Header + Action Bar) — LOCKED v3

**Purpose:** End the "four headers / scattered buttons / mobile change breaks desktop" class of bug by replacing per-screen chrome with **two enforced shell components** and **one mode decision**. Phase 1 is a structural consolidation, not a redesign — after it the app should look almost the same. The payoff is that the *next* change stops being risky.

**Implement from this document only.** All open questions are locked.

**The rule everything derives from:** every authenticated surface has one **chrome mode**. The header and the bottom bar are each ONE component that renders per mode, and **both shells always match the declared mode per device — never independently.** There are **three** mode values (the third exists because Phase 1 migrates headers before it migrates action bars):

| Mode | Header | Bottom bar (mobile) | Used by |
|---|---|---|---|
| `map` | Map header (brand + "Dashboard" + desktop tabs) | **Nav** bar (global tabs) | Dashboards, messages, profile |
| `task` | Task header (back + title) | **Action** bar (page-scoped) | Listing hub, listing drill-ins |
| `task-header` *(Phase 1 only)* | Task header (back + title) | **Nav** bar still | Booking review, renter apply — until Phase 2 converts them to `task` |

**Coherence = both shells render the shape declared by the mode value, per device.** It does NOT mean "Task always implies an Action bar." A surface may also be one mode on mobile and another on desktop during Phase 1 (desktop-ideal deferred) — that is not a violation; coherence is per device.

Marketing / public / admin pages are outside this system (they keep the marketing `Header`). The app header must *visually match* the marketing brand lockup (same logo asset + size) but is a separate shell.

---

## 1. The two shells

### 1a. `AppHeader` — one component, header modes
Replaces the three branches in `src/components/appShell/AppShellHeader.tsx`.

**Invariants (identical every mode):** logo = `QuniLogoHomeLink` (always → `/`, `/quni-logo.png` at `h-9 sm:h-10`, no text stand-in); background `var(--brand-header-bg)`; border-bottom `var(--brand-header-border)`; height, safe-area top, sticky/z, focus-ring — all fixed here.

- **Map header:** brand lockup + the **constant "Dashboard" companion label** (never the section name — the active section is shown by the active nav item, not the header) + (desktop) section tabs + account control right.
- **Task header (`task` and `task-header`):** reliable, obvious **back control** (`‹ {destination}`) + task title + optional profile. Same logo/bg/border/height.

> In a Task header the back control is the only reliable way out — it must be obvious and always present.

### 1b. `AppActionBar` — one component, bar modes
Generalise `src/components/landlord/LandlordMobileBottomNav.tsx` into a shared shell (renter nav folds in).

**Invariants (copied from the real nav — do not invent):** container `bg-white`, `border-top:1px solid #E8E0CC` (`--brand-header-border`), `px-2 pt-2`, `padding-bottom:max(0.5rem,env(safe-area-inset-bottom))`. Item `flex-1 min-h-[44px]`, icon **22px** + label **10.5px**, active `#FF6F61`, inactive `#6B6375`.

- **Nav bar** (`map`, and `task-header` in Phase 1): global nav items (icon+label), active item coral.
- **Action bar** (`task`): icon+label items, **only the controls the page needs** — no global nav, **no reserved/blank/ghost slots**. Current view + primary = coral; secondary = grey; **no divider**. Items passed as props.

---

## 2. Coherence

One function decides mode — extend `src/lib/appShell.ts` to expose `appChromeMode(pathname, isMobile): 'map' | 'task' | 'task-header' | null`. **It is viewport-aware:** where Phase 1 Option A applies, the same path resolves to different modes by device — e.g. listing edit is `task` on mobile but Map-looking on desktop (treat as `map` header shape, no bottom bar) until the desktop pass. Do **not** hard-code pathname→mode ignoring `isMobile`. Both shells read that one value; each renders the shape the table declares. Viewport = single `useIsMobile()` / `src/lib/breakpoints.ts` (`sm` = 640). No scattered `sm:` logic.

**Coherence test** asserts: for each surface, at each breakpoint, the header shape and the bar contents are exactly those the surface's mode value declares. Desync (e.g. a `task` surface rendering a Nav bar) → CI red. `task-header` surfaces are expected to show a Task header + Nav bar — that is a *pass*, not a failure.

---

## 3. Surface × mode matrix (verify every cell)

| Surface | Mode | Header | Bottom bar (mobile) |
|---|---|---|---|
| `/landlord/dashboard` (all tabs) | `map` | Brand + "Dashboard" + tabs (desktop) | Nav: Overview · Listings · Messages · Bookings · Profile |
| `/student-dashboard` | `map` | Brand + "Dashboard" + tabs | Nav: Overview · Bookings · Saved · Messages · Profile |
| `/student-profile`, `/student/profile` | `map` | Brand + "Dashboard" | Nav (renter, Profile active) |
| `/messages` and `/messages/:conversationId` | `map` | Brand + "Dashboard" | Nav (Messages active) |
| `/landlord/property/edit/:id` (mobile hub) | `task` | Back "‹ Listings" + **"Edit listing"** | **Phase 1:** Health · Preview. **Step 4:** + state-driven pair (§5.3). No no-op Save; exit via header back. |
| `/landlord/property/new` (mobile hub) | `task` | Back "‹ Listings" + **"New listing"** | as above |
| Listing drill-in — **edit** (`…/basic`, `…/section/:id`) | `task` | Back + section title | Action: Cancel · Save |
| Listing drill-in — **setup** (new listing) | `task` | Back + section title | Action: Save draft ("Draft") · Save & next ("Next") |
| `/landlord/bookings/:id/review` | `task-header` (P1) | Back + "Booking review" | Nav bar retained; inline actions unchanged. → `task` in Phase 2 |
| `/booking/:propertyId` (renter apply) | `task-header` (P1) | Back + "Apply" | Nav bar retained; inline actions unchanged. → `task` in Phase 2 |
| Marketing / admin / invite / sample-agreements / public property Apply bar | *(outside)* | Marketing `Header` + lockup → `/` | *(none)* |

**Desktop placement (scope):** the bottom bar is a **mobile** construct. On desktop, `map` nav lives as header tabs (existing `landlordDesktopChrome`); `task` actions keep their **current** desktop placement this pass. Do **not** put a bottom bar on wide desktop now — deferred (§7).

**Preview:** the hub's Preview item **navigates to the public listing** (when active) — it is not a third in-hub view/route. Health is the hub itself; Insights (future) is an in-hub panel; Preview leaves to the public page. Keep it a bar item; don't build it as an in-hub route.

**Page-scoped items:** example labels are illustrative — Cursor derives each `task` page's set from that page's existing controls. Exceptions specified: the drill-in sets and the hub (§5.3).

---

## 4. Tokens — one source

Header colours = `--brand-header-bg` (#FEF9E4) and `--brand-header-border` (#E8E0CC) **everywhere**. Today `--brand-header-bg` is defined twice (hardcoded in `index.css`; aliased to `--quni-cream` in `quni-design-tokens.css`) and the hub uses `--quni-cream` directly — **collapse to one definition, one token name.** No raw hex / no `--quni-cream` direct for chrome. **Fix:** the mobile app-shell header is `bg-white` today while everything else is cream — routing through `AppHeader` makes all headers cream automatically.

---

## 5. Locked decisions

1. **"Dashboard" label size:** optically match the *Quni letterforms*, not the 36/40px image box. Low-20s px.
2. **Map companion label:** always the constant word **"Dashboard"**, never the section name. (Minor visible change on mobile, where section titles show today — accepted for consistency with desktop.)
3. **Action bar styling:** no divider; current view + primary = coral; secondary = grey.
4. **Listing hub action bar — LOCKED (thinner fallback for Phase 1; state-driven pair as step 4):**
   - **Views in the bar:** Health · Preview only. **Insights** is a coming-soon stub — leave it out of the bar until it does real work (a dead item breaks the "your options live in the action bar" promise). It becomes the third view when it ships.
   - **No no-op Save, no "Done"** (duplicates the header back). Exit via header back.
   - **State-driven pair (§7 step 4):** the two slots surface *existing* Listings-tab actions (`LandlordPropertyListingActions`) — reuse those handlers, invent no hub-only behaviour. Gate by state:

     | Listing state | Action slots |
     |---|---|
     | Draft / setup | **Next** (→ first incomplete section) · **Discard** |
     | Draft, publishable | **Publish** · **Discard** |
     | Active | **Share** · **Pause** |
     | Paused / inactive | **Share** · **Reactivate** |

   - Full bar once Insights ships + pair wired = 5 (e.g. Active: Health · Insights · Preview · Share · Pause).
   - **Flip option:** folding the pair into Phase 1 (one fewer PR) is acceptable; default keeps it in step 4 to keep Phase 1 purely structural.

---

## 6. Enforcement

- **Lint (app chrome only):** forbid hand-rolled **app-shell chrome** outside `AppHeader` / `AppActionBar` — i.e. no cream/`#E8E0CC` header bars and no global-nav/action bottom bars declared anywhere else, and no raw hex for chrome colours. **Do NOT** ban legitimate in-page `<header>`/title elements (e.g. `ConversationHeader`, the in-hub section title) — the rule targets *chrome*, identified by the chrome tokens/placement, not every `<header>`. **Enforced by** `npm run lint:app-chrome` (`scripts/check-app-chrome.mjs`) — blocking CI step; marketing `Header.tsx` is allowlisted.
- **Structure:** render both shells once from `AppShellLayout`, driven by `appChromeMode`; pages never render their own chrome.
- **Tests (takes Rob out of the manual-diff loop):** mode function returns the correct value per surface; header — each surface at `<640` and `≥640` shows the declared header shape, logo → `/` everywhere; bar — each surface shows the declared bar (dashboard = 5 nav; hub = Health · Preview in Phase 1; edit drill-in = Cancel/Save; setup drill-in = Draft/Next; booking/apply = Nav bar); **coherence test** per §2.

---

## 7. Order of work (low-risk first)

1. **Build the shells + `appChromeMode` + tokens + `useIsMobile` wiring.** No visual change intended.
2. **Migrate every authenticated surface onto the shells** via its mode value, preserving appearance — fixing only known inconsistencies (white mobile header → token, logo size, duplicate token, Map label → "Dashboard"). Booking-review & apply migrate as `task-header` (Task header, Nav bar + inline actions retained). *Note: moving the renter dashboard off marketing `Header` onto `AppHeader` may be slightly visible — in scope as shell migration.* Ship + verify.
3. **Configure the listing hub `task` action bar:** drop the top tab row and the no-op Save; bar = Health · Preview (Insights deferred); exit via header back. Shell config only.
4. **Wire the state-driven hub action pair** reusing `LandlordPropertyListingActions` handlers, gated by state (§5.4). The one intentional product change. *(Fold into step 3 if you took the flip option.)*
5. **Add tests + lint guard.**
6. *(Future, separate)* the **desktop-ideal**: desktop-native placement for Map nav and Task actions.
7. *(Future, separate — Phase 2)* convert **booking review** and **renter apply** from `task-header` to `task` (actions into the bar, nav hidden) — a deliberate per-page product change.

## 8. Out of scope (this brief)
Desktop layout / desktop action placement (§7.6); booking/apply action-bar conversion (§7.7); booking/apply content redesign; marketing changes beyond header-lockup parity; new product features.

## 9. Acceptance

**Phase 1 complete when:**
- All 4+ headers gone → one `AppHeader`, one `AppActionBar`; every authenticated surface routed through them via `appChromeMode` (`map` / `task` / `task-header`), header & bar matching the declared mode per device.
- All chrome colours tokenised; mobile header cream, not white; Map header shows "Dashboard".
- Listing hub bar = Health · Preview (no dup Preview, no no-op Save). Booking review & apply = `task-header` (Task header, Nav bar + inline actions retained).
- Tests pin every surface at both breakpoints + coherence per §2; lint blocks new inline app-chrome; a one-viewport change cannot silently alter the other without a test failing.

**Step 4 complete when:** the hub's state-driven action pair is wired per the §5.4 table, reusing `LandlordPropertyListingActions` handlers.

**Phase 2 (future):** booking review & apply are `task` (actions in the bar, nav hidden).
