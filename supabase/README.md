# Supabase (Quni Living)

Schema file: **`quni_supabase_schema.sql`** — matches the Claude/Wix-style model (separate `landlord_profiles` / `student_profiles`, `features`, `rent_per_week`, `images[]`, NSW-style address fields, etc.).

## Tables (10+)

| Table | Purpose |
|--------|---------|
| `universities` | Reference data + seeds (5 Sydney unis) |
| `campuses` | Optional; linked to `universities` |
| `features` | Amenity tags + seeds (15 rows) |
| `landlord_profiles` | 1:1 with `auth.users` (`user_id` unique) |
| `student_profiles` | 1:1 with `auth.users` (`user_id` unique) |
| `properties` | Listings (`rent_per_week`, `room_type`, `images`, …) |
| `property_features` | Property ↔ feature junction |
| `bookings` | Student ↔ property bookings |
| `enquiries` | Messages (anonymous insert allowed for “contact” forms) |
| `landlord_leads` | Landlord partnerships page lead form (public insert; admin read — run **`landlord_leads.sql`** then re-run **`admin_rls_policies.sql`** for `Platform admins select all landlord_leads`) |

There is **no** `saved_properties` table in this version (add later if you want favourites).

## Phase D — Supabase CLI (linked project, functions, secrets, migrations)

Use this after [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) is installed (`npx supabase@latest` works without a global install). From the repo root, run `supabase login` once per machine, then `supabase link --project-ref <REF>` if this checkout is not linked yet.

### D1 — Confirm linked project matches production

1. `npx supabase@latest projects list` — the **LINKED** column (●) must be the project your app uses in production.
2. Compare **REFERENCE ID** to production: `VITE_SUPABASE_URL` in Vercel **Production** (or your host) must be `https://<REFERENCE_ID>.supabase.co`.
3. After `supabase link`, the ref is also stored under `supabase/.temp/project-ref` (verify it matches production if that file exists).

If the wrong project is linked: `supabase link --project-ref <production_ref>`.

### D2 — Deploy Edge Functions

Deploy every function in `supabase/functions/` after code or `config.toml` changes:

```bash
npx supabase@latest functions deploy send-uni-otp
npx supabase@latest functions deploy verify-uni-otp
npx supabase@latest functions deploy send-work-otp
npx supabase@latest functions deploy verify-work-otp
npx supabase@latest functions deploy delete-student-account --no-verify-jwt
npx supabase@latest functions deploy delete-user-documents --no-verify-jwt
npx supabase@latest functions deploy stripe-webhook --no-verify-jwt
```

Shortcut (same commands):

```bash
npm run supabase:deploy:functions
```

`supabase/config.toml` sets **`verify_jwt = false`** for the OTP and delete functions so the gateway does not return **Invalid JWT** before your handler runs; auth is enforced inside each function. **`--no-verify-jwt`** on deploy keeps the hosted setting aligned when the CLI applies flags. Redeploy after editing `config.toml` so changes take effect.

### D3 — Secrets (hosted project, not committed)

Run locally after login + link. Do **not** commit values.

| Secret | When needed |
|--------|-------------|
| `RESEND_API_KEY` | OTP email (`send-*-otp` functions) |
| `DELETE_USER_DOCS_WEBHOOK_SECRET` | `delete-user-documents` (must match Database Webhook header `x-webhook-secret`) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Only if you use the **Supabase** `stripe-webhook` function (not required if Stripe is handled only on Vercel — see Stripe section below) |

Example (one key at a time or space-separated, depending on CLI version):

```bash
npx supabase@latest secrets set RESEND_API_KEY=re_xxxxxxxx
```

Supabase injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for Edge Functions automatically; you do not set those via `secrets set`.

### D4 — Migrations workflow (single repeatable path)

**Canonical path:** versioned files under **`supabase/migrations/`** (timestamp prefix, e.g. `20260403120000_name.sql`) + apply to the linked remote with:

```bash
npx supabase@latest db push
```

Use this for anything that must stay in git, deploy to production predictably, and match other environments. Commit the migration file in the same PR as any app change that depends on it.

