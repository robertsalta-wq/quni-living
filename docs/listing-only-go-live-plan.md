# Quni Listing go-live — concrete plan

**Scope:** Listing-only launch on production. Managed stays in the codebase — **teased in marketing, not bookable** until flags are flipped later.

**Status:** Pre-launch checklist — Phase 1 code shipped; inventory + remaining Supabase deferred to Monday  
**Last updated:** 24 May 2026

**Go-live is postponed until every item in [Pre-go-live — nothing ships until…](#pre-go-live--nothing-ships-until) is checked.**

---

## Pre-go-live — nothing ships until…

**Definition of go-live:** Real strangers can discover listings, book, pay real money, and sign a lease on production. No public traffic or real bookings until **every box below** is done. Postponing launch is correct if anything is incomplete.

### Build & database

- [ ] **Phase 1 code** deployed — Managed teased in UI, not selectable/bookable (**G4**)
- [ ] **Phase 2 Supabase** complete — migrations pushed; `module_enabled=true`; `managed_enabled=false`; all properties → `service_tier = 'listing'`; `public_platform_features` view live
- [ ] **Listing inventory** finalized — clean slate (`DELETE` properties + test users) or curated keep-3; 3 verified real listings live (Casa Malvina + 2); landlords verified in admin
- [ ] **Phase 1.25** — `platform_staff` table + `is_platform_admin()` RPC + **Admin → Team** UI (port Unstash pattern; no hardcoded admin emails)
- [ ] **Phase 1.5** — per-state × tier Managed toggles editable in **Admin → State workflows** (so state rollouts need no deploy)

### Prove it works

- [ ] **G1** — `npx tsc -b --noEmit` and `npm test` green on release commit
- [ ] **G2** — full test-mode E2E on production: signup → book → accept → test $99 → bond → DocuSeal → `confirmed`
- [ ] **G5** — bank + legal entity non-empty in **Admin → Business settings** (lease PDFs)
- [ ] **Stripe live** — live keys, live Listing product ID, live webhook on production domain
- [ ] **Vercel env** — all production secrets correct for live mode (see Phase 5)
- [ ] **Resend** — at least one transactional email delivered end-to-end on production
- [ ] **DocuSeal** — `sign.quni.com.au` healthy; signing completes on production
- [ ] **G3** — live smoke test: one real $99 charge, full flow, then refund

### Domain (minimum)

- [ ] **Domain decision made** — Option A (`quni-living.vercel.app`) or Option B (`quni.com.au`) before env + smoke test

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

**Rough progress (24 May 2026):** ~15–20% of this list complete (Phase 1 code + `module_enabled` on production).

---

## Current status (snapshot)

| Item | Status |
|------|--------|
| Phase 1 code (Managed gated + teased in UI) | **Done** — deployed to `main` |
| `quni_service_tier_module_enabled` | **Done** — already `true` on production |
| `quni_service_tier_managed_enabled` + `public_platform_features` view | **Pending** — migration `20260524120000` not applied |
| `public_legal_entity_view` migration | **Pending** — migration `20260523120000` not applied |
| Properties backfill → `service_tier = 'listing'` | **Pending** — all 21 rows still `managed` (OK while Managed globally off) |
| Listing inventory | **Deferred to Monday** — clean-slate wipe planned |
| Platform staff / Admin → Team (Phase 1.25) | **Not built** — **required before go-live** |
| Per-state Managed admin toggles (Phase 1.5) | **Not built** — **required before go-live** |
| Test-mode E2E (Phase 3) | **Not started** |
| Stripe live flip (Phase 4) | **Not started** |

---

## Domain decision (pick one before Phase 5)

| Option | Pros | Cons |
|--------|------|------|
| **A — Stay on `quni-living.vercel.app`** | Fastest; no DNS risk | Weaker brand; update GSC later |
| **B — Cut over to `quni.com.au`** | Proper brand | DNS + SSL + `VITE_SITE_URL` + `robots.txt` must align |

**Recommendation:** Option A for first live smoke test, then DNS cutover once Listing E2E passes on live Stripe.

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

## Phase 0 — Decisions (15 min)

- [ ] Launch domain: Option A or B above
- [ ] Seed geography: confirm all seed listings are **NSW T2 private room** (Listing is available; Managed already geo-gated for NSW T2)
- [ ] One real card for live smoke test (refund after)
- [ ] DocuSeal Railway instance healthy at `https://sign.quni.com.au`
- [ ] **Listing inventory policy decided** (see below) — which rows stay `active` vs `inactive`

---

## Listing inventory — keep, upgrade, or remove?

**Yes, this belongs in the plan.** There is no `is_seed` or `is_demo` column on `properties`. Anything with `status = 'active'` appears on the homepage, sitemap, and can be booked end-to-end. Seed and demo rows are indistinguishable from real listings to renters.

### Recommendation

| Category | Action | Why |
|----------|--------|-----|
| **Real listings** (e.g. Casa Malvina, any property you can actually let) | **Keep live** | Cold-start supply + trust checklist target (5–10 verified listings) |
| **`seedProperties.ts` rows** (15 Unsplash listings, hardcoded landlord IDs) | **Upgrade or deactivate** — do not leave as-is unless every row passes the bar below | Generic stock photos + test landlords = booking/legal risk if a renter pays deposit |
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

For other seed rows, deactivate individually after reviewing the audit — do not bulk-delete unless you are sure no real listing shares those slugs.

**Target at launch:** 5–10 **verified, real** listings (Trust checklist Phase 1 #11 + Phase 3). Casa Malvina as listing #1; fill remaining slots with genuine supply or upgraded seeds that meet the bar above — not raw demo data.

### What not to do

- Do **not** delete seed rows from the DB unless you are cleaning up a dev environment; use `status = 'inactive'` so history and admin references stay intact.
- Do **not** leave `demo-*` listings active while taking live payments — a completed booking on a fake address is a support and reputational incident.
- Do **not** count inactive or unverified listings toward “5–10 live” in the trust checklist.

---

## Phase 1 — Code (2–3 hours)

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

### 1B. UI — hide Managed when flag is off

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

## Phase 1.25 — Platform staff / Admin → Team (~1 session)

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

### 1.25C. Admin UI — **Admin → Team**

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

## Phase 2 — Supabase (30 min)

Run in **Supabase → SQL Editor** (production project).

### 2A. Platform config

```sql
-- Enable Listing booking module (REQUIRED — default is false)
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

## Phase 3 — Deploy code + test mode E2E (1–2 hours)

Deploy Phase 1 code to production **while Stripe is still in test mode**.

### 3A. Pre-flight on production (test keys)

Confirm Vercel production already has test Stripe keys and:

- `INTERNAL_DOC_FLOW_SECRET` — set (lease gen skips without it)
- `CRON_SECRET` — set (booking expiry crons)
- `DOCUSEAL_API_URL`, `DOCUSEAL_API_TOKEN`
- `RESEND_API_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_test_...`
- `STRIPE_SECRET_KEY` = `sk_test_...`
- `STRIPE_WEBHOOK_SECRET` = test webhook `whsec_...`

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

**Stripe test webhook endpoint:**

```text
https://<your-production-domain>/api/stripe-webhook
```

**Gate G2** must pass before Phase 4.

---

## Phase 4 — Stripe live flip (45 min)

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

## Phase 5 — Vercel production env (30 min)

Update **Production** environment variables, then redeploy.

### Must change for live flip

| Variable | Value |
|----------|--------|
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Live endpoint `whsec_...` |
| `STRIPE_LISTING_PRODUCT_ID` | Live `prod_...` |

### Must already be set (verify, don’t skip)

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Client |
| `VITE_SUPABASE_ANON_KEY` | Client |
| `SUPABASE_URL` | API (same URL, no `VITE_`) |
| `SUPABASE_SERVICE_ROLE_KEY` | API admin ops |
| `SUPABASE_ANON_KEY` | JWT verification on connect routes |
| `RESEND_API_KEY` | Transactional email |
| `INTERNAL_DOC_FLOW_SECRET` | Lease generation after accept |
| `CRON_SECRET` | `/api/cron/expire-bookings`, `release-deposits` |
| `DOCUSEAL_API_URL` | `https://sign.quni.com.au` |
| `DOCUSEAL_API_TOKEN` | DocuSeal API |
| `DOCUSEAL_SUBMISSIONS_PATH` | Usually `/api/submissions` |
| `TURNSTILE_SECRET_KEY` | Form spam protection |
| `VITE_TURNSTILE_SITE_KEY` | Client Turnstile |
| `VITE_SENTRY_DSN` | Error monitoring |
| `SITE_URL` or `PUBLIC_SITE_URL` | Canonical origin for emails/links |
| `VITE_SITE_URL` | SEO canonical + OG |

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

## Phase 6 — Supabase secrets (parallel, 15 min)

Separate from Vercel. In **Supabase → Edge Functions → Secrets**:

| Secret | Used by |
|--------|---------|
| `RESEND_API_KEY` | `send-uni-otp`, `send-work-otp` |
| `DELETE_USER_DOCS_WEBHOOK_SECRET` | Account deletion webhook |
| `STRIPE_*` | Only if using Supabase stripe-webhook (skip if Vercel-only) |

OTP email verification depends on `RESEND_API_KEY` here even when Vercel also has it.

---

## Phase 7 — Resend + DocuSeal (30 min)

### Resend

Verify DNS green in Resend dashboard for:

- **`quni.com.au`** domain
- Sending identity: **`noreply@quni.com.au`** (actual sender in `api/lib/sendEmail.js`)
- **`hello@quni.com.au`** (support/contact copy on site)

Send one test transactional email end-to-end (e.g. trigger a booking notification or use Resend dashboard test send).

### DocuSeal

- [ ] Railway instance up: `https://sign.quni.com.au`
- [ ] Vercel env `DOCUSEAL_*` correct
- [ ] DocuSeal webhook → `https://<domain>/api/webhooks/docuseal` (signing completion)
- [ ] One test Listing signing flow on **live** (after Phase 9 step 7)

---

## Phase 8 — Admin setup (30 min)

In **Admin → Business Settings**:

- [ ] Bank details (BSB, account number, account name, bank name) — **Gate G5**
- [ ] Legal entity, ABN, ACN, director — verify non-empty

In **Admin → Properties** (see **Listing inventory** section above):

- [ ] Inventory audit SQL run; `demo-*` and unready rows set to `inactive`
- [ ] 5–10 **verified, real** listings active (not raw demo/seed unless upgraded to the keep-live bar)
- [ ] Casa Malvina (or equivalent real listing #1) live and verified
- [ ] All active listings have `service_tier = listing`
- [ ] Each active listing’s landlord has a saved card (test or live, matching Stripe mode)

In **Admin → Trust checklist** (`/admin/trust-checklist`) — Phase 1 items:

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

## Phase 9 — Live smoke test (45–90 min)

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

## Phase 10 — DNS cutover (Option B only, 30–60 min)

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
□ Vercel env updated + redeploy
□ Live E2E pass (G3) + Managed not bookable (G4)
□ Resend test email OK
□ DocuSeal signing OK
□ Sentry clean
□ (Optional) DNS + GSC sitemap
```

---

## Monday session checklist

**Goal:** Finalize inventory, finish Phase 2 Supabase, then run Phase 3 test-mode E2E.

**Time budget:** ~2–3 hours total.

### A. Clean slate — properties + test users

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

**4. Create 3 listings fresh** via landlord dashboard (Casa Malvina + 2 real). Verify landlord(s) in **Admin → Landlords**.

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

### B. Finish Phase 2 Supabase (~15 min)

From repo root (linked project `flegysnshryzvkwzfclc`):

```bash
npx supabase db push
```

Or paste in SQL Editor if CLI auth fails.

Then run:

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

- [ ] Migrations applied (`20260523120000`, `20260524120000`)
- [ ] `managed_enabled = false`, `module_enabled = true`
- [ ] All properties `service_tier = 'listing'`
- [ ] `public_platform_features` view returns expected flags

### C. Admin spot-checks (~15 min)

- [ ] **Admin → Business settings** — bank details non-empty (**Gate G5**)
- [ ] **Admin → Properties** — 3 real listings active; landlords verified
- [ ] **Admin → Team** — add any extra staff emails (after Phase 1.25 ships)
- [ ] **Admin → Trust checklist** — items 3–11 spot-checked

### D. Phase 3 — test-mode E2E (~1–2 hr)

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

### E. Phase 1.25 — platform staff (required before go-live)

- [ ] `platform_staff` migration applied; `is_platform_admin()` reads table
- [ ] **Admin → Team** — add staff without code deploy

### F. Phase 1.5 — per-state Managed toggles (required before go-live)

- [ ] Build per-state × tier Managed toggles on **Admin → State workflows** (avoids deploy per state at ~1 month)
- [ ] DocuSeal + Resend spot-check (Phases 6–7)

---

## Related docs

- [Dual-tier service model](./dual-tier-service-model.md) — product strategy and tier definitions
- [Phase 3 landlord listing](./phase-3-landlord-listing.md) — Listing booking implementation notes
- [Vercel env setup](./vercel-env-setup.md) — full env var reference
