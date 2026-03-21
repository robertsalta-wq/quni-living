# Supabase (Quni Living)

Schema file: **`quni_supabase_schema.sql`** — matches the Claude/Wix-style model (separate `landlord_profiles` / `student_profiles`, `features`, `rent_per_week`, `images[]`, NSW-style address fields, etc.).

## Tables (9)

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

There is **no** `saved_properties` table in this version (add later if you want favourites).

## 1. Run the SQL

Dashboard → **SQL Editor** → paste `quni_supabase_schema.sql` → Run.

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

## Property enquiries + EmailJS

The listing page **Send an enquiry** form inserts into **`enquiries`** (policy: anyone can insert) and sends two emails via **EmailJS**.

Set in `.env.local` / Vercel:

- `VITE_EMAILJS_SERVICE_ID` — from **[Email Services](https://dashboard.emailjs.com/admin)** (the connected provider, e.g. Gmail), **not** from templates. ID usually looks like `service_xxxxxxx`.
- `VITE_EMAILJS_PUBLIC_KEY` — [Account](https://dashboard.emailjs.com/admin/account) → **Public Key** (must be from the **same** EmailJS account as the service and templates).
- `VITE_EMAILJS_ENQUIRY_CONFIRMATION_TEMPLATE_ID` — from **Email Templates** → template ID like `template_xxxxxxx`.
- `VITE_EMAILJS_ENQUIRY_NOTIFY_TEMPLATE_ID` — second template for internal notification.

### EmailJS: “The recipients address is empty”

EmailJS needs a **To Email** on **each** template (not only the message body). If that field is blank, sending fails.

1. Open [Email Templates](https://dashboard.emailjs.com/admin) → edit **confirmation** template.
2. Find **To Email** (or **Recipients** / **Send To**). Set it to **`{{to_email}}`** (or `{{email}}` / `{{user_email}}` — see table below).
3. Edit **notify** template → set **To Email** to **`hello@quni.com.au`** (static is fine), or **`{{notify_to}}`**, **`{{to_email}}`**, or **`{{admin_email}}`** on the notify template only.

Save both templates. No code deploy required for template-only fixes.

### “The service ID not found” (EmailJS)

That response means `VITE_EMAILJS_SERVICE_ID` does not match any **Email Service** under the account for your **Public Key**. Typical fixes:

1. Open [Email Services](https://dashboard.emailjs.com/admin) and **add** a service (Gmail, Outlook, etc.) if you only created templates so far.
2. Copy the **Service ID** from that row (not the Template ID).
3. Confirm `VITE_EMAILJS_PUBLIC_KEY` is the public key from the **same** EmailJS login.
4. Remove accidental spaces/quotes in Vercel; **redeploy** after changing any `VITE_*` variable.

**Template parameters sent by the app**

| Parameter | Confirmation (→ sender’s inbox) | Notify (→ Quni) |
|-----------|--------------------------------|-----------------|
| `property_title`, `message` | ✓ | ✓ |
| `to_name`, `reply_to`, `from_name`, `from_email` | ✓ | |
| `to_email`, `email`, `user_email`, `recipient_email` | **sender’s email** (use one in **To Email**) | **hello@quni.com.au** (notify template only) |
| `sender_name`, `sender_email` | | ✓ |
| `notify_to`, `to_email`, `admin_email`, `recipient_email` | | ✓ (all set to `hello@quni.com.au` on notify template) |

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
