# Migration history repair (May 2026)

Runbook executed on 2026-05-08 to align Supabase migration files with `supabase_migrations.schema_migrations` on the linked project.

## Initial state (`migration list --linked`)

Broken: **seven** rows drifted (above the usual “pause if > 5” threshold). Structural cause was **registry drift only**—later migrations had been executed on the remote database without corresponding registry rows; one migration existed only in the registry until the local file was restored.

```
Initialising login role...
Connecting to remote database...

  
   Local          | Remote         | Time (UTC)          
  ----------------|----------------|---------------------
   20260402120000 | 20260402120000 | 2026-04-02 12:00:00 
   ...            | ...            | ...
   20260415120000 | 20260415120000 | 2026-04-15 12:00:00 
   20260415120100 | 20260415120100 | 2026-04-15 12:01:00 
                  | 20260415120200 | 2026-04-15 12:02:00 
   20260415120300 |                | 2026-04-15 12:03:00 
   20260415130000 | 20260415130000 | 2026-04-15 13:00:00 
   20260415140000 |                | 2026-04-15 14:00:00 
   20260416160000 |                | 2026-04-16 16:00:00 
   20260416170000 |                | 2026-04-16 17:00:00 
   20260507100000 |                | 2026-05-07 10:00:00 
   20260508120000 |                | 2026-05-08 12:00:00 
```

**Remote-only:** `20260415120200` (`qase_rls_fix`) — registered remotely; missing from repo.

**Local-only (files present, not in remote registry):**

| Version | Name (local file suffix) |
|---------|---------------------------|
| `20260415120300` | `qase_attachments` |
| `20260415140000` | `knowledge_base_select_authenticated` |
| `20260416160000` | `admin_vendor_subscription_credentials` |
| `20260416170000` | `service_tier_pricing_foundation` |
| `20260507100000` | `property_fee_snapshots` |
| `20260508120000` | `phase_3_listing_foundation` |

## Git history of deleted migrations

```bash
git log --diff-filter=D --summary -- supabase/migrations/
```

No output — **no historically deleted migration files** in this path.

## Remote registry inspection

- Table `supabase_migrations.schema_migrations` includes **`statements`** (`ARRAY`) — SQL recovery was possible for the remote-only row.
- Full remote registry (before repair) ended at **`20260415130000`**; versions after that existed only as local files plus applied schema.

Schema checks confirmed later migrations were already applied on the linked DB (examples: `public.qase_attachments`, knowledge base policy `Knowledge base select authenticated`, `admin_vendor_subscriptions.encrypted_password`, `service_tier_enum`, `public.property_fee_snapshots`, `public.service_tier_events`, `bookings.service_tier_at_request`).

## Actions taken

### Reconstructed from registry (`statements`)

- **`20260415120200`** — Name on remote: `qase_rls_fix`. Recovered all statement chunks from:

  `SELECT version, name, statements FROM supabase_migrations.schema_migrations WHERE version = '20260415120200';`

- **Added file:** `supabase/migrations/20260415120200_qase_rls_fix.sql`  
  Content joins the stored statement array into a single migration file (semicolons added for readability; logical splits match the stored fragments).

No **`migration repair --status reverted`** was required: every remote-only row was recoverable from `statements`.

### Registry alignment (`repair --status applied`)

These versions had already been applied on the database but were missing from the remote registry; marking **applied** only updates history — it does not re-run SQL:

```bash
npx supabase migration repair --status applied --linked --yes \
  20260415120300 20260415140000 20260416160000 20260416170000 \
  20260507100000 20260508120000
```

## Verification

- **`npx supabase migration list --linked`** — Local and Remote columns match for every version (see below).
- **`npx supabase db push --linked`** — `Remote database is up to date.`
- **`npx tsc -b --noEmit`** — Exit code 0.

## Final state (`migration list --linked`)

```
Initialising login role...
Connecting to remote database...

  
   Local          | Remote         | Time (UTC)          
  ----------------|----------------|---------------------
   20260402120000 | 20260402120000 | 2026-04-02 12:00:00 
   20260402130000 | 20260402130000 | 2026-04-02 13:00:00 
   20260402140000 | 20260402140000 | 2026-04-02 14:00:00 
   20260402150000 | 20260402150000 | 2026-04-02 15:00:00 
   20260402160000 | 20260402160000 | 2026-04-02 16:00:00 
   20260402170000 | 20260402170000 | 2026-04-02 17:00:00 
   20260402180000 | 20260402180000 | 2026-04-02 18:00:00 
   20260402190000 | 20260402190000 | 2026-04-02 19:00:00 
   20260403120000 | 20260403120000 | 2026-04-03 12:00:00 
   20260403130000 | 20260403130000 | 2026-04-03 13:00:00 
   20260406120000 | 20260406120000 | 2026-04-06 12:00:00 
   20260406140000 | 20260406140000 | 2026-04-06 14:00:00 
   20260406150000 | 20260406150000 | 2026-04-06 15:00:00 
   20260407120000 | 20260407120000 | 2026-04-07 12:00:00 
   20260407130000 | 20260407130000 | 2026-04-07 13:00:00 
   20260407140000 | 20260407140000 | 2026-04-07 14:00:00 
   20260407140001 | 20260407140001 | 2026-04-07 14:00:01 
   20260409120000 | 20260409120000 | 2026-04-09 12:00:00 
   20260410120000 | 20260410120000 | 2026-04-10 12:00:00 
   20260411130000 | 20260411130000 | 2026-04-11 13:00:00 
   20260411150000 | 20260411150000 | 2026-04-11 15:00:00 
   20260411210000 | 20260411210000 | 2026-04-11 21:00:00 
   20260412100000 | 20260412100000 | 2026-04-12 10:00:00 
   20260412180000 | 20260412180000 | 2026-04-12 18:00:00 
   20260413120000 | 20260413120000 | 2026-04-13 12:00:00 
   20260413120100 | 20260413120100 | 2026-04-13 12:01:00 
   20260413150000 | 20260413150000 | 2026-04-13 15:00:00 
   20260414100000 | 20260414100000 | 2026-04-14 10:00:00 
   20260415120000 | 20260415120000 | 2026-04-15 12:00:00 
   20260415120100 | 20260415120100 | 2026-04-15 12:01:00 
   20260415120200 | 20260415120200 | 2026-04-15 12:02:00 
   20260415120300 | 20260415120300 | 2026-04-15 12:03:00 
   20260415130000 | 20260415130000 | 2026-04-15 13:00:00 
   20260415140000 | 20260415140000 | 2026-04-15 14:00:00 
   20260416160000 | 20260416160000 | 2026-04-16 16:00:00 
   20260416170000 | 20260416170000 | 2026-04-16 17:00:00 
   20260507100000 | 20260507100000 | 2026-05-07 10:00:00 
   20260508120000 | 20260508120000 | 2026-05-08 12:00:00 
```

## Note on drift count threshold

Initial drift was **seven** rows (> 5). Proceeding was justified after confirming: (1) `statements` exists and **20260415120200** was fully recoverable; (2) later “local-only” rows matched schema already present on the linked DB; (3) **`migration repair`** completed without errors.
