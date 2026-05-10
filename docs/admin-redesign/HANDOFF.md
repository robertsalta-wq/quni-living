# Quni Admin — Cursor Handoff

This package is a **visual + behavioural spec**, not production code. Re-implement
the components properly in the existing TS + Tailwind + Supabase stack; the inline
JSX in this mockup is for design intent only.

> Where this doc references existing tables or routes by name, those names are
> inferred from the UI. **Verify against the live Supabase schema before
> wiring** — placeholder names are flagged with `⚠ verify`.

---

## 1. Routes table

All routes live under `/admin`. The Living Console is the home; six zones are
navigational groupings, **not** pages.

| Path | Component | Title | Notes |
|---|---|---|---|
| `/admin` | `<LivingConsole/>` | The Living Console | Home — always reachable from the always-visible sidebar item. Six zone cards link into the first sub-item of each zone. |
| `/admin/marketplace/bookings` | `<BookingsPage/>` | Bookings | First sub-item of Marketplace zone. Default route when clicking the Marketplace zone card. |
| `/admin/marketplace/tier-events` | `<TierEventsPage/>` | Tier events | Empty state in mockup. |
| `/admin/marketplace/enquiries` | `<EnquiriesPage/>` | Enquiries | Loading state in mockup. |
| `/admin/marketplace/properties` | `<PropertiesPage/>` | Properties | Empty state in mockup. |
| `/admin/tenancies/active` | `<ActiveTenanciesPage/>` | Active tenancies | First sub-item of Tenancies. |
| `/admin/tenancies/condition-reports` | `<ConditionReportsPage/>` | Condition reports | — |
| `/admin/supply/landlords` | `<LandlordsPage/>` | Landlords | First sub-item of Supply. Loading state in mockup. |
| `/admin/supply/leads` | `<LandlordLeadsPage/>` | Landlord leads | — |
| `/admin/money/payments` | `<PaymentsPage/>` | Payments | First sub-item of Money. Error state in mockup. |
| `/admin/money/pricing` | `<PricingPage/>` | Pricing | Full form spec in §3. |
| `/admin/trust/checklist` | `<TrustChecklistPage/>` | Trust checklist | First sub-item of Trust & compliance. |
| `/admin/trust/workflows` | `<StateWorkflowsPage/>` | State workflows | — |
| `/admin/trust/documents` | `<DocumentsPage/>` | Documents | — |
| `/admin/platform/apps` | `<AppsPage/>` | Apps | First sub-item of Platform. |
| `/admin/platform/domains` | `<DomainsPage/>` | Domains | — |
| `/admin/platform/kb` | `<KnowledgeBasePage/>` | Knowledge base | — |
| `/admin/platform/qase` | `<QasePage/>` | Support (Qase) | — |
| `/admin/platform/business-settings` | `<BusinessSettingsPage/>` | Business settings | Was previously under Settings; moved into Platform. |

**Sidebar collapse rule:** only one zone group expanded at a time. The expanded
group is derived from the current route's first path segment after `/admin`
(`marketplace`, `tenancies`, `supply`, `money`, `trust`, `platform`).

---

## 2. Component prop signatures (TypeScript)

Strict. No `any`. All UI primitives go in `src/components/admin/`; page
compositions in `src/pages/admin/`.

### Shell

```ts
// src/components/admin/Shell.tsx
type ZoneId = 'marketplace' | 'tenancies' | 'supply' | 'money' | 'trust' | 'platform';

interface ShellProps {
  children: React.ReactNode;
}

interface SidebarProps {
  // Derived from useLocation(); passed in for testability.
  currentPath: string;
}

interface TopBarProps {
  breadcrumb: { zone: string; page: string };
  env: 'live' | 'preview';
  notificationCount: number;
}
```

### Primitives

```ts
// src/components/admin/primitives/

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: 'primary' | 'secondary' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconRight?: IconName;
}

interface PillProps {
  tone?: 'neutral' | 'coral' | 'navy' | 'success' | 'warning' | 'danger' | 'info' | 'ink';
  dot?: 'critical' | 'action' | 'watch' | 'ok';
  icon?: IconName;
  children: React.ReactNode;
}

interface SparklineProps {
  data: number[];
  color?: 'coral' | 'navy';   // restrict palette; do NOT take hex
  width?: number;             // default 96
  height?: number;            // default 28
  fill?: boolean;             // default true
  dot?: boolean;              // default true
}

interface EyebrowProps {
  children: React.ReactNode;
  tone?: 'default' | 'coral';
}

interface CardProps {
  padding?: number;
  hoverable?: boolean;
  children: React.ReactNode;
}
```