**SQL Editor (dashboard)** is for **one-off** or **legacy** steps: running ad-hoc scripts from `supabase/*.sql` that are not yet represented as migrations, or emergency hotfixes. If a dashboard edit must be permanent, follow up with a migration (or `supabase db diff`) so the repo stays the source of truth.

Do **not** mix ad-hoc Editor changes and `db push` without reconciling: prefer adding a migration file for repeatable schema changes.

## 1. Run the SQL

Dashboard → **SQL Editor** → paste `quni_supabase_schema.sql` → Run.

### Admin dashboard (`/admin`)

The in-app admin panel reads and updates bookings, enquiries, properties, and landlord verification. After the main schema, run **`admin_rls_policies.sql`** in SQL Editor. It adds `is_platform_admin()` (same emails as `src/lib/adminEmails.ts`) and RLS policies so those accounts can use the dashboard with the **anon** browser client. Without it, admin pages will show permission errors.

**Re-run `admin_rls_policies.sql` after updates** when the repo adds new admin policies (e.g. inserting properties or managing `property_features` from `/landlord/property/new` as an admin).

### Landlord property form (`/landlord/property/new`, edit)

1. Run **`property_form_extend.sql`** if you need **linen supplied** and **weekly cleaning service** booleans on `properties` (matches the app types).
2. Storage → create a **public** bucket **`property-images`**, then run **`storage_property_images.sql`** so authenticated users can upload under `property-images/{their_user_id}/…`.

### Landlord dashboard (mark enquiries read)

Run **`landlord_enquiries_update_rls.sql`** so landlords can update enquiry rows (e.g. `new` → `read`) from `/landlord-dashboard`.

**If onboarding errors with** `Could not find the table 'public.landlord_profiles' in the schema cache`, your project never had the profile tables. Run **`profile_tables_bootstrap.sql`** first (minimal: `universities`, `landlord_profiles`, `student_profiles` + RLS), then retry.

**If Listings shows an error** about missing `properties` (or “schema cache”), run the full **`quni_supabase_schema.sql`** in SQL Editor. The bootstrap file does **not** create `properties`, `features`, `bookings`, etc. The full script uses `create table if not exists` and idempotent policy drops, so it’s safe to run after the bootstrap.

If you **already applied the older Quni schema** (single `profiles`, `price_per_week`, etc.), use a **fresh Supabase project** or manually drop conflicting tables before running this script.

## Landlord profile (extra columns + profile photo upload)

If your project was created before these columns existed, run **`landlord_profile_extend.sql`** in SQL Editor (adds `first_name`, `last_name`, `company_name`, `abn`, `landlord_type`, and address fields `address`, `suburb`, `state`, `postcode` on `landlord_profiles`).

For **a photo of yourself** on the landlord profile:

1. Storage → create a **public** bucket named **`landlord-avatars`** (legacy id; stores profile photos).
2. Run **`storage_landlord_profile_photos.sql`** in SQL Editor (RLS: upload/read under `landlord-avatars/{their_user_id}/`).

## Student profile (extra columns + profile photo upload)

If your project was created before these columns existed, run **`student_profile_extend.sql`** in SQL Editor (adds `first_name`, `last_name`, `gender`, `nationality`, `campus_id`, `student_type`, `room_type_preference`, budget fields, emergency contacts, `is_smoker`, `date_of_birth`; ensures **`campuses`** exists with public read RLS).

For **a photo of yourself** on the student profile:

1. Storage → create a **public** bucket named **`student-avatars`** (legacy id; stores profile photos).
2. Run **`storage_student_profile_photos.sql`** in SQL Editor.

### Student verification tab (`/student-profile` → Verification)

Run **`student_verification.sql`** in SQL Editor. It adds `uni_email` / document columns on **`student_profiles`**, creates **`verification_otps`** with a **unique index on `user_id`** (one active code per account), creates the **private** Storage bucket **`student-documents`**, and RLS so students read/write only under `{their_user_id}/…` while platform admin emails (same as `admin_rls_policies.sql`) can read all objects in that bucket.

