# Listings browse performance

## Architecture

| Path | When |
|------|------|
| `GET /api/listings-browse` (Vercel Edge, 60s CDN cache) | Browser, default filters (no `near_lat` / `near_lon`) |
| Direct Supabase PostgREST | Fallback if edge fails; distance (`near_*`) search |

Client: `fetchListingsBrowse` → `fetchListingsBrowseViaEdge` → `/api/listings-browse`.

## Latency check

```bash
node scripts/check-supabase-listings-latency.mjs
```

Compares:

- 3× direct PostgREST (same query as the app)
- 2× Vercel edge API (2nd request often faster when CDN-cached)

**Region (verified via Supabase CLI, May 2026):** production project `flegysnshryzvkwzfclc` (**Quni-Living**) is **Northeast Asia (Tokyo)**.

For Australian users that adds roughly **100–200ms+ RTT** per request vs **ap-southeast-2 (Sydney)**. Frontend optimisations help, but **moving the Supabase project to Sydney** (new project + migration) is the largest infra win for perceived speed.

Measured from this environment (May 2026):

| Path | Typical time |
|------|----------------|
| PostgREST direct (cold) | ~2.3s |
| PostgREST direct (warm) | ~400–500ms |
| `/api/listings-browse` (after deploy, CDN hit) | target &lt;100ms |

## EXPLAIN

Run in Supabase SQL Editor (see script output for dated query). Look for:

- `Seq Scan` on `properties` at scale → add partial index on active listings
- High execution time on nested embeds → join cost from `landlord_profiles`, `universities`, `campuses`

## Vercel env (production)

Edge route needs (usually already set for other APIs):

- `SUPABASE_URL` or `VITE_SUPABASE_URL`
- `SUPABASE_ANON_KEY` or `VITE_SUPABASE_ANON_KEY`