### New patterns to promote

```ts
// src/components/admin/patterns/

interface ZoneCardProps {
  zone: ZoneId;
  title: string;
  eyebrow: string;
  icon: IconName;
  iconTone: 'cream' | 'navy' | 'success';
  spark: number[];
  sparkColor: 'coral' | 'navy';
  rows: Array<{ tone: 'critical' | 'action' | 'watch' | 'ok'; text: string }>;
  // Routes to first sub-item of zone on click.
}

interface AttentionStripProps {
  items: Array<{
    id: string;
    tone: 'critical' | 'action' | 'watch';
    text: string;
    fixHref: string;
  }>;
}

interface MarketplacePulseCellProps {
  label: string;
  value: string;          // pre-formatted; do not format in the component
  unit?: string;
  delta: string;
  deltaTone: 'success' | 'danger' | 'neutral';
  spark: number[];
  sparkColor: 'coral' | 'navy';
  href: string;
  linkLabel: string;
}

interface ChipFilterProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  active?: boolean;
  onChange: (next: T) => void;
}

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  eyebrow: string;        // e.g. "Booking · BK-2843"
  title: string;
  status?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

interface DiffCellProps {
  oldValue: string;
  newValue: string;
}

interface EnvBadgeProps {
  env: 'live' | 'preview';
}
```

### Icons

Single source: a thin wrapper around `lucide-react`. Do **not** import inline
SVGs. Restrict the surface to the set actually used (see `icons.jsx` in the
mockup); export a typed union `IconName`.

```ts
// src/components/admin/Icon.tsx
import * as L from 'lucide-react';

const ICONS = {
  'layout-dashboard': L.LayoutDashboard,
  'calendar-check':   L.CalendarCheck,
  // ...etc
} as const;
export type IconName = keyof typeof ICONS;
```

---

## 3. Per-screen acceptance criteria

### The Living Console (`/admin`)

- [ ] Hero eyebrow `"Live operations · {city}"` reads city from
  `business_settings.city` ⚠ verify table.
- [ ] H1 reads `"The Living Console."` with the word `Living` in italic
  (Playfair Display 700, italic). No other italics on the page.
- [ ] Range toggle has exactly two options: `Today` and `7d`. Default `7d`.
  Toggles the time window for all six zone-card sparklines + Marketplace Pulse.
- [ ] ATTENTION strip aggregates across zones. Counts in the leading label
  (`{n} active · {n} critical, {n} action, {n} watch`) are computed live, not
  hard-coded.
- [ ] Each ATTENTION pill `Fix →` deep-links to the page that resolves it
  (e.g. pending-bookings pill → `/admin/marketplace/bookings?status=pending&overdue=24h`).
- [ ] Each zone card click navigates to the first sub-item of its zone AND
  expands that zone in the sidebar.
- [ ] Marketplace Pulse cells render `tabular-nums`. Numbers right-align if
  a parent grid forces it; otherwise left-align in cell.
- [ ] Sparklines use `coral` only when the underlying metric is a coral-primary
  KPI (revenue, booking volume). Everything else uses `navy`.
- [ ] No empty state for the Living Console — if a zone has zero data, show
  `"All clear"` in place of the rows.

### Bookings (`/admin/marketplace/bookings`)

- [ ] Toolbar: search input (debounce 200ms) + 4 chip filters
  (`Status`, `Tier`, `University`, `Move-in`). All filters compose; URL
  reflects state via search params.
- [ ] Table header is sticky on vertical scroll inside the table container.
- [ ] Row click opens the detail drawer (right rail, 380px, sticky to top bar).
  Selected row gets a 2px coral left border and cream background.
- [ ] Drawer renders booking + trust-checklist + activity timeline + primary
  action (`Approve booking` coral primary) + secondary (`Message` ghost).
- [ ] Pagination: rows-per-page select (12/25/50, default 12), numeric pages,
  prev/next chevrons. Disabled state at boundaries.
- [ ] Zebra striping uses `--quni-surface-2` for odd rows; hover overrides.

