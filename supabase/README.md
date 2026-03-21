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

## Landlord profile (extra columns + avatar upload)

If your project was created before these columns existed, run **`landlord_profile_extend.sql`** in SQL Editor (adds `first_name`, `last_name`, `company_name`, `abn`, `landlord_type`, and address fields `address`, `suburb`, `state`, `postcode` on `landlord_profiles`).

For **profile photos** in the app:

1. Storage → create a **public** bucket named **`landlord-avatars`**.
2. Run **`storage_landlord_avatars.sql`** in SQL Editor (RLS policies: users upload/read only under `landlord-avatars/{their_user_id}/`).

## Listings show “No listings found”

That’s normal when **`properties`** has no rows. Either:

- Use the app as a **Landlord** and add a property via your property form / flow, or  
- Run **`seed_demo_listings.sql`** in SQL Editor (adds **5 demo listings with Unsplash photo URLs** in `images[]`, **only if** at least one **`landlord_profiles`** row exists). To re-seed after an older run: `DELETE FROM public.properties WHERE slug LIKE 'demo-%';` then run the script again.

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
