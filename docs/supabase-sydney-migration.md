# Supabase region migration - Tokyo → Sydney

**Status:** **Cutover in progress** (2026-05-29). Sydney is live for production traffic; finish integrations + smoke test, then pause Tokyo.

**Goal:** Move Quni Living from **Northeast Asia (Tokyo)** to **South East Asia (Sydney) / `ap-southeast-2`** before launch, while there is no real user data to lose.

**Why now:** 0 real users, 0 bookings, 0 payments. Schema is in version-controlled migrations (replayable). Test data is recreatable. This is the cheapest and safest moment this migration will ever happen.

**North star:** Migrate schema and make Sydney a **complete clone of a production-ready Supabase setup** - tables, storage, webhooks, seeds, **backups**, env hygiene - **not just tables**.

**Core principle:** Build and fully verify the Sydney project in parallel **before** cutting the live app over. Both projects run side by side until Phase 6. Nothing in production changes until cutover.

| Project | Ref | Region |
|---------|-----|--------|
| **Current (Tokyo)** | `flegysnshryzvkwzfclc` | Northeast Asia (Tokyo) - pause after confidence |
| **New (Sydney)** | `cqakltqzqrxnmxfbqatx` | `ap-southeast-2` - **production** |

### Done (verified 2026-05-29)

- Schema + reference data on Sydney (`platform_config` 50, `platform_settings` 4, `pricing_config` 6, `service_tier_state_matrix` 12, `knowledge_base` 26, universities 41, campuses 122)
- Six storage buckets + RLS; 16 edge functions deployed; edge secrets set
- Auth URL + Google OAuth on Sydney; Vercel Production env → Sydney; code grep clean (no Tokyo refs in `src/`)
- `/api/listings-browse` returns `200` with `total: 0` (expected - **0 properties** migrated)

### Finish today (ROB - dashboards)

1. **Database webhook** - `auth.users` DELETE → `delete-user-documents` (see Phase 7.5)
2. **Resend webhook** - only if Qase inbound email is used → Sydney `qase-inbound-email` URL (Phase 7.2)
3. **Smoke test** - login, listings API, one listing upload (Phase 8)
4. **Optional:** 1 landlord account + `seed_demo_listings.sql` so `/listings` is not empty
5. **Pause Tokyo** project `flegysnshryzvkwzfclc` (delete after a few days)

Org: `kpbfhbxtiffomvejfsfh`

Related docs: [supabase/README.md](../supabase/README.md), [listings-browse-performance.md](./listings-browse-performance.md), [vercel-env-setup.md](./vercel-env-setup.md), [.env.example](../.env.example).

---

## Tiered extras (discipline)

Use this filter for every “while we’re here” idea:

| Tier | Rule |
|------|------|
| **Blockers** | Required for Sydney to be a correct production setup. Do before or during cutover. |
| **Same day if energy** | Low regret, &lt; ~1 day total extra. Do in the migration sitting if time allows. |
| **Within 2 weeks of launch** | Valuable but must not block migration day. |

### Blockers (migration + production readiness)

- [ ] **Plan tier:** Provision Sydney on **Supabase Pro**, not Free (no auto-pause, proper backups).
- [ ] **Backup / PITR:** Decide explicitly at creation - daily backups (Pro), whether **Point-in-Time Recovery** is enabled (add-on). Document RPO/RTO in one sentence for the team. Tenancy, bond, and payment records warrant this.
- [ ] **Extensions** on Sydney before `db push`: `vector` (required), `pg_cron`, `pg_net` (see Phase 2.0).
- [ ] Replay all migrations (`db push` or per-file fallback).
- [ ] **Six storage buckets** + RLS SQL (see Phase 2.4).
- [ ] **Config / reference data parity** - `platform_config`, `pricing_config`, `service_tier_state_matrix`, `platform_settings` (see Phase 2.5).
- [ ] **`knowledge_base` re-seed** (~26 rows) after `vector` is enabled (see Phase 2.6).
- [ ] **Database webhook** → `delete-user-documents` with `x-webhook-secret`.
- [ ] Edge function secrets (re-enter; **rotate** any secret ever pasted into chat/logs - see Phase 3).
- [ ] Deploy all required edge functions (`npm run supabase:deploy:functions` or equivalent with `NEW_REF`).
- [ ] Auth: Site URL, redirect allowlist, Google OAuth + new callback URL.
- [ ] Vercel env cutover (Production + Preview) in **one sitting**.
- [ ] Remove hardcoded Tokyo URLs in app (Qase components - Phase 6.1).
- [ ] Post-cutover smoke test (Phase 8).

