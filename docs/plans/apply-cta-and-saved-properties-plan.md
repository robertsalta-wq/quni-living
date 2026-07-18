# Plan — Rename booking CTA to "Apply" + Saved Properties (favourites)

**Goal:** Change renter-facing “Request to book” copy to “Apply” (copy-only), and ship end-to-end Saved Properties (favourites) for renters — including DB, data layer, save controls, guest→auth resume, and a reintroduced dashboard Saved tab.

**Stack:** React + Vite SPA, Supabase Postgres/Auth/RLS, Stripe, DocuSeal.

**Last updated:** 18 Jul 2026 (v2 — post-review amendments)

**Do not code until this plan is approved.** Before implementation, re-search the repo for exact files — do not assume names. Match existing patterns (hooks, Supabase client, components, styling).

---

## Resolved decisions (from review)

| Topic | Decision |
|-------|----------|
| Table name | `public.saved_properties` (not `saved_listings`) |
| FK column | `property_id` → `public.properties(id)` (not `listing_id`) |
| Owner key | `user_id` → `auth.users(id)` with **`default auth.uid()`**; client omits `user_id` on insert |
| Saved dashboard tab | **Reintroduce** — the “coming soon” UI is gone; `?tab=saved` currently redirects to `/student-profile` |
| Pending save storage | `sessionStorage` (mirror messaging), **not** `localStorage` |
| Post-auth return (UX) | Reuse `setPostAuthRedirect` / `quni_post_auth_redirect` from `postAuthRedirect.ts` (return path only) |
| Pending save resume | **Central authenticated-session consumer** — not tied to `PropertyDetail` (see §2d) |
| Toast | No shared toast helper today — use page-local toast or a thin shared helper; do not invent a heavy toast system |
| Deposit step copy | Step 4 H2 is already **“Pay booking deposit”** — only light consistency pass if needed |
| Booking statuses / gating | **Unchanged** — Part 1 is copy only |
| Migration target | Production **Quni-Living-AU** (`cqakltqzqrxnmxfbqatx`) — matches production Vercel `VITE_SUPABASE_URL` |
| Migration apply | Show SQL first; **Rob applies** (prod is agent read-only) |
| Dual-role own listing | Allowed by default; revisit only if it looks odd in testing |

---

## Part 1 — Rename “Request to book” → “Apply”

### Intent

Visible CTA and related helper copy become “Apply”. Route, gating (core profile complete), booking flow, and status/enum values stay as they are.

### Surfaces to update (grep case-insensitively)

Primary (must change):

| File | What |
|------|------|
| `src/pages/PropertyDetail.tsx` | Sidebar CTA + sticky mobile bar (`Request to book` / `Request to book →`) |
| `src/pages/Booking.tsx` | Eyebrow “Request to book”; empty-state helper; consider submit/success wording consistency |
| `src/components/messaging/ConversationThread.tsx` | Tenant “Request to book” link in thread header |
| Gated helpers | e.g. “Complete your profile to … request bookings” → “… to apply” where it refers to this CTA (`PropertyDetail.tsx`, `RenterProfileReadinessDriver.tsx`, related readiness copy) |

Marketing / FAQ / verification (renter-facing; include if acceptance is “no Request to book remains”):

- `src/pages/HowItWorks.tsx`
- `src/pages/Verification.tsx`
- `src/components/verification/verificationChecklistShared.tsx`
- `src/pages/Home.tsx` (FAQ answers)
- `src/lib/faqContent.tsx`

Tests / docs / AI (keep inventory truthful):

- `e2e/booking-apply.spec.ts`
- `docs/feature-inventory.md` (see Docs section)
- `src/lib/aiSurfacePromptAssembly.ts`
- `scripts/knowledgeData.json` (or regenerate via inventory sync script if that’s the workflow)

**Skip unless cleanup desired:** `src/pages/PropertyDetailOriginal.tsx` (dead / not routed).

### Deposit clarity inside booking

