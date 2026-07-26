# `/home-v2` desk architecture recon

**Date:** 26 July 2026  
**Scope:** read-only. Source of truth: branch `feat/home-v2-desk-shell` (open [PR #206](https://github.com/robertsalta-wq/quni-living/pull/206)). Not on `origin/main` at recon time. Page: `src/pages/HomeV2.tsx`.

---

## Q1 — Manifest vs hardcoded (decisive)

**Hardcoded JSX.** The five desks + signature footer are not defined as a desk-object array the page maps over. `HomeV2` places each desk component in a fixed CSS grid area (desktop) or a fixed vertical stack (mobile).

Desktop placement (named grid areas, not array order):

```134:186:src/pages/HomeV2.tsx
          <div
            className="grid flex-1 items-stretch gap-2.5"
            style={{
              minHeight: 'calc(100dvh - 4.75rem)',
              gridTemplateAreas: `'search search landlord' 'search search landlord' 'uni account trust'`,
              gridTemplateColumns: gridCols,
              gridTemplateRows: gridRows,
              // …
            }}
          >
            <div style={{ gridArea: 'search' }} className="flex min-h-0 flex-col self-stretch">
              <SearchDesk /* … */ />
            </div>
            <div style={{ gridArea: 'landlord' }} className="flex min-h-0 flex-col self-stretch">
              <LandlordDesk /* … */ />
            </div>
            <div style={{ gridArea: 'uni' }} /* … */>
              <UniversitiesDesk /* … */ />
            </div>
            <div style={{ gridArea: 'account' }} /* … */>
              <AccountDesk /* … */ />
            </div>
            <div style={{ gridArea: 'trust' }} /* … */>
              <TrustDesk /* … */ />
            </div>
          </div>

          <PapersBlock compact />
```

Mobile is the same idea: `SearchDesk` first, then a hardcoded stack of the other four, then `PapersBlock` — still no desk manifest.

There is **no** home-page desk config/manifest. Per-desk copy and lists live inside each desk file (or small local constants). `deskIntent` is search-string routing only, not desk layout.

---

## Q2 — Shared frame?

**Partial.** There is a shared slot frame `Desk` (`src/components/desk/Desk.tsx`: nameplate → letterhead → inTray → pen → drawer → paperweight → foot).

| Surface | Uses shared `Desk`? |
|---|---|
| `LandlordDesk` (desktop) | Yes (`tone="navy"`) |
| `SearchDesk` | No — bespoke `<article className="desk-shell …">` |
| `UniversitiesDesk` / `AccountDesk` / `TrustDesk` | No — bespoke `<article>` + `DeskNameplate` |
| Mobile rails | Bespoke collapsed `<article>` headers (including Landlord) |
| `PapersBlock` | Separate signature strip, not a desk |

Slot pieces (`DeskNameplate`, `DeskLetterhead`, `DeskDrawer`, …) are reused; the five home desks are **not** one frame + per-page manifest.

---

## Q3 — Position & size

**CSS grid with explicit `gridTemplateAreas` and named `gridArea`s** on desktop.

- **Grand vs window is positional, not data-driven.** `search` spans two columns / two rows; `landlord` is the tall right column; `uni` / `account` / `trust` share the bottom row as equal cells.
- Column widths reflow only when the landlord drawer opens (`gridCols`: `1fr 1fr 1fr` → `0.7fr 0.7fr 1.85fr`). Row tracks grow when a bottom tray or landlord drawer is open. That is UI expansion, not visitor re-weighting.
- Changing which desk is “grand” or reordering windows requires editing the template-areas string **and** the matching JSX (twice: desktop + mobile). Changing data alone cannot do it today.

---

## Q4 — Visitor-state / pose logic?

**No pose / edition / visitor-state resolution for desk order or weight.** Layout and which desks appear are static for every visitor.

What *does* vary today (copy/data inside fixed slots, not layout):

- **Device:** Tailwind `md:` split — desktop bento vs mobile rails (`hidden md:flex` / `md:hidden`).
- **Auth (Account desk only):** `useAuthContext()` — logged-in greeting + dashboard link vs signed-out signup copy. Desks stay in place.
- **Live listings / uni coverage:** client `useEffect` Supabase fetches into `SearchDesk` / `UniversitiesDesk` props.
- **Landlord fees / ABN:** pricing + legal-entity lookups inside `LandlordDesk` / `PapersBlock`.

No geo, returning-visitor, or pose×device×visitor-state text resolution on the page.

---

## Q5 — Clean seam (for a future rules-based resolve step)

Do **not** build it yet. If added later, the cleanest seam is:

1. **Above** `HomeV2`’s return: a pure function `resolveHomeDeskLayout(visitorState) → ordered desks + size roles` (or a small config module imported by the page).
2. **Replace** the hardcoded gridAreas + five JSX placements with a map from that result into grid areas / spans (and a parallel mobile order).

Today there is no such module; `HomeV2` *is* the layout. `deskShell.ts` only flags chrome/experiment routes (`/home-v2`, `/pricing`) — it does not describe desks.

---

## Q6 — Prerender interaction

**SPA-only for `/home-v2`.** On `feat/home-v2-desk-shell`, `STATIC_PRERENDER_PATHS` is `['/', '/for-universities']` — `/home-v2` is not prerendered. Route is lazy (`Lazy.HomeV2`), registered in `knownRoutes`, always mounted (not gated by `desk_shell_enabled`; that flag only removes header/footer on experiment chrome e.g. `/pricing`). Page ships `noindex`.

**Constraint if desks were reordered per visitor:** a single build-time HTML snapshot cannot encode N visitor layouts. Per-visitor order would need edge/server (or client-only post-hydration) resolution; bots/crawlers would need a canonical default order. Today there is no prerendered desk HTML to invalidate — client reorder would only affect after JS (and would fight a future prerender of `/` or `/home-v2` unless canonical vs personalized are split).

---

## Honest estimate line

**Refactor to data-driven first** — not “sort an array.” Hot-desking requires extracting a desk layout manifest (id, size role, component) and driving grid areas from it; the page is hardcoded JSX with positional grand/window baked into CSS grid.