### Same day if energy

- [ ] **RLS / security advisor sweep** on Sydney after schema replay (Claude: Phase 2.3 / 8.1 - confirm RLS enabled where expected, nothing accidentally world-readable; **not** a full policy rewrite).
- [ ] **One-command bootstrap doc** - this file + `supabase/README.md` so a fresh project is usable (seeds, not empty filters).
- [ ] Universities/campuses seed: `supabase/universities_campuses_seed.sql`.
- [ ] Confirm **Stripe** production path is **Vercel** `/api/stripe-webhook` only; do not duplicate secrets on Supabase `stripe-webhook` unless that endpoint is actually used.
- [ ] Copy **auth email templates** (e.g. `supabase/templates/confirmation.html` → Dashboard).
- [ ] **Confirm email** enabled: Authentication → Providers → Email → turn on **Confirm email** (otherwise sign-ups skip verification and go straight to onboarding).
- [ ] Auth allowlist: `com.quni.living://auth/callback` for Capacitor if testing native.
- [ ] Run `node scripts/check-supabase-listings-latency.mjs` against **new** URL after cutover.
- [ ] Listings partial index only if EXPLAIN shows seq scans (see [listings-browse-performance.md](./listings-browse-performance.md)).

### Within 2 weeks of launch

- [x] **Data residency** - deliberate updates (not a throwaway FAQ line):
  - Privacy policy draft: `docs/legal/data-residency-clause-draft.md` (lawyer review; live `/privacy` unchanged).
  - University partnership pitch: `docs/outreach/university-partnerships.md`.
  - Trust copy: homepage + `/how-it-works` (`WhyQuniTrustBlock`).
  - International students: `/international`, `/student-accommodation` callout, `/faq`.
- [ ] Custom Supabase Auth domain when `quni.com.au` DNS is ready.
- [ ] Sentry release/environment tags; optional uptime on `/api/listings-browse`.
- [ ] Preview vs Production env policy documented (both on Sydney; no stray Tokyo Preview).
- [ ] Pause then delete Tokyo project after confidence window.

### Would NOT do during this migration

- Unrelated schema redesigns or “full RLS rewrite.”
- Listings/search rebuild (pagination, Algolia, etc.) - use post-launch metrics.
- Migrating off Supabase.
- Large refactors “because we have the DB open.”

**Discipline test:** Does it make the new project a **complete, correct production setup**, or is it a feature/refactor that only feels urgent because we’re migrating?

---

## Ownership

| Who | Does what |
|-----|-----------|
| **[ROB]** | Dashboard, credentials, Vercel env, OAuth, webhooks, backups/PITR choice, smoke test, decommission Tokyo. |
| **[CURSOR]** | CLI link, `db push`, function deploy, code/env ref updates, `tsc`, push, grep fixes. |
| **[CLAUDE]** | Baseline snapshot, schema parity, security advisor, health checks at checkpoints. |

---

## Phase 0 - Baseline (before touching anything)

**0.1 [CLAUDE]** Capture Tokyo baseline: tables, RLS, functions, triggers, constraints, Realtime publication, row counts, **all six storage buckets** + `storage.objects` policies (especially `tenancy-documents`, which has **no RLS SQL in repo**), and row counts for:

| Table | Tokyo baseline (approx.) | Why it matters |
|-------|--------------------------|----------------|
| `platform_config` | ~50 | Feature flags, masking, business/bank settings |
| `pricing_config` | ~6 | Fee / tier pricing |
| `service_tier_state_matrix` | ~12 | Tenancy / service-tier rules by state |
| `platform_settings` | ~4 | Legacy key/value settings (fees display) |
| `knowledge_base` | ~26 | AI chat RAG (not in migrations) |