- Step labels today: `1. Details` → `2. Rent payment` → `3. Bond info` → `4. Payment`
- Step 4 H2 is already **Pay booking deposit**; line items already say **Booking deposit**
- Optional: align submit button **Submit booking request** / success **Your booking request was sent** with “Apply” language only if product wants consistency — not required for deposit clarity

### Out of scope (Part 1)

- Route `/booking/:propertyId`
- Profile-gate logic (`studentListingActionsOk` / readiness)
- Booking statuses, Stripe deposit behaviour, DocuSeal

---

## Part 2 — Saved Properties (favourites)

### Context (current codebase)

- Renter dashboard nav: Overview \| Bookings \| Messages \| Profile — **no Saved tab**
- `StudentDashboard.tsx`: `?tab=saved` → redirect `/student-profile`
- `UserDashboardSection` type still includes `'saved'`; landlord nav explicitly ignores it
- No favourites table; `supabase/README.md` notes absence of `saved_properties`
- Guest “message landlord” pending intent is the pattern to mirror for **storage keys + post-auth redirect**:
  - `PENDING_MESSAGE_PROPERTY_KEY` = `quni_message_property_id` (`sessionStorage`) in `conversationsApi.ts`
  - `setPostAuthRedirect` → property path
  - Message resume today is PropertyDetail-tied — **favourites must not copy that resume location** (saves from `/listings` cards never hit detail)

### 2a. Database (Supabase migration)

**Target:** production project **Quni-Living-AU** (`cqakltqzqrxnmxfbqatx`).

Create migration (timestamped `YYYYMMDDHHMMSS_saved_properties.sql` style):

```sql
-- Draft — show to Rob before apply; do not agent-push to prod.
-- Target: Quni-Living-AU (cqakltqzqrxnmxfbqatx)

create table if not exists public.saved_properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, property_id)
);

create index if not exists saved_properties_user_created_at_idx
  on public.saved_properties (user_id, created_at desc);

alter table public.saved_properties enable row level security;

-- Policies: own rows only (match style of other user-owned tables)
-- SELECT: auth.uid() = user_id
-- INSERT: WITH CHECK (auth.uid() = user_id)  -- keep even with default auth.uid()
-- DELETE: auth.uid() = user_id
```

Client inserts **omit** `user_id` so the column default applies (and the client cannot set another user’s id before `WITH CHECK` runs). Service-role/admin inserts (if any) must set `user_id` explicitly.

After apply:

- Regenerate / update `src/lib/database.types.ts` (`--project-id cqakltqzqrxnmxfbqatx`)

### 2b. Data layer

Add a lib + hook matching existing patterns (e.g. messaging APIs / dashboard hooks — **not** a new `src/services/` layer):

- `savedPropertyIds` for current user (filled/unfilled heart)
- `toggleSave(propertyId)` — optimistic add/remove with rollback on error
- `listSavedProperties()` — join `properties` with fields needed by `PropertyCard` (reuse `propertyCardSelect` / `Property` shape where possible)
- Unique-constraint conflict → treat as already saved (upsert or ignore)

### 2c. Save button (UI)

Add Save control (heart/star + accessible label toggling “Save property” / “Saved”) to:

1. **`PropertyCard`** on `/listings` and other listing grids
2. **`PropertyDetail`** near the primary CTA

Requirements:

- Optimistic toggle; subtle toast on save/unsave (page-local or thin shared helper)
- Reflect saved state on load
- Nested control must **not** trigger card navigation (`stopPropagation` / `preventDefault`) — card is a full `Link` today
- Works sensibly with `staticDisplay` cards (no accidental nav)
- Product default: available to guests (triggers sign-in) and logged-in renters; landlords browsing need not save unless product later asks for it

### 2d. Guest flow (prompt sign-in, then save)

Mirror messaging for **pending id storage + login entry**, but use a **central resume consumer** for applying the save:

1. Guest taps Save → store pending property id in `sessionStorage` (e.g. `quni_save_property_id`)
2. Optionally `setPostAuthRedirect` to that property’s listing path (**UX return only** — not what triggers the save)
3. Route into existing login / signup / OAuth `/auth/callback` / email-confirm return
4. **Resume via a central authenticated-session consumer** — an app-level effect (auth shell / root layout; exact file TBD at implement time) that, on any authenticated load, checks `sessionStorage` for a pending save id, applies it once, and clears it

