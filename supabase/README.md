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

If you **already applied the older Quni schema** (single `profiles`, `price_per_week`, etc.), use a **fresh Supabase project** or manually drop conflicting tables before running this script.

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