**0.2 [ROB]** Confirm `ap-southeast-2` is available when creating the project.

---

## Phase 1 - Stand up the Sydney project

**1.1 [ROB]** Dashboard → New project:

- Organization: same org
- Name: e.g. `Quni-Living-AU`
- Region: **South East Asia (Sydney) / `ap-southeast-2`**
- **Plan: Pro** (not Free)
- Strong DB password (password manager)

**1.2 [ROB]** **Backups / PITR** (blocker):

- Confirm daily backups on Pro.
- Decide whether to enable **Point-in-Time Recovery** (paid add-on) before handling real tenancy/bond/payment data.
- Note decision here: `PITR: yes/no - decided YYYY-MM-DD by ___`

**1.3 [ROB]** Copy from Settings → API:

- `NEW_REF`, `https://NEW_REF.supabase.co`
- Anon (publishable) key
- `service_role` secret key

**1.4 [CLAUDE]** Verify `ACTIVE_HEALTHY` and region `ap-southeast-2`.

---

## Phase 2 - Replay schema + storage

**2.0 [ROB]** **Enable extensions on Sydney** (blocker - do **before** `db push`):

Dashboard → **Database** → **Extensions** (or SQL Editor):

| Extension | Why |
|-----------|-----|
| **`vector`** | `20260406150000_knowledge_base_rag.sql` creates `vector(1536)` columns and an IVFFlat index. If `vector` is not available, that migration **fails** even though the file contains `create extension if not exists vector`. |
| **`pg_cron`** | Used by TPP domain-expiry and platform-health cron migrations (`20260412180000_*`, `20260413120100_*`). |
| **`pg_net`** | HTTP from cron jobs in the same migrations. |

Migrations also run `create extension if not exists …` for cron/net, but enabling **`vector` in the Dashboard first** avoids a failed push on hosted Postgres.

**2.1 [CURSOR]** `npx supabase link --project-ref NEW_REF`

**2.2 [CURSOR]** Replay migrations:

```bash
npx supabase db push --linked
```

If history drift: run each file in `supabase/migrations/` in timestamp order via `npx supabase db query --linked -f <file>`.

**2.3 [CLAUDE]** Parity vs Phase 0 baseline + **security advisor** (RLS enabled on sensitive tables, no accidental public exposure).

**2.4 [ROB or CURSOR]** **Storage** (blocker - Tokyo has **six** buckets; four are only partially covered by `db push`):

| Bucket | Public? | Created by | RLS / policies |
|--------|---------|------------|----------------|
| `property-images` | Yes | Dashboard → New bucket (see SQL header) | `supabase/storage_property_images.sql` |
| `landlord-avatars` | Yes | Dashboard → New bucket | `supabase/storage_landlord_profile_photos.sql` |
| `student-avatars` | Yes | Dashboard → New bucket | `supabase/storage_student_profile_photos.sql` |
| `student-documents` | No (private) | `supabase/student_verification.sql` (`insert into storage.buckets …`) | Same file + admin read policy in `20260526120000_platform_staff.sql` |
| `qase-attachments` | No (private) | `supabase/migrations/20260415120300_qase_attachments.sql` | Same migration (bucket + `storage.objects` policies) |
| `tenancy-documents` | No (private) | **Manual** - not in migrations | **No RLS SQL in repo.** Signed agreements use this bucket from Vercel (`api/documents/*`, `api/lib/docuseal.ts`) and the landlord dashboard. **Recreate bucket + copy `storage.objects` policies from Phase 0 Tokyo baseline** (landlord/student signed-url access). |

Tokyo storage **objects** do not migrate - re-upload listing photos after cutover if needed.

**2.5 [CLAUDE + ROB]** **Config / reference data parity** (launch-breaking if wrong):

After `db push`, compare row counts on Sydney vs Phase 0 Tokyo. Migrations **seed skeleton rows only** for some tables; Tokyo production values are often **admin-edited** or **runtime-only**.