Rules for the consumer:

- Do **not** tie resume to `PropertyDetail` — saves initiated from a card on `/listings` will not visit detail
- Treat unique-constraint conflict as success (already saved)
- Clear the pending id only after success or conflict; leave it in place on hard failure so a later authenticated load can retry
- Survives onboarding discarding post-auth redirect (user may land on `/listings`; consumer still runs)

### 2e. Reintroduce dashboard Saved tab

Replace the redirect / missing tab with a real tab:

1. Add **Saved** to renter section nav (`UserDashboardSectionNav` / related)
2. Extend `studentDashboardTabPath` to allow `'saved'`
3. Remove `?tab=saved` → `/student-profile` redirect in `StudentDashboard`
4. Tab content:
   - Grid of saved properties using existing `PropertyCard`
   - Unsave via `toggleSave` (optimistic remove from list)
   - Empty state: “No saved properties yet — tap the heart on a listing to save it” + CTA to `/listings`
   - Loading skeleton consistent with other dashboard tabs

### Out of scope (Part 2)

- Saved searches, alerts, landlord-side favourites
- Soft-delete of saves (hard delete is fine)
- Changing listing card query performance beyond a normal join/select
- Whether a dual-role user (landlord + renter) can save their own listing — **allowed by default**; revisit only if it looks odd in testing

---

## Docs & AI inventory

Update when shipping:

1. **`docs/feature-inventory.md`**
   - Property detail: **Request to book** → **Apply** (still gated until core profile complete)
   - Move **Saved listings - UI only** → **Live** with a short description (save from cards/detail; dashboard Saved tab; guest pending intent)
   - Fix renter dashboard tab list so Saved matches the app
2. **`supabase/README.md`** — remove “no `saved_properties` table”
3. **`src/lib/aiSurfacePromptAssembly.ts`** — stop saying Saved is coming soon
4. Sync knowledge if required (`scripts/syncFeatureInventoryKnowledge.ts` / `scripts/knowledgeData.json`)

---

## Implementation order

1. Write migration SQL → show Rob → apply to **`cqakltqzqrxnmxfbqatx`** → regenerate types
2. Data layer (`saved_properties` API + hook)
3. Save control on `PropertyCard` + `PropertyDetail` + guest pending intent + **central auth-session consumer**
4. Reintroduce dashboard Saved tab
5. Part 1 copy rename (can be parallel or first if product wants Apply live sooner)
6. Docs / AI inventory / e2e assertions
7. Ship app code only after migration is on prod (constraint exists before clients insert)

---

## Acceptance criteria

- No “Request to book” remains in renter-facing UI (CTAs, messaging thread, How it works, verification/FAQ helpers that refer to the action); primary CTA reads **Apply**, still profile-gated, still routes to `/booking/:propertyId`
- Deposit step remains clearly labelled as a deposit taken now (**Pay booking deposit**)
- Logged-in renter can save/unsave from listing card and property detail; state consistent across pages and after refresh
- Logged-out visitor tapping Save (from card **or** detail) goes through existing sign-in; property is saved afterward via the **central consumer** even if onboarding discarded the redirect and the user never opens property detail; Save shows “Saved”; no duplicate rows
- Dashboard **Saved** tab lists saved properties, supports unsaving, empty state + CTA to `/listings`, loading skeleton
- RLS: a user cannot select or delete another user’s `saved_properties` rows; inserts cannot set another user’s `user_id`
- No changes to booking statuses, gating rules, or unrelated flows
- `docs/feature-inventory.md` updated (Apply + Saved → Live); AI inventory rule updated

---

## Deliverables when implementing

1. Show migration SQL before applying — **Rob runs this on `cqakltqzqrxnmxfbqatx` — proceed?**
2. List exact files changed and why
3. Do not agent-apply migrations or `supabase db push` to production
`)