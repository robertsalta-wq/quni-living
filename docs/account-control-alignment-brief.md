# Account control chrome alignment — LOCKED v1

**Purpose:** Marketing and dashboard signed-in account triggers must read as the **same control**. Dashboard `AppHeader` desktop `AccountMenu` is the visual reference.

**Parent:** Complements `docs/app-chrome-brief.md` (shared shell geometry). Does not change shell geometry, brand companions, or center nav IA.

## Reference (dashboard desktop)

- Trigger button: open layout — **no** outer frame/pill on the button.
- `ACCOUNT_AVATAR_FRAME_CLASS` wraps **avatar only**.
- Name: `text-[13.5px] font-semibold text-[var(--quni-ink)]` (first name).
- Chevron: Lucide `ChevronDown`, `h-3.5 w-3.5`, `text-[var(--quni-ink-4)]`.
- Gap: `gap-2.5` between avatar / name / chevron.

## In scope

1. **Marketing `Header` desktop account trigger** matches the reference structure and shared class tokens (frame scope, name, chevron, gap).
2. **Shared tokens** live next to `ACCOUNT_AVATAR_FRAME_CLASS` so both headers cannot drift on trigger chrome.
3. **Right-cluster weight (light):** marketing signed-in `Messages` / `Dashboard` text links use the same weight as main nav links (`text-sm`, no extra `font-medium`) so they do not compete with the account name.

## Out of scope

- Brand cell: keep `SiteBrandLockup` (logo + AI) on marketing; `DashboardBrandLockup` on dashboard.
- Center nav content / active underline treatment (marketing IA vs app tabs).
- Replacing marketing Messages/Dashboard **links** with a bell (dashboard right-rail job stays different).
- Menu **contents** (marketing may still include Dashboard / Admin / Finish setup; dashboard stays Profile + Sign out).
- Compact/mobile avatar-only triggers (already frame-on-control by necessity).

## Enforcement

- Trigger chrome classes exported from `AccountAvatar.tsx` (or successor shared module).
- Marketing and dashboard desktop triggers consume those exports — no one-off pill wrappers.