| Table | In migrations? | Sydney expectation | If counts or values differ |
|-------|----------------|-------------------|----------------------------|
| `platform_config` | **Partial** - multiple `insert … on conflict do nothing` migrations (e.g. `20260411210000_platform_config.sql`, house rules, peer messaging, service-tier flags). ~11 keys in first seed; more keys added over time. | Row count **well below** Tokyo (~50) or empty `config_value` on critical keys | **Export Tokyo → import Sydney** (SQL `COPY`, `pg_dump --data-only`, or Table Editor). Drives masking, feature flags, business/bank fields. |
| `pricing_config` | **Yes** - `20260411150000_pricing_config_fee_calculation.sql`, `20260416170000_service_tier_pricing_foundation.sql` | ~**6** rows if unchanged | If Tokyo ≠ Sydney after push, export/import Tokyo rows (admin may have tuned rates). |
| `service_tier_state_matrix` | **Yes** - `20260526160000_service_tier_state_matrix.sql` inserts **12** rows | **12** rows | Should match after push; if not, re-run migration file or export/import. |
| `platform_settings` | **Schema only** (`supabase/admin_payments_bonds_xero_platform.sql`) - **no `insert` in migrations** | **0** rows after push only | **Required:** export **all** Tokyo rows (~4) and import to Sydney before launch. |

**Export/import checklist (when needed):**

1. Tokyo SQL Editor or `psql`: `\copy (select * from public.platform_config order by config_key) to 'platform_config.csv' csv header` (repeat per table).
2. Import into Sydney with matching column order, or paste INSERT statements from a one-off export.
3. Re-run spot checks: admin Platform Config UI, pricing preview, service-tier matrix, fee display settings.

**2.6 [CURSOR or ROB]** **Reference + RAG seeds** (recommended before calling Sydney “done”):

- `supabase/universities_campuses_seed.sql`
- **`knowledge_base`** (~26 rows) - **not** in migrations. Depends on **`vector`** (Phase 2.0) and OpenAI embeddings:

  ```bash
  # Point env at Sydney (service role + URL), OPENAI_API_KEY set:
  npm run seed:knowledge
  ```

  Source: `scripts/knowledgeData.json` via `scripts/seedKnowledge.ts`. Verify `select count(*) from public.knowledge_base` ≈ Tokyo baseline (~26).

- Optional demo listings after cutover: `supabase/seed_demo_listings.sql` (requires landlord profile)

---

## Phase 3 - Edge functions + secrets

**3.1 [ROB]** Re-add **custom** Edge secrets on Sydney. **Rotate** any value that may have been exposed (chats, screenshots, logs). Do not copy old secrets by default.

From Tokyo / repo, typically includes (names only - verify against Dashboard):

- `RESEND_API_KEY`
- `DELETE_USER_DOCS_WEBHOOK_SECRET` (must match DB webhook header)
- `GOOGLE_DRIVE_API_KEY` (if used)
- `TPP_*`, `PLATFORM_HEALTH_CRON_SECRET`, `FIREBASE_SERVICE_ACCOUNT_JSON`
- `RESEND_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`, `QASE_INTERNAL_SECRET`
- `STRIPE_*` **only if** Supabase `stripe-webhook` is in use (else Vercel-only)

Do **not** re-add auto-injected `SUPABASE_URL` / `SUPABASE_DB_URL`.

**3.2 [CURSOR]** Deploy functions - prefer repo script (respects `supabase/config.toml` `verify_jwt`):

```bash
npm run supabase:deploy:functions
```

Or deploy each under `supabase/functions/` to `NEW_REF`, including Qase (`qase-triage`, `qase-notify`, `qase-inbound-email`) and `frontend-performance`.

**3.3 [CLAUDE]** Verify functions deployed; secret **names** present (values masked).

---

## Phase 4 - Auth config

**4.1 [ROB]** Authentication → URL configuration:

- Site URL: `https://quni-living.vercel.app` (add `https://quni.com.au` when ready)
- Redirect allowlist: production + preview + `com.quni.living://auth/callback` if needed

**4.2 [ROB]** Google OAuth:

- Re-enter client ID/secret on Sydney
- Google Cloud Console → add `https://NEW_REF.supabase.co/auth/v1/callback`

**4.3 [ROB]** Email templates → paste hosted templates (e.g. confirm signup from `supabase/templates/confirmation.html`).

