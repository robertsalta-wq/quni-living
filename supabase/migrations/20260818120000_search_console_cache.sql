-- Cached Search Console API snapshots (server-side only via service role).
-- Deliberately diverges from Unstash: cache_key + expires_at at write time (12h TTL in app).

create table if not exists public.search_console_cache (
  cache_key   text primary key,
  payload     jsonb        not null,
  fetched_at  timestamptz  not null default now(),
  expires_at  timestamptz  not null
);

create index if not exists search_console_cache_expires_at_idx
  on public.search_console_cache (expires_at);

alter table public.search_console_cache enable row level security;
-- No policies: this table is server-only. The API uses the service-role
-- client, which bypasses RLS. Anon/authenticated must never read it.