### Pricing (`/admin/money/pricing`)

- [ ] Lifecycle pill in the header reflects `pricing_config.lifecycle`
  (`live`, `phase2`, `deferred`) using the matching token colours.
- [ ] Four tabs: `Listing`, `Managed`, `History`, `Change log`. Active tab gets
  a 2px coral bottom border.
- [ ] Sub-text under tab labels (`$99 flat`, `7%`) is derived from the tier's
  current config, not hard-coded.
- [ ] Form layout is `180px label / 1fr field` grid; no exceptions.
- [ ] Live preview card is sticky to the top bar and mirrors **unsaved** form
  state. Show a `Synced` pill when form is pristine, `Unsaved changes` (warning
  tone) when dirty.
- [ ] Change log table renders diff cells: red strikethrough for old, green for
  new. Both monospaced. Author column uses initials avatar + full name.
- [ ] Save flow is optimistic with rollback on error toast.

### Empty / Loading / Error states

- [ ] Every page that loads remote data must implement all three states using
  the canonical components: `<EmptyState/>`, `<LoadingState/>`, `<ErrorState/>`.
- [ ] Empty: 44px Lucide glyph in a 12px-radius square + bold title + secondary
  copy (max 280px) + single primary CTA.
- [ ] Loading: 36px ring spinner using `--quni-coral` over `--quni-coral-tint-15`
  track; `Loading…` + secondary "Fetching live data" subtitle.
- [ ] Error: warning glyph + `Couldn't load this` + retry button (navy
  secondary, not coral — error retries are not the primary action of the page).

---

## 4. Data mapping (mock → Supabase)

> All table names below are **inferred from the UI**. Verify against the live
> Supabase schema before wiring; rename in this doc to match reality.

### Bookings table

| Mock field | Supabase source | Notes |
|---|---|---|
| `booking.id` | `bookings.id` (`BK-{seq}` formatted client-side) | ⚠ verify ID format. |
| `student.name` | `profiles.display_name` via `bookings.student_id` | — |
| `student.uni` | `profiles.university_id` → `universities.short_code` | ⚠ verify FK. |
| `student.initials` | derived from `display_name` | client-side. |
| `student.verified` | `profiles.identity_verified_at IS NOT NULL` | — |
| `student.tier` | `bookings.tier` | enum `T1`/`T2`/`T3`. |
| `property.addr` + `suburb` | `properties.address_line` + `properties.suburb` | — |
| `property.color` | derived hash from `property.id` | mock-only; drop in production and use a real thumbnail. |
| `status` | `bookings.status` | enum `confirmed`/`pending`/`awaiting`/`completed`/`declined`/`cancelled`. |
| `movein` | `bookings.move_in_date` | format dd MMM yyyy, AU locale. |
| `rent` | `properties.weekly_rent` (snapshot at booking time) ⚠ verify | — |
| `enquired` | `enquiries.created_at` via `bookings.enquiry_id` | ⚠ verify FK. |

### Living Console aggregations

| Zone row | Query |
|---|---|
| "4 pending bookings > 24h" | `select count(*) from bookings where status='pending' and created_at < now() - interval '24 hours'` ⚠ verify. |
| "47 active tenancies" | `select count(*) from tenancies where status='active'` ⚠ verify table. |
| "8 landlord leads in pipeline" | `select count(*) from landlord_leads where stage in (...)` ⚠ verify. |
| "$4,820 collected past 7d" | `select sum(amount) from payments where status='succeeded' and created_at >= now() - interval '7 days'` ⚠ verify. |
| "1 Stripe payout failed" | `select count(*) from stripe_payouts where status='failed'` ⚠ verify. |
| "38% Trust checklist complete" | `select avg(completion_pct) from trust_checklists where archived=false` ⚠ verify. |

All Living Console aggregations should be served by **one** edge function
`get-living-console-snapshot(range: 'today' | '7d')` to avoid waterfalls.
Cache for 60s on the edge.

### Pricing

| Mock field | Supabase source |
|---|---|
| Tier name, description, fee model, fee amount, fee floor, rent caps, states, effective dates | `pricing_configs` row per tier ⚠ verify table. |
| Change log | `pricing_config_changes` (immutable, insert-only) ⚠ verify. |

---

## 5. Replace / keep / retire — `src/pages/admin/`