If your project already had **`verification_otps`** from an older run **without** that unique index, run **`verification_otps_one_per_user.sql`** once (dedupes rows + creates the index) so **`send-uni-otp`** upserts correctly.

Deploy Edge Functions and set **`RESEND_API_KEY`** in Supabase (Dashboard → Edge Functions → Secrets, or `supabase secrets set RESEND_API_KEY=re_...`). See **Phase D** above for the full deploy list and `npm run supabase:deploy:functions`.

```bash
npx supabase@latest functions deploy send-uni-otp
npx supabase@latest functions deploy verify-uni-otp
npx supabase@latest functions deploy send-work-otp
npx supabase@latest functions deploy verify-work-otp
```

OTP email sends **From** **`noreply@quni.com.au`** (same as booking emails) with **Reply-To** **`hello@quni.com.au`** — verify **quni.com.au** in Resend so both addresses are allowed.

`supabase/config.toml` sets **`verify_jwt = false`** for `send-uni-otp`, `verify-uni-otp`, `send-work-otp`, and `verify-work-otp` so the API gateway does not reject valid sessions as **“Invalid JWT”** (auth is still enforced inside each function with `getUser()`). Redeploy with the CLI so this applies. If you deploy only from the Dashboard, turn off **Verify JWT** for those functions there instead.

### Student account deletion (`/student-profile` → Delete account)

The app removes objects under **`student-documents/{user_id}/`** before deleting the auth user, and a **Database Webhook** can call a second Edge Function as a safety net if anything remains.

Deploy:

```bash
supabase functions deploy delete-student-account --no-verify-jwt
supabase functions deploy delete-user-documents --no-verify-jwt
```

`supabase/config.toml` sets **`verify_jwt = false`** for both (same pattern as OTP functions). **`delete-student-account`** still requires a valid user JWT in `Authorization` and only allows users who have a **`student_profiles`** row.

**Database Webhook (safety net)** — Dashboard → **Database** → **Webhooks** → **Create**:

1. **Table**: `users` in schema **`auth`**, event **DELETE** only.  
2. **URL**: `https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/delete-user-documents`  
3. **HTTP Headers**: add **`x-webhook-secret`** with a long random value.  
4. Supabase → Edge Functions → **Secrets**: **`DELETE_USER_DOCS_WEBHOOK_SECRET`** = the same value (the function rejects requests if the header does not match).

## Listings show “No listings found”

That’s normal when **`properties`** has no rows. Either:

- Use the app as a **Landlord** and add a property via your property form / flow, or  
- Run **`seed_demo_listings.sql`** in SQL Editor (adds **5 demo listings with Unsplash photo URLs** in `images[]`, **only if** at least one **`landlord_profiles`** row exists). To re-seed after an older run: `DELETE FROM public.properties WHERE slug LIKE 'demo-%';` then run the script again.

## Cloudflare Turnstile (enquiry + booking forms)

Forms call **`POST /api/verify-turnstile`** on Vercel (see repo `api/verify-turnstile.js`).

| Variable | Where |
|----------|--------|
| `VITE_TURNSTILE_SITE_KEY` | Vercel + `.env.local` (public site key) |
| `TURNSTILE_SECRET_KEY` | **Vercel only** (server secret — never `VITE_*`) |

**Local `npm run dev`:** the browser cannot reach `/api/*` unless you run `vercel dev`, or set  
`VITE_TURNSTILE_VERIFY_URL=https://your-deployment.vercel.app/api/verify-turnstile`  
in `.env.local` so verification hits production (OK for testing).

Cloudflare test keys (always pass): [Turnstile docs](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).

## Property enquiries, contact, and landlord leads (Resend)

