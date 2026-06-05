# Quni Listing go-live - concrete plan

**Scope:** Listing-only launch on production. Managed stays in the codebase - **teased in marketing, not bookable** until flags are flipped later.

**Status:** Pre-launch checklist - Phases 1, 1.25, 1.5 code shipped; Phase 2 flags live on production; **0 properties** (clean slate); **3 real listings later today**  
**Last updated:** 25 May 2026

**Go-live is postponed until every item in [Pre-go-live - nothing ships until…](#pre-go-live--nothing-ships-until) is checked.**

---

## Pre-go-live - nothing ships until…

**Definition of go-live:** Real strangers can discover listings, book, pay real money, and sign a lease on production. No public traffic or real bookings until **every box below** is done. Postponing launch is correct if anything is incomplete.

### Build & database

- [x] **Phase 1 code** deployed - Managed teased in UI, not selectable/bookable (**G4**)
- [x] **Phase 2 Supabase** complete - migrations applied (`db push` up to date); `module_enabled=true`; `managed_enabled=false`; `public_platform_features` live (`managed_tier_enabled=false`, `listing_module_enabled=true`)
- [ ] **Listing inventory** finalized - clean slate done (**0 properties**); **later today:** 3 verified real listings (Casa Malvina + 2); landlords verified in admin
- [x] **Phase 1.25** - `platform_staff` + `is_platform_admin()` + **Admin → Team** (`hello@quni.com.au`, `quinn@4logistics.com.au` seeded)
- [x] **Phase 1.5** - per-state × tier Managed matrix in **Admin → State workflows**

### Prove it works

- [x] **G1** - `npx tsc -b --noEmit` and `npm test` green (verified 25 May 2026 on `main`)
- [ ] **G2** - full test-mode E2E on production: signup → book → accept → test $99 → bond → DocuSeal → `confirmed`
- [ ] **G5** - bank + legal entity non-empty in **Admin → Business settings** (lease PDFs)
- [ ] **Stripe live** - live keys, live Listing product ID, live webhook on production domain
- [x] **Vercel env (test mode)** - Phase 3A + Phase 5 production audit complete (25 May 2026); Stripe test keys; live flip pending Phase 4
- [ ] **Vercel env (live mode)** - Phase 5 “Must change for live flip” + redeploy after Phase 4
- [x] **Resend** - `quni.com.au` verified in Resend; transactional email delivered on production (25 May 2026)
- [x] **DocuSeal (infra)** - `sign.quni.com.au` healthy; webhook `https://quni-living.vercel.app/api/webhooks/docuseal` (25 May 2026)
- [ ] **DocuSeal (E2E signing)** - full Listing signing on a booking completes in production (**G2**)
- [ ] **G3** - live smoke test: one real $99 charge, full flow, then refund

### Domain (minimum)

- [x] **Domain decision made** - **Primary:** `https://quni.com.au` (registered). **Secondary:** `quniliving.com.au` → 301 redirect to primary (avoid two canonical origins). **Staging / pre-DNS:** keep using `quni-living.vercel.app` for G2 if DNS not wired yet; flip env + webhooks when `quni.com.au` is on Vercel.

### Explicitly deferrable (not blockers for first go-live)

| Item | When |
|------|------|
| DNS cutover to `quni.com.au` | After G3 on Option A |
| Managed tier actually bookable | ~1 month; global + state toggles |
| 5–10 live listings | 3 real verified listings is enough for cold start |

### Suggested sequence

```text
Monday      Clean wipe (properties + test users) + finish Phase 2 + create 3 listings
Week 1      Phase 1.25 (platform_staff / Admin → Team) + Phase 1.5 + G2 test E2E
Week 1–2    Stripe live + env audit + Resend/DocuSeal + G5
Week 2      G3 live smoke test
→ GO LIVE   (only after all checkboxes above)
```

**Rough progress (25 May 2026):** ~50% of this list complete (Phases 1–2 + 1.25 + 1.5 + G1 + clean inventory DB + Vercel test env audit). Blockers for G2/G3: inventory + test E2E run.

---

## Current status (snapshot)

| Item | Status |
|------|--------|
| Phase 1 code (Managed gated + teased in UI) | **Done** - on `main` |
| `quni_service_tier_module_enabled` | **Done** - `true` on production |
| `quni_service_tier_managed_enabled` + `public_platform_features` | **Done** - `false` / view returns `managed_tier_enabled=false`, `listing_module_enabled=true` |
| Migrations (`20260523120000` … `20260526160000`) | **Done** - `npx supabase db push --linked` → up to date |
| Properties | **0 rows** - clean slate; backfill N/A until listings exist |
| Listing inventory (3 real) | **Later today** - create via landlord dashboard after go-live prep |
| Platform staff / Admin → Team (Phase 1.25) | **Done** |
| Per-state Managed admin toggles (Phase 1.5) | **Done** - `service_tier_state_matrix` + Admin UI |
| G1 typecheck + tests | **Done** (25 May 2026) |
| G5 bank + legal entity | **Mostly done** - primary `bank.*` + core `business.*` set; optional trading/contact fields empty |
| Vercel env (test) - Phase 3A + 5 audit | **Done** (25 May 2026) - `env:pull:production`; site URLs + `STRIPE_LISTING_PRODUCT_ID` added |
| Supabase Edge secrets (Phase 6) | **Done** (25 May 2026) - `RESEND_API_KEY`, `DELETE_USER_DOCS_WEBHOOK_SECRET`; Stripe webhooks Vercel-only |
| Resend + DocuSeal spot-check (Phase 7) | **Done** (25 May 2026) - DNS verified; test send OK; DocuSeal login + webhook on Vercel URL |
| Test-mode E2E (Phase 3 / G2) | **Next** - needs ≥1 active listing (use E2E flow or today’s 3) |
| Stripe live flip (Phase 4) | **Not started** - after G2 |

---

## Domain decision (resolved 25 May 2026)

| Domain | Role |
|--------|------|
| **`quni.com.au`** | **Canonical production** - leases, emails (`noreply@`, `hello@`), `sign.quni.com.au`, marketing copy, About page, Stripe/DocuSeal webhooks after cutover |
| **`quniliving.com.au`** | **Redirect only** (301 → `quni.com.au`) - matches social handles (`@quniliving`); do not use as a second `VITE_SITE_URL` |
| **`quni-living.vercel.app`** | Vercel default; optional redirect to `quni.com.au` after cutover |

**Pragmatic launch path:** Run **G2** on whichever origin is live today (Vercel URL is fine). Before **G3 / public go-live**, attach `quni.com.au` in Vercel, set production env (`VITE_SITE_URL`, `SITE_URL`, `PUBLIC_SITE_URL`), update `public/robots.txt` sitemap line, redeploy, then point Stripe live webhook + DocuSeal webhook at `https://quni.com.au/...`.

---

## Go / no-go gates

Do not proceed to the next phase until the gate passes.

| Gate | Criteria |
|------|----------|
| **G1** | `npx tsc -b --noEmit` and `npm test` green |
| **G2** | Test-mode Listing E2E completes (accept → $99 test charge → bond → sign) |
| **G3** | Live Stripe keys deployed; one real $99 charge + refund verified |
| **G4** | Managed not bookable on pricing, property form, booking accept (teased “coming soon” in marketing is OK) |
| **G5** | Bank details in Admin → Business Settings (lease PDFs need them) |

---

## Phase 0 - Decisions (15 min)

- [x] Launch domain: **`quni.com.au` primary**; `quniliving.com.au` redirect; Vercel URL OK for test E2E until DNS attached
- [ ] Seed geography: confirm all seed listings are **NSW T2 private room** (Listing is available; Managed already geo-gated for NSW T2)
- [ ] One real card for live smoke test (refund after)
- [x] DocuSeal Railway instance healthy at `https://sign.quni.com.au` (25 May 2026)
- [ ] **Listing inventory policy decided** (see below) - which rows stay `active` vs `inactive`

---

## Listing inventory - keep, upgrade, or remove?

**Yes, this belongs in the plan.** There is no `is_seed` or `is_demo` column on `properties`. Anything with `status = 'active'` appears on the homepage, sitemap, and can be booked end-to-end. Seed and demo rows are indistinguishable from real listings to renters.

### Recommendation

| Category | Action | Why |
|----------|--------|-----|
| **Real listings** (e.g. Casa Malvina, any property you can actually let) | **Keep live** | Cold-start supply + trust checklist target (5–10 verified listings) |
| **`seedProperties.ts` rows** (15 Unsplash listings, hardcoded landlord IDs) | **Upgrade or deactivate** - do not leave as-is unless every row passes the bar below | Generic stock photos + test landlords = booking/legal risk if a renter pays deposit |
| **`seed_demo_listings.sql` rows** (`slug` like `demo-%`) | **Deactivate before public traffic** | Explicitly documented as demo-only in `supabase/seed_demo_listings.sql` |

**Default rule for go-live:** only listings where a **verified landlord** can **honor a real tenancy** (accept, sign, receive bond) stay `active`. Everything else → `inactive` until upgraded.

### “Keep live” bar (all must pass)

- [ ] `status = 'active'`
- [ ] `service_tier = 'listing'` (after Phase 2 backfill)
- [ ] Landlord profile **verified** (`landlord_profiles.verified = true`)
- [ ] Real address and photos (replace Unsplash-only images where possible)
- [ ] Accurate `available_from` / `available_to` dates
- [ ] Landlord has saved card for Listing billing (live Stripe after Phase 4)
- [ ] You would be comfortable if a stranger booked it tomorrow

### Inventory audit (run before Phase 3 smoke test)

```sql
-- All active listings with landlord verification and tier
SELECT
  p.id,
  p.slug,
  p.title,
  p.suburb,
  p.status,
  p.service_tier,
  lp.full_name AS landlord,
  lp.verified AS landlord_verified,
  (p.images[1] LIKE '%unsplash%') AS likely_stock_photo
FROM public.properties p
JOIN public.landlord_profiles lp ON lp.id = p.landlord_id
WHERE p.status = 'active'
ORDER BY p.slug;
```

**Deactivate demo / unready rows:**

```sql
-- Demo slugs only (safe, idempotent)
UPDATE public.properties
SET status = 'inactive'
WHERE slug LIKE 'demo-%'
  AND status = 'active';
```

For other seed rows, deactivate individually after reviewing the audit - do not bulk-delete unless you are sure no real listing shares those slugs.

**Target at launch:** 5–10 **verified, real** listings (Trust checklist Phase 1 #11 + Phase 3). Casa Malvina as listing #1; fill remaining slots with genuine supply or upgraded seeds that meet the bar above - not raw demo data.

### What not to do

- Do **not** delete seed rows from the DB unless you are cleaning up a dev environment; use `status = 'inactive'` so history and admin references stay intact.
- Do **not** leave `demo-*` listings active while taking live payments - a completed booking on a fake address is a support and reputational incident.
- Do **not** count inactive or unverified listings toward “5–10 live” in the trust checklist.

---

## Phase 1 - Code (2–3 hours)

Ship these before any Supabase/Stripe production changes.

### 1A. New platform config flag

**Key:** `quni_service_tier_managed_enabled`  
**Launch value:** `false`

**Files to touch:**

| File | Change |
|------|--------|
| `api/lib/platformConfig.ts` | Add `QUNI_SERVICE_TIER_MANAGED_ENABLED: 'quni_service_tier_managed_enabled'` |
| `api/lib/serviceTier/index.ts` | Accept optional `managedGloballyEnabled`; if false, force `managed: 'gated'` |
| `api/lib/booking/serviceTierSnapshot.js` | Mirror the same gate (keep in sync with TS) |
| New hook/helper `src/lib/platformFeatureFlags.ts` (or extend existing) | Client fetch of `quni_service_tier_managed_enabled` from `platform_config` (public read if RLS allows, or small API route) |

**Resolver rule when flag is `false`:**

```text
managed → always 'gated' (all states)
listing → unchanged (geo matrix still applies)
```

### 1B. UI - hide Managed when flag is off

| File | Change |
|------|--------|
| `src/pages/Pricing.tsx` | Managed column → “Coming soon” overlay; disable `Choose Managed` CTA |
| `src/pages/landlord/LandlordPropertyFormPage.tsx` | Hide Managed tier radio; default `serviceTier` to `'listing'` |
| `src/pages/Home.tsx` | Landlord FAQ + hero copy → Listing-only; step 3 “Get paid” → self-managed tenancy (not Connect) |
| `src/pages/HowItWorks.tsx` | Hide Managed column or collapse to “Coming soon” |
| `src/components/Footer.tsx` | Remove dual-tier copy if any |
| `src/lib/landlordAcceptTierOptions.ts` | `showManaged = false` when flag off |
| `src/pages/onboarding/LandlordOnboarding.tsx` | Default `intendedTier` to `'listing'` when unset; hide Managed `<details>` when flag off |

### 1C. Property form defaults

In `LandlordPropertyFormPage.tsx`, change all `'managed'` defaults to `'listing'`:

- Initial state (~line 289)
- Draft restore fallback (~line 190)
- Reset handlers (~lines 551, 635)

### 1D. Onboarding step-3 fix (Listing landlords)

**Problem:** `inferLandlordWizardStep()` treats step 3 complete only when `stripe_charges_enabled === true` (Connect). Listing landlords with a saved card get stuck on reload.

**Fix in `src/lib/landlordOnboarding.ts`:**

- Add `landlordListingCardStepComplete(profile)` → `stripe_customer_id` is set (optionally verify default PM via existing billing API on resume)
- Update `inferLandlordWizardStep(p, intendedTier?)`:
  - If `intendedTier === 'listing'`: step 3 complete when card saved **or** Connect complete **or** explicitly skipped
  - Else: keep Connect gate

### 1E. Stripe listing product ID → env var

In `api/lib/booking/confirmListing.ts`:

```typescript
const LISTING_PRODUCT_ID = process.env.STRIPE_LISTING_PRODUCT_ID?.trim() || 'prod_...'
```

Add to `.env.example` and Vercel production.

### 1F. Typecheck + tests

```bash
npx tsc -b --noEmit
npm test
```

**Gate G1** must pass before Phase 2.

---

## Phase 1.25 - Platform staff / Admin → Team (~1 session)

Port the **Unstash** pattern: admins stay in `auth.users`; platform access is tracked in **`platform_staff`**, not hardcoded email lists in code.

**Why before go-live:** You need to add/remove staff (e.g. `quinn@4logistics.com.au`) without editing four files and redeploying. RLS, app, API, and Edge must share one source of truth.

### 1.25A. Database migration

Create `public.platform_staff` (mirror Unstash):

| Column | Purpose |
|--------|---------|
| `email` | Unique; matched to JWT email in `is_platform_admin()` |
| `role` | `admin` \| `support` \| `moderator` (v1: all grant full admin) |
| `notes`, `created_by`, timestamps | Audit |

- Seed `hello@quni.com.au` so bootstrap admin is never locked out
- Replace hardcoded `IN ('hello@quni.com.au')` in `is_platform_admin()` with `EXISTS (SELECT 1 FROM platform_staff WHERE lower(trim(email)) = …)`
- Update storage policy on `student-documents` if it still hardcodes admin emails
- RLS: only platform admins can `SELECT`/`INSERT`/`UPDATE`/`DELETE` on `platform_staff`; block deleting the last admin row

### 1.25B. App + API + Edge

| File / area | Change |
|-------------|--------|
| `src/lib/adminEmails.ts` | Replace allowlist with RPC `is_platform_admin` (or async fetch on session load) |
| `src/lib/authProfile.ts` | Admin role from RPC, not email constant |
| `api/lib/adminAuth.js` | Same DB check (service role query or RPC) |
| `supabase/functions/_shared/adminEmails.ts` | Remove duplicate allowlist; use RPC |
| `AuthContext` | Cache admin flag after login |

Remove all hardcoded `ADMIN_EMAILS` once RPC is wired.

### 1.25C. Admin UI - **Admin → Team**

- List current `platform_staff` rows
- Add staff by email (user may sign up later; email match on login)
- Optional: deactivate / remove (with last-admin guard)
- Route: `/admin/team` (or under Settings)

### 1.25D. Verify

- [ ] `hello@quni.com.au` can access `/admin` after migration
- [ ] Add second email via Team UI → that user gets `/admin` after login (no deploy)
- [ ] Non-staff user cannot access `/admin` or mutate `platform_staff`
- [ ] `npm test` + `tsc` green

**Gate:** complete before G2 if multiple people will run E2E or verify landlords.

---

## Phase 2 - Supabase (30 min)

Run in **Supabase → SQL Editor** (production project).

### 2A. Platform config

```sql
-- Enable Listing booking module (REQUIRED - default is false)
INSERT INTO public.platform_config (config_key, config_value, label, category, is_sensitive, sort_order)
VALUES ('quni_service_tier_module_enabled', 'true', 'Enable service tier booking module', 'compliance', false, 910)
ON CONFLICT (config_key) DO UPDATE SET config_value = 'true';

-- Disable Managed globally for launch
INSERT INTO public.platform_config (config_key, config_value, label, category, is_sensitive, sort_order)
VALUES ('quni_service_tier_managed_enabled', 'false', 'Enable Quni Managed tier platform-wide', 'compliance', false, 911)
ON CONFLICT (config_key) DO UPDATE SET config_value = 'false';
```

> **Do not** set `quni_service_tier_module_enabled = false`. That blocks Listing confirms with `listing_module_disabled`.

### 2B. Backfill seed properties

```sql
UPDATE public.properties
SET service_tier = 'listing'
WHERE service_tier IS DISTINCT FROM 'listing';
```

Verify:

```sql
SELECT service_tier, count(*) FROM public.properties GROUP BY 1;
-- Expect: all 'listing'
```

### 2C. Verify business config

```sql
SELECT config_key, config_value
FROM public.platform_config
WHERE config_key IN (
  'business.legal_name',
  'business.trading_name',
  'business.abn',
  'business.acn',
  'business.director_name',
  'bank.account_name',
  'bank.bsb',
  'bank.account_number',
  'bank.bank_name',
  'contact.email'
)
ORDER BY config_key;
```

**Gate G5:** bank.* rows must be non-empty before lease generation.

### 2D. RLS spot-check (manual)

| Actor | Action | Expected |
|-------|--------|----------|
| Student | SELECT own booking | Allowed |
| Landlord | SELECT/update own booking (confirm, bond) | Allowed |
| Student | INSERT into `service_tier_events` | Denied |
| Admin | SELECT `service_tier_events` | Allowed |
| Service role (API) | INSERT `service_tier_events` | Allowed |

---

## Phase 3 - Deploy code + test mode E2E (1–2 hours)

Deploy Phase 1 code to production **while Stripe is still in test mode**.

### 3A. Pre-flight on production (test keys)

- [x] Vercel production env verified (25 May 2026) - names in `.env.vercel` after `npm run env:pull:production`
- [x] `INTERNAL_DOC_FLOW_SECRET` - set (lease gen skips without it)
- [x] `CRON_SECRET` - set (booking expiry crons)
- [x] `DOCUSEAL_API_URL`, `DOCUSEAL_API_TOKEN`
- [x] `RESEND_API_KEY`
- [x] `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_test_...`
- [x] `STRIPE_SECRET_KEY` = `sk_test_...` (Sensitive; Production + Preview)
- [x] `STRIPE_WEBHOOK_SECRET` = test webhook `whsec_...` (Sensitive; Production + Preview)
- [x] `STRIPE_LISTING_PRODUCT_ID` - test product `prod_...`
- [x] `VITE_SITE_URL`, `SITE_URL`, `PUBLIC_SITE_URL` - set (pre–`quni.com.au` cutover values)

### 3B. Test-mode smoke script

Use two fresh accounts (or admin-created test users).

| Step | Actor | Action | Verify |
|------|-------|--------|--------|
| 1 | Landlord | Sign up via `/landlord-signup?tier=listing` | Intended tier stored |
| 2 | Landlord | Complete onboarding; save test card (4242…) | Profile shows card; wizard completes |
| 3 | Landlord | Create property; confirm tier = **Listing** only | No Managed option |
| 4 | Admin | Verify listing active + verified badge | Visible on homepage |
| 5 | Renter | Sign up → browse → book listing | Booking `pending_confirmation` |
| 6 | Landlord | Accept as Listing | Status → `bond_pending`; test $99 PI succeeds |
| 7 | Landlord | Mark bond received | Emails sent; doc gen triggered |
| 8 | Both | Complete DocuSeal signing | Status → `confirmed` |
| 9 | You | Grep production UI | No Managed CTAs anywhere |

**Stripe test webhook endpoint (current test origin):**

```text
https://quni-living.vercel.app/api/stripe-webhook
```

(After `quni.com.au` cutover, add a second endpoint or switch to `https://quni.com.au/api/stripe-webhook` for live mode.)

**Gate G2** must pass before Phase 4.

---

## Phase 4 - Stripe live flip (45 min)

### 4A. Stripe Dashboard

- [ ] Activate live mode
- [ ] Create live product: **“Quni Listing Fee”** → record `prod_...`
- [ ] Generate live keys: `sk_live_...`, `pk_live_...`
- [ ] Create live webhook → `https://<domain>/api/stripe-webhook`

**Subscribe to these events** (from `api/stripe-webhook.js`):

- `customer.subscription.*`
- `account.updated`
- `payment_intent.*`
- `invoice.paid`
- `invoice.payment_failed`

Record `whsec_...` for the live endpoint.

> Use **Vercel webhook only**. Do not also point Stripe at the Supabase `stripe-webhook` edge function unless you want duplicate processing.

### 4B. Update code constant / env

Set `STRIPE_LISTING_PRODUCT_ID=prod_<live_id>` on Vercel (after Phase 1E is deployed).

---

## Phase 5 - Vercel production env (30 min)

Update **Production** environment variables, then redeploy.

**Audit (names only):** From repo root, `npm run env:pull:production` writes `.env.vercel` (gitignored). Confirm each variable in the tables below (and Phase 3A) appears there with a non-empty value - do not commit that file. Full name reference: [`.env.example`](../.env.example) and [`docs/vercel-env-setup.md`](vercel-env-setup.md). Omit Vercel-injected `VERCEL_*`; skip duplicate `STRIPE_*` on Supabase if webhooks use Vercel only (Phase 6).

### Test-mode audit (complete 25 May 2026)

- [x] Phase 3A + “Must already be set” names present in production (`.env.vercel` pull)
- [x] Added `STRIPE_LISTING_PRODUCT_ID`, `VITE_SITE_URL`, `SITE_URL`, `PUBLIC_SITE_URL`
- [x] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` - marked Sensitive; scoped Production + Preview
- [x] Stripe keys confirmed **test** mode (`pk_test_` / `sk_test_`)

### Must change for live flip

| Variable | Value |
|----------|--------|
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Live endpoint `whsec_...` |
| `STRIPE_LISTING_PRODUCT_ID` | Live `prod_...` |

### Must already be set (verify, don’t skip)

| Variable | Purpose | Verified |
|----------|---------|----------|
| `VITE_SUPABASE_URL` | Client | [x] |
| `VITE_SUPABASE_ANON_KEY` | Client | [x] |
| `SUPABASE_URL` | API (same URL, no `VITE_`) | [x] |
| `SUPABASE_SERVICE_ROLE_KEY` | API admin ops | [x] |
| `SUPABASE_ANON_KEY` | JWT verification on connect routes (optional if same as `VITE_SUPABASE_ANON_KEY`) | [x] fallback |
| `RESEND_API_KEY` | Transactional email | [x] |
| `INTERNAL_DOC_FLOW_SECRET` | Lease generation after accept | [x] |
| `CRON_SECRET` | `/api/cron/expire-bookings`, `release-deposits` | [x] |
| `DOCUSEAL_API_URL` | `https://sign.quni.com.au` | [x] |
| `DOCUSEAL_API_TOKEN` | DocuSeal API | [x] |
| `DOCUSEAL_SUBMISSIONS_PATH` | Usually `/api/submissions` | [x] |
| `TURNSTILE_SECRET_KEY` | Form spam protection | [x] |
| `VITE_TURNSTILE_SITE_KEY` | Client Turnstile | [x] |
| `VITE_SENTRY_DSN` | Error monitoring | [x] |
| `SITE_URL` or `PUBLIC_SITE_URL` | Canonical origin for emails/links | [x] both set |
| `VITE_SITE_URL` | SEO canonical + OG | [x] |
| `STRIPE_LISTING_PRODUCT_ID` | Listing accept fee product | [x] test `prod_...` |

### If cutting over to quni.com.au (Option B)

Also update:

| Item | Value |
|------|--------|
| `VITE_SITE_URL` | `https://quni.com.au` |
| `SITE_URL` / `PUBLIC_SITE_URL` | `https://quni.com.au` |
| `public/robots.txt` line 18 | `Sitemap: https://quni.com.au/api/sitemap.xml` |

Redeploy after all changes.

### Post-deploy checks

- [ ] Sentry: open site → no init errors in Issues
- [ ] `GET /api/sitemap.xml` returns 200 with listing URLs
- [ ] Stripe Dashboard → Webhooks → live endpoint → recent deliveries 2xx

---

## Phase 6 - Supabase secrets (parallel, 15 min)

Separate from Vercel. In **Supabase → Edge Functions → Secrets**:

| Secret | Used by | Verified |
|--------|---------|----------|
| `RESEND_API_KEY` | `send-uni-otp`, `send-work-otp` | [x] (25 May 2026) |
| `DELETE_USER_DOCS_WEBHOOK_SECRET` | Account deletion webhook (`delete-user-documents`) | [x] |
| `STRIPE_*` | Only if using Supabase stripe-webhook | [x] skipped - Stripe webhooks on Vercel only (`/api/stripe-webhook`) |

OTP email verification depends on `RESEND_API_KEY` here even when Vercel also has it.

- [x] **Phase 6 complete** (25 May 2026) - Dashboard secrets audit; required keys present
- [ ] Confirm **Database → Webhooks**: `auth.users` DELETE → `delete-user-documents` only if that safety net is enabled (secret already set)

---

## Phase 7 - Resend + DocuSeal (30 min)

### Resend

Verify DNS green in Resend dashboard for:

- [x] **`quni.com.au`** domain - Verified (25 May 2026)
- [x] Sending identity: **`noreply@quni.com.au`** (actual sender in `api/lib/sendEmail.js`)
- [x] **`hello@quni.com.au`** (support/contact copy on site)
- [x] Test transactional email delivered end-to-end on production

### DocuSeal

- [x] Railway instance up: `https://sign.quni.com.au` - login OK (25 May 2026)
- [x] Vercel env `DOCUSEAL_*` correct (Phase 5 audit)
- [x] DocuSeal webhook → `https://quni-living.vercel.app/api/webhooks/docuseal` (switch to `quni.com.au` after DNS cutover)
- [ ] One test Listing signing flow on production (**G2** - needs booking + listings)

- [x] **Phase 7 spot-check complete** (25 May 2026) - signing E2E deferred to **G2**

---

## Phase 8 - Admin setup (30 min)

In **Admin → Business Settings**:

- [ ] Bank details (BSB, account number, account name, bank name) - **Gate G5**
- [ ] Legal entity, ABN, ACN, director - verify non-empty

In **Admin → Properties** (see **Listing inventory** section above):

- [ ] Inventory audit SQL run; `demo-*` and unready rows set to `inactive`
- [ ] 5–10 **verified, real** listings active (not raw demo/seed unless upgraded to the keep-live bar)
- [ ] Casa Malvina (or equivalent real listing #1) live and verified
- [ ] All active listings have `service_tier = listing`
- [ ] Each active listing’s landlord has a saved card (test or live, matching Stripe mode)

In **Admin → Trust checklist** (`/admin/trust-checklist`) - Phase 1 items:

| # | Task | Listing-only note |
|---|------|-------------------|
| 1 | DNS cutover | Defer if Option A |
| 2 | Stripe live | Phase 4 |
| 3 | ABN in footer | Verify live |
| 4–6 | Privacy, Terms, Refunds | Verify linked |
| 7–8 | Verified badges | Spot-check on cards |
| 9–10 | Stripe + DocuSeal callouts | Spot-check booking flow |
| 11 | Casa Malvina listing | Your listing #1 |
| 12 | Full E2E test | Phase 9 below |

---

## Phase 9 - Live smoke test (45–90 min)

**Gate G3.** Use a real card; refund the $99 after.

| # | Step | Pass criteria |
|---|------|---------------|
| 1 | Renter signs up (student or professional path) | Email verified if required |
| 2 | Browse → open seed listing → enquire | Message sends |
| 3 | Book with live Stripe deposit hold | `pending_confirmation` |
| 4 | Landlord accepts Listing | **Live $99** charged; `bond_pending` |
| 5 | Stripe Dashboard | PI succeeded; metadata has live `stripe_product_id` |
| 6 | Landlord marks bond received | Emails received; lease package generated |
| 7 | Both sign via DocuSeal | Webhook fires; booking `confirmed` |
| 8 | UI audit | Managed invisible: `/pricing`, property form, `/`, `/how-it-works`, landlord signup |
| 9 | Refund $99 in Stripe Dashboard | Optional but recommended |

**Common failures:**

| Symptom | Likely cause |
|---------|----------------|
| `listing_billing_incomplete` on accept | Landlord has no saved card on live Stripe Customer |
| Lease not generated | `INTERNAL_DOC_FLOW_SECRET` missing; check Vercel logs for `/api/documents/generate-*` |
| `listing_module_disabled` | `quni_service_tier_module_enabled` is not `true` in Supabase |

---

## Phase 10 - DNS cutover (Option B only, 30–60 min)

Skip if staying on `quni-living.vercel.app` for now.

1. Add `quni.com.au` in Vercel → Domains
2. Cloudflare DNS → CNAME to Vercel (or A record per Vercel instructions)
3. Wait for SSL green
4. Update env vars + `public/robots.txt` (Phase 5)
5. Redeploy
6. Redirect old URL if desired (Vercel redirect rule: `quni-living.vercel.app` → `quni.com.au`)
7. **Google Search Console:** add property, submit `https://quni.com.au/api/sitemap.xml`, request indexing on homepage + 2–3 suburb pages

---

## Rollback plan

| Failure | Rollback |
|---------|----------|
| Live charge broken | Revert Vercel to test Stripe keys; redeploy |
| Listing confirms broken | Set `quni_service_tier_module_enabled = true`; check landlord card |
| Managed accidentally exposed | Set `quni_service_tier_managed_enabled = false`; redeploy Phase 1 code |
| DocuSeal down | Pause new bookings; fix Railway; replay webhook from DocuSeal dashboard |
| Bad deploy | Vercel → instant rollback to previous deployment |

---

## Time budget

| Phase | Estimate |
|-------|----------|
| 0 Decisions | 15 min |
| 1 Code | 2–3 hr |
| 1.25 Platform staff / Admin → Team | ~1 hr |
| 1.5 State Managed toggles | ~1 hr |
| 2 Supabase | 30 min |
| 3 Test-mode E2E | 1–2 hr |
| 4 Stripe live | 45 min |
| 5 Vercel env | 30 min |
| 6–7 Resend/DocuSeal | 45 min |
| 8 Admin | 30 min |
| 9 Live smoke | 45–90 min |
| 10 DNS (optional) | 30–60 min |
| **Total** | **7–10 hr** with buffer |

---

## Minimal day-of checklist (printable)

```text
□ Clean inventory: DELETE properties; DELETE test auth users (keep hello@quni.com.au)
□ Phase 1 code merged + G1 green
□ Phase 1.25: platform_staff migration + Admin → Team; is_platform_admin() on table
□ Supabase: module_enabled=true, managed_enabled=false, properties→listing
□ Bank details in admin
□ Deploy (test Stripe)
□ Test-mode E2E pass (G2)
□ Stripe live keys + product + webhook
☑ Vercel env (test mode) audited - live flip + redeploy pending
□ Live E2E pass (G3) + Managed not bookable (G4)
☑ Resend test email OK (25 May 2026)
□ DocuSeal signing OK (G2 - infra + webhook done in Phase 7)
□ Sentry clean
□ (Optional) DNS + GSC sitemap
```

---

## Today’s session (25 May 2026)

**Goal:** Finish anything that does **not** need the 3 production listings, then run **Phase 3 test-mode E2E** once you have at least one active listing (E2E script creates one, or use Casa Malvina + 2 when ready).

**Time budget:** ~2–3 hours (inventory block ~30–60 min when you create the 3 listings).

### Done already (verified on production)

- [x] Phase 2 flags + `public_platform_features`
- [x] Migrations applied (`supabase db push --linked`)
- [x] Clean slate: `properties` count = **0**
- [x] `platform_staff` seeded (`hello@quni.com.au`, `quinn@4logistics.com.au`)
- [x] G1 green locally

### A. Clean slate - properties + test users (complete)

**1. Delete all listings** (cascades bookings/enquiries):

```sql
DELETE FROM public.properties;
```

**2. Delete test auth users** (keep admin bootstrap):

```sql
DELETE FROM auth.users
WHERE lower(trim(email)) <> 'hello@quni.com.au';
```

**3. Verify:**

```sql
SELECT count(*) FROM public.properties;  -- 0
SELECT email FROM auth.users;             -- hello@quni.com.au only
```

**4. Create 3 listings fresh** via landlord dashboard (Casa Malvina + 2 real) - **scheduled later today**. Verify landlord(s) in **Admin → Landlords**.

> You can start **Phase 3 E2E** with a single throwaway listing (steps 1–3 in §3B) before the 3 production listings are polished.

<details>
<summary>Legacy: audit + pick-3 from existing rows (skip if using clean slate)</summary>

Run the audit in **Supabase → SQL Editor**:

```sql
SELECT p.slug, p.title, p.suburb, p.status, lp.verified AS landlord_verified,
       (p.images[1] LIKE '%unsplash%') AS stock_photo
FROM public.properties p
JOIN public.landlord_profiles lp ON lp.id = p.landlord_id
WHERE p.status = 'active'
ORDER BY p.slug;
```

- [ ] Decide **3 slugs** to keep live
- [ ] Deactivate `demo-*` and other seeds

</details>

### B. Finish Phase 2 Supabase (~15 min) - **done 25 May**

Verified via CLI:

```bash
npx supabase db push --linked   # Remote database is up to date
npx supabase db query --linked "SELECT * FROM public.public_platform_features;"
```

Reference SQL if you ever need to re-apply flags without migrations:

```sql
-- Managed globally off (migration may already insert this)
INSERT INTO public.platform_config (config_key, config_value, label, category, is_sensitive, sort_order)
VALUES ('quni_service_tier_managed_enabled', 'false', 'Enable Quni Managed tier platform-wide', 'compliance', false, 911)
ON CONFLICT (config_key) DO UPDATE SET config_value = 'false';

-- All properties → Listing tier
UPDATE public.properties
SET service_tier = 'listing'
WHERE service_tier IS DISTINCT FROM 'listing';
```

Verify:

```sql
SELECT config_key, config_value
FROM public.platform_config
WHERE config_key IN ('quni_service_tier_module_enabled', 'quni_service_tier_managed_enabled');

SELECT service_tier, count(*) FROM public.properties GROUP BY 1;

SELECT * FROM public.public_platform_features;
-- Expect: listing_module_enabled=true, managed_tier_enabled=false
```

- [x] Migrations applied (through `20260526160000`)
- [x] `managed_enabled = false`, `module_enabled = true`
- [ ] All properties `service_tier = 'listing'` (after listings created today)
- [x] `public_platform_features` view returns expected flags

### C. Admin spot-checks (~15 min)

- [ ] **Admin → Business settings** - bank details non-empty (**Gate G5**)
- [ ] **Admin → Properties** - 3 real listings active; landlords verified
- [ ] **Admin → Team** - add any extra staff emails (after Phase 1.25 ships)
- [ ] **Admin → Trust checklist** - items 3–11 spot-checked

### D. Phase 3 - test-mode E2E (~1–2 hr)

Production with **Stripe test keys** still set in Vercel.

| Step | Actor | Action | Verify |
|------|-------|--------|--------|
| 1 | Landlord | Sign up `/landlord-signup?tier=listing` | Intended tier stored |
| 2 | Landlord | Onboarding + test card `4242…` | Wizard completes |
| 3 | Landlord | Create property; tier = **Listing** only | Managed not selectable |
| 4 | Renter | Sign up → book one of your 3 listings | `pending_confirmation` |
| 5 | Landlord | Accept as Listing | `bond_pending`; test $99 PI succeeds |
| 6 | Landlord | Mark bond received | Emails + doc gen triggered |
| 7 | Both | DocuSeal signing | Booking `confirmed` |
| 8 | You | UI audit | Managed teased but not bookable (**G4**) |

**Gate G2** must pass before Stripe live flip (Phase 4).

### E. Phase 1.25 - platform staff - **done**

- [x] `platform_staff` migration applied; `is_platform_admin()` reads table
- [x] **Admin → Team** - add staff without code deploy

### F. Phase 1.5 - per-state Managed toggles - **done**

- [x] Per-state × tier Managed toggles on **Admin → State workflows**
- [x] **Phase 6** - Supabase Edge secrets (`RESEND_API_KEY`, `DELETE_USER_DOCS_WEBHOOK_SECRET`; Vercel-only Stripe webhooks)
- [x] **Phase 7** - Resend + DocuSeal spot-check (25 May 2026; signing E2E in G2)
- [x] **Phase 3 pre-flight** (§3A) - Vercel production env on `quni-living.vercel.app` with **test** Stripe keys (25 May 2026)
- [x] **Phase 5 test-mode audit** - see §Phase 5 “Test-mode audit”
- [ ] **Phase 3 / G2** test-mode E2E (§3B / §D) - after ≥1 active listing (your 3 later, or throwaway in steps 1–3)
- [ ] **`quni.com.au` on Vercel** - before Phase 4 live Stripe + G3 (domain decision done; DNS/env cutover pending)

---

## Related docs

- [Dual-tier service model](./dual-tier-service-model.md) - product strategy and tier definitions
- [Phase 3 landlord listing](./phase-3-landlord-listing.md) - Listing booking implementation notes
- [Vercel env setup](./vercel-env-setup.md) - full env var reference