> File names below are **inferred from the previous admin shell**. Map to
> actual filenames before applying.

| Existing file | Action | Replacement |
|---|---|---|
| `AdminLayout.tsx` | **Replace** | New `<Shell/>` with sidebar + top bar. Old layout had no top bar. |
| `AdminSidebar.tsx` | **Replace** | Zone-grouped sidebar with always-visible "The Living Console" item above the six collapsible zones. Single-open behaviour. |
| `AdminDashboard.tsx` / `AdminOverview.tsx` ⚠ verify name | **Replace** | New `<LivingConsole/>` (hero + ATTENTION + 6 zone cards + Marketplace Pulse). |
| `AdminBookings.tsx` | **Replace** | New `<BookingsPage/>` with toolbar + chip filters + sticky-header table + drawer. |
| `AdminPricing.tsx` | **Replace** | New `<PricingPage/>` with tabs + live preview + change log. Keep `pricing_config_changes` insert logic. |
| `AdminTierEvents.tsx` ⚠ verify | **Keep** | Add canonical empty state if missing. |
| `AdminEnquiries.tsx` ⚠ verify | **Keep** | Wire through new shell. Audit loading state to match canonical spinner. |
| `AdminProperties.tsx` ⚠ verify | **Keep** | Same. |
| `AdminLandlords.tsx` ⚠ verify | **Keep** | Same. |
| `AdminLandlordLeads.tsx` ⚠ verify | **Keep** | Same. |
| `AdminPayments.tsx` ⚠ verify | **Keep** | Same. Audit error state to match canonical. |
| `AdminTrustChecklist.tsx` ⚠ verify | **Keep** | Same. |
| `AdminStateWorkflows.tsx` ⚠ verify | **Keep** | Same. |
| `AdminApps.tsx` ⚠ verify | **Keep** | Move under `/admin/platform/apps` URL. |
| `AdminDomains.tsx` ⚠ verify | **Keep** | Move under Platform. |
| `AdminDocuments.tsx` ⚠ verify | **Move** | From Settings → Trust & compliance. URL: `/admin/trust/documents`. |
| `AdminKnowledgeBase.tsx` ⚠ verify | **Move** | Settings → Platform. |
| `AdminQase.tsx` / `AdminQaseSettings.tsx` ⚠ verify | **Consolidate** | Merge into single `<QasePage/>` with a `Settings` tab. The old two-page split is gone. |
| `AdminBusinessSettings.tsx` ⚠ verify | **Move** | Settings → Platform. |
| Any `AdminMissionControl.tsx` ⚠ verify | **Retire** | Renamed to The Living Console. Delete after migration. |
| Any standalone "zone overview" pages (if they exist) | **Retire** | Zones are navigational groupings only; no zone-level pages. |

---

## 6. Tailwind classes for design tokens

Add to `tailwind.config.ts` (or extend existing theme). All values mirror
`colors_and_type.css`.

```ts
// tailwind.config.ts — theme.extend
colors: {
  coral:        '#FF6F61',
  'coral-hover':'#F2604F',
  'coral-active':'#CC4A3C',
  cream:        '#FEF9E4',
  'cream-border':'#E8E0CC',
  navy:         '#1F2A44',
  ink: {
    DEFAULT: '#08060D',
    2: '#2A2433',
    3: '#4A4253',
    4: '#6B6375',
    5: '#908897',
  },
  line: {
    DEFAULT: '#E5E4E7',
    soft:    '#EFEDE9',
  },
  surface: {
    1: '#FFFFFF',
    2: '#F8F6F1',
    3: '#F4F3EC',
  },
},
backgroundColor: {
  'coral-tint':    'rgba(255,111,97,0.08)',
  'coral-tint-15': 'rgba(255,111,97,0.15)',
  'navy-tint':     'rgba(31,42,68,0.08)',
},
fontFamily: {
  display: ['"Playfair Display"', 'Georgia', 'serif'],
  sans:    ['Inter', 'system-ui', 'sans-serif'],
  serif:   ['Lora', 'Georgia', 'serif'],
  mono:    ['ui-monospace', '"SF Mono"', 'monospace'],
},
boxShadow: {
  card:       '0 1px 2px rgba(8,6,13,.05), 0 1px 1px rgba(8,6,13,.03)',
  'card-hover':'0 4px 12px rgba(8,6,13,.06), 0 2px 4px rgba(8,6,13,.04)',
  modal:      '0 16px 32px rgba(8,6,13,.10), 0 4px 8px rgba(8,6,13,.05)',
},
borderRadius: {
  sm: '6px', md: '10px', lg: '16px', pill: '999px',
},
```

