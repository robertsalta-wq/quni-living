# AGENTS.md

## Cursor Cloud specific instructions

Quni Living is a single product (AU student/renter housing marketplace) shipped from one repo as a React 19 + Vite 8 SPA, Vercel serverless functions under `/api`, and Capacitor native wrappers. Supabase (Postgres/Auth/Storage) is the backend. Standard scripts live in `package.json` (`dev`, `dev:vercel`, `build`, `lint`, `test`, `test:e2e`); env layout is documented in `.env.example` and `docs/vercel-env-setup.md`. The update script only runs `npm install`.

### Services

| Service | How to run | Notes |
|---------|-----------|-------|
| Frontend (Vite) | `npm run dev` | Serves on `http://localhost:5173`; `strictPort` is on, so the port must be free. `/api/*` routes are NOT served in this mode. |
| Full stack (frontend + `/api`) | `npm run dev:vercel` | Runs `vercel dev`; needs Vercel login + pulled env (`npm run env:pull`) or keys in `.env.local`. |
| Supabase (Auth/DB/Storage) | local via `supabase start`, or hosted | See the local-Supabase caveat below. |

### Non-obvious caveats

- **Supabase env is required for the app to be useful.** Put `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` (gitignored). Without them the SPA still renders but Supabase-gated features are disabled via `isSupabaseConfigured` (see `src/lib/supabase.ts`, which falls back to placeholder credentials).
- **`supabase start` / `supabase db reset` cannot build a DB from scratch.** The migrations in `supabase/migrations` are incremental on top of a pre-existing production schema — the earliest migration uses `public.is_platform_admin()`, which is only created by a much later migration (`20260526120000_platform_staff.sql`). Applying from empty fails with `function public.is_platform_admin() does not exist`. For local **auth-only** work (e.g. signup/login), temporarily move `supabase/migrations` aside before `supabase start`, then restore it (the DB persists in the Docker volume). Full local DB dev needs a base-schema dump (not in the repo) or a hosted Supabase project.
- **Local Supabase auto-confirms signups** (no `enable_confirmations` in `supabase/config.toml`), so email signup returns a session immediately. Local auth emails land in Mailpit/Inbucket at `http://127.0.0.1:54324`.
- **Docker is not running at session start.** Before `supabase start` (or any Docker use): run `sudo dockerd` in the background and `sudo chmod 666 /var/run/docker.sock`. Docker 29 here is configured (in `/etc/docker/daemon.json`) for `fuse-overlayfs` with the containerd snapshotter disabled, plus `iptables-legacy`; keep that config.
- **Tests:** the `*.raster.test.ts` PDF tests require `pdftoppm` (poppler-utils). Beyond those, ~11 unit tests currently fail on `main` for reasons unrelated to the environment (assertion mismatches), and `npm run lint` is not clean on `main` (many pre-existing errors) — treat these as pre-existing, not regressions you introduced.
- **Production Supabase is read-only for agents** (see `.cursor/rules/supabase-prod-readonly.mdc`): never run writes, migrations, or `db push` against prod.