---

## Phase 5 - Test data

Defer recreating listings until **after** Phase 6 (exercises real forms against Sydney). Optional SQL seeds in Phase 2.6 for reference data only.

---

## Phase 6 - Cutover (one sitting)

**6.1 [CURSOR]** Grep for `flegysnshryzvkwzfclc` and hardcoded `*.supabase.co` URLs. Known files:

- `src/components/qase/QaseSubmitModal.tsx`
- `src/components/qase/QaseAdminCreateModal.tsx`
- `src/pages/admin/QaseTicketDetail.tsx`

Prefer env-based URLs (`VITE_SUPABASE_URL` / dedicated `VITE_SUPABASE_FUNCTIONS_URL`) - show diff before push.

**6.2 [ROB]** Vercel **Production** (and **Preview** if used):

- `VITE_SUPABASE_URL`, `SUPABASE_URL` → `https://NEW_REF.supabase.co`
- `VITE_SUPABASE_ANON_KEY`, `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Then: `npm run env:pull:production` locally; update `.env.local`.

**6.3 [CURSOR]** `npx tsc -b --noEmit`, commit, push `main`.

**6.4 [ROB]** Confirm Vercel deploy green.

---

## Phase 7 - Re-point integrations

**7.1 [ROB]** DocuSeal → Vercel `/api/webhooks/docuseal` (likely unchanged).

**7.2 [ROB]** Resend webhook → new Supabase function URL **only if** it targets Supabase directly.

**7.3 [ROB]** Firebase / push - confirm no hardcoded Tokyo ref.

**7.4 [ROB]** Stripe → confirm live webhook is Vercel, not `NEW_REF.supabase.co`.

**7.5 [ROB]** Database webhook on Sydney: `auth.users` DELETE → `delete-user-documents` + `x-webhook-secret`.

---

## Phase 8 - Verify + smoke test

**8.1 [CLAUDE]** Final parity + security advisor on Sydney.

**8.2 [ROB]** Recreate test listings via app UI.

**8.3 [ROB]** E2E smoke:

- Login / OTP
- `/listings` (first load + repeat - edge cache)
- Messaging + Realtime
- Booking path + contact unlock
- Listing image upload

**8.4 [ROB]** Latency: `node scripts/check-supabase-listings-latency.mjs` - PostgREST warm path should improve vs Tokyo from AU.

**8.5 [ROB]** (Follow-up, within 2 weeks) Privacy / partnership copy for **Australian data hosting** where legally accurate.

---

## Phase 9 - Decommission Tokyo

**9.1 [ROB]** Pause `flegysnshryzvkwzfclc` for a few days, then delete when confident.

---

## Gotchas

- New project = new JWT secret → all sessions invalid (fine pre-launch).
- Every anon/service key changes → Vercel, edge secrets, local env, no half cutover.
- OAuth and edge secrets do **not** migrate automatically.
- Six storage buckets (four manual + `tenancy-documents` policies from baseline) and DB webhooks are manual.
- Enable **`vector`** before `db push` or the knowledge-base migration fails.
- `platform_settings` and full `platform_config` values do **not** come from migrations alone - export/import if counts differ.
- Migrations must replay cleanly - verify before cutover.
- **Edge-cached listings** (`/api/listings-browse`) uses `SUPABASE_URL` on Vercel - updates with Phase 6.

---

## Quick reference - Sydney bootstrap order

1. Create Pro project in `ap-southeast-2` + backup/PITR decision  
2. Enable extensions: **`vector`**, `pg_cron`, `pg_net`  
3. `supabase link` + `db push`  
4. Six storage buckets + storage SQL (incl. `tenancy-documents` policies from baseline)  
5. Config parity: row-count check; export/import Tokyo for `platform_config` / `platform_settings` if needed  
6. `universities_campuses_seed.sql` + `npm run seed:knowledge`  
7. Edge secrets (rotated) + `npm run supabase:deploy:functions`  
8. Auth + OAuth + email templates  
9. DB webhook  
10. Vercel env + code grep + deploy  
11. Smoke test + latency script  
12. Marketing/legal follow-up on data residency  
13. Pause/delete Tokyo  