### Canonical class strings

| Element | Class string |
|---|---|
| Sidebar item — resting | `flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-ink-3 hover:bg-coral-tint transition-colors` |
| Sidebar item — **active** (current sub-item) | `flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-coral-active bg-coral-tint-15` |
| Sidebar zone header — collapsed | `flex items-center gap-1.5 w-full px-2 py-2 text-[10px] font-bold tracking-[0.08em] uppercase text-ink-5` |
| Sidebar zone header — expanded | same as collapsed; the chevron flips via `rotate-0` ↔ `-rotate-90` |
| The Living Console nav row (always visible, above zones) | `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold text-ink bg-white border border-cream-border` (active variant adds `bg-coral-tint-15 text-coral-active border-coral/30`) |
| Primary CTA | `inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-coral hover:bg-coral-hover text-white text-[13px] font-semibold` |
| Secondary (navy) CTA | `… bg-navy hover:bg-navy/90 text-white …` |
| Ghost CTA | `… bg-white hover:bg-surface-2 text-ink-2 border border-line …` |
| Card | `bg-white border border-line rounded-lg shadow-card` |
| Card — hoverable | add `hover:shadow-card-hover hover:-translate-y-0.5 transition` |
| Eyebrow | `text-[11px] font-bold tracking-[0.08em] uppercase text-ink-5` |
| Tabular numbers | `tabular-nums` (Tailwind built-in) |

---

## 7. Non-goals

Explicit, to stop scope creep:

1. **No dark mode.** Light only. `color-scheme: light only` is set in the
   tokens file; honour it.
2. **No new icon set.** Lucide outline, 1.75 stroke, the subset already used.
   No emoji anywhere in the admin.
3. **No new fonts.** Inter for UI, Playfair Display *only* for the Living
   Console hero, Lora for pricing and editorial moments, Open Sans for footer
   body only (legacy).
4. **No standalone "zone overview" pages.** Zones are sidebar groupings; the
   Living Console is the only true console page.
5. **No marketing-style empty-state illustrations.** Lucide glyph in a tinted
   square; nothing else.
6. **No glassmorphism, gradients, or animated backdrops** in admin
   surfaces. The Living Console's faint aerial backdrop is the **single
   exception** and only on `/admin`.
7. **No AI features in scope.** The `--quni-ai` purple token exists but must
   not be used until an AI surface is briefed.
8. **No client-side number formatting in primitives.** Format values at the
   query/server boundary and pass strings into UI components.
9. **No new global state.** Sidebar expansion is derived from the URL.
   Saved-view state goes in URL search params, not Redux/Zustand.
10. **Mobile is out of scope for this iteration.** The admin assumes
    ≥1024px viewport. Add a "best viewed on desktop" warning under that.

---

## 8. PR sequencing suggestion

To land this without a 50-file mega-PR:

1. **PR 1 — Tokens + Shell.** Tailwind config, `<Shell/>`, `<Sidebar/>`,
   `<TopBar/>`, `<EnvBadge/>`. Mount under existing dashboard route; keep
   old layout reachable behind a feature flag.
2. **PR 2 — Primitives + canonical states.** `<Button/>`, `<Pill/>`,
   `<Card/>`, `<Eyebrow/>`, `<Sparkline/>`, `<EmptyState/>`, `<LoadingState/>`,
   `<ErrorState/>`. No page changes yet; primitives live in Storybook (or
   our equivalent).
3. **PR 3 — The Living Console.** `/admin` replaces old overview. ATTENTION
   + zone cards + Marketplace Pulse + `get-living-console-snapshot` edge fn.
4. **PR 4 — Bookings rebuild.** Toolbar + sticky table + drawer.
5. **PR 5 — Pricing rebuild.** Tabs + live preview + change log.
6. **PR 6 — Sidebar IA migration.** Move pages into the six zones; update
   redirects from old URLs. Retire the old layout flag.
7. **PR 7 — State-of-the-system pass.** Audit every other admin page;
   ensure empty/loading/error use canonical components.

---

End of handoff.