Transactional and public-form email is sent with **[Resend](https://resend.com/)** from Vercel serverless routes. Configure **`RESEND_API_KEY`** on Vercel (server-only — never `VITE_*`). The app uses `noreply@quni.com.au` as the sender; ensure your domain and sending identity are verified in the Resend dashboard.

**Listing “Send an enquiry”** — inserts into **`enquiries`** (policy: anyone can insert), then calls **`POST /api/enquiry-email`** with a Cloudflare Turnstile token. That route sends two messages: a confirmation to the enquirer and a notification to **hello@quni.com.au** (with Reply-To set to the enquirer where appropriate).

**Landlord partnerships lead form** (`/services/landlord-partnerships`) — inserts into **`landlord_leads`**, then **`POST /api/landlord-lead-email`** (Turnstile + Resend notify to **hello@quni.com.au**).

**Contact page** — **`POST /api/contact`** (Turnstile + Resend to **hello@quni.com.au**).

Other booking-related notifications also use Resend from **`api/`** routes; see **`.env.example`** and **`docs/vercel-env-setup.md`** for the full variable list.

Turnstile (**`VITE_TURNSTILE_SITE_KEY`** + **`TURNSTILE_SECRET_KEY`**) is required for the public forms above; see the **Cloudflare Turnstile** section earlier in this file.

## Google OAuth on localhost

The app sends users back to **`{origin}/auth/callback`** (see `src/lib/oauth.ts`). That URL must be allowed in Supabase or the session exchange fails after Google.

1. **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, add (match how you open the app — `localhost` and `127.0.0.1` are different origins):
   - `http://localhost:5173/auth/callback`
   - `http://127.0.0.1:5173/auth/callback` (optional but useful if you use this URL)
3. Save. **Restart** `npm run dev` if you changed `.env.local`.

**Vercel works but localhost does not?** Production is already on the allow list; you still must add the `http://localhost:5173/auth/callback` entry above.

**Google Cloud Console** (only if Google sign-in is broken everywhere): the OAuth client Supabase uses must list  
`https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback`  
as an **Authorized redirect URI**. Supabase usually documents this when you enable the Google provider.

## Stripe Connect + weekly rent (subscriptions)

1. Run **`stripe_connect_foundation.sql`** in SQL Editor (adds Stripe id columns + `stripe_webhook_events`).

### Webhooks — pick one (no global Supabase CLI required)

**A — Vercel (recommended if you deploy on Vercel)**  
- Add env vars in Vercel (not in `VITE_*`): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, **`SUPABASE_ANON_KEY`** (same publishable/anon key as `VITE_SUPABASE_ANON_KEY` — used to verify the user JWT on `/api/create-connect-account-link`).  
- Optional: `SITE_URL` or `PUBLIC_SITE_URL` if Stripe return URLs must not rely on the incoming request host (defaults to request origin).  
- After deploy, set Stripe Dashboard → Webhooks → `https://YOUR_DOMAIN/api/stripe-webhook` (same logic as `supabase/functions/stripe-webhook/index.ts`).  
- Subscribe to **`account.updated`** as well as subscription events so landlord Connect status (`stripe_charges_enabled`, etc.) stays in sync.  
- Landlord dashboard → **Connect your bank account** calls `POST /api/create-connect-account-link` with the Supabase session token.  
- Students → **Save a card for rent** (profile or dashboard) calls `POST /api/student-stripe-payment-setup` — creates a Stripe Customer (`student_profiles.stripe_customer_id`) and opens Checkout in **setup** mode to attach a card.  
- Vercel matches `/api/*` serverless routes before SPA rewrites.

**B — Supabase Edge Function**  
- **Without installing the CLI globally:** `npx supabase@latest login` then `npx supabase@latest functions deploy stripe-webhook --no-verify-jwt` (or use [Docker](https://supabase.com/docs/guides/cli/getting-started#installing-the-supabase-cli): `docker run` with the CLI image).  
- `supabase secrets set STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=...`

Optional in `.env.local` for future Stripe.js: `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...`

Do **not** put `SUPABASE_SERVICE_ROLE_KEY` or Stripe secrets in Vite env.

## 2. Env

`.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 3. Auth → profiles

`handle_new_user` creates **`student_profiles`** by default, or **`landlord_profiles`** if signup metadata includes `"role": "landlord"` (set via Supabase Auth `signUp` options / Wix-style flows).

## 4. Types

`src/lib/database.types.ts` matches this SQL. Regenerate after DB changes:

```bash
npx supabase gen types typescript --project-id <YOUR_PROJECT_REF> > src/lib/database.types.ts
```
