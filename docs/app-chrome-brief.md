# Quni App Chrome — Template System Brief — LOCKED v5 (decoupled)

**Purpose:** One header shell and one mobile action bar, decided **independently**. Header state never dictates bar contents.

## The model

### 1. Header — one shell, identical geometry everywhere
- Exactly **one** geometry owner: `ChromeHeaderShell` (marketing Header is the visual reference).
- Same **fixed** height (row `h-11`, not `min-h-11`), colour, border, logo size, logo position, max-width, padding, safe-area for marketing and dashboard. A min-height floor is not “same height.”
- Only **inner content** varies (marketing links vs brand + "Dashboard" + tabs).
- **Landlords** in the app shell: always dashboard-inner. Never a back/title task header.

### 2. Action bar — mobile only, always dynamic
- Desktop: no bottom bar (`appChromeBarContents` → `none`). Desktop Save/Cancel/Preview stay **in-page** (`sm:` visible, `max-sm:hidden`).
- Mobile browse (dashboard, messages, booking review this PR): **nav** items.
- Mobile listing edit (hub + drill-ins): **page-actions** from `useSetAppChromeActions`.
  - Hub: `‹ Listings` (→ `/landlord/dashboard?tab=listings`) · Health · Preview
  - Drill-in: Cancel · Save (setup: Draft · Next). Cancel → hub fixed URL.
- Never stack an in-page action footer under the mobile bar.

### 3. Exit is fixed-URL only
- No `navigate(-1)` / history-first on listings/back paths.
- Hub exit → `?tab=listings`. Drill-in Cancel → hub path. Booking review stays nav this PR (Bookings tab).

### 4. Independent decision functions
```ts
appChromeHeaderInner(pathname, role, isMobile)  // 'dashboard' | 'task' | null
appChromeBarContents(pathname, role, isMobile)  // 'nav' | 'page-actions' | 'none'
```
Do **not** couple them through a single `appChromeMode`.

## Out of scope (deferred)
- Booking review → page-actions conversion
- Renter apply chrome conversion
- Desktop-native action placement (desktop-ideal)

## Enforcement
- Lint: header geometry tokens only in `ChromeHeaderShell`
- Tests: one geometry shell; bar contents by page; exit URLs fixed; no `navigate(-1)` in AppHeader back path
