/*
 * device_tokens — Push notification device token storage
 *
 * What it does:
 *   Stores one row per (user, device token, platform) for FCM/APNs tokens registered from
 *   the Capacitor `@capacitor/push-notifications` app. Lets your backend target pushes per user/device.
 *
 * How to apply:
 *   - CLI (linked project): `supabase db push`
 *   - Or: Supabase dashboard → SQL Editor → paste this file → Run
 *
 * Security:
 *   Row Level Security (RLS) is enabled. Policies restrict SELECT/INSERT/UPDATE/DELETE so
 *   authenticated users can only read and write rows where user_id = auth.uid().
 */

create table if not exists public.device_tokens (
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null,
  updated_at timestamptz not null default now(),
  constraint device_tokens_platform_check check (platform in ('ios', 'android'))
);

create unique index if not exists device_tokens_user_id_token_platform_key
  on public.device_tokens (user_id, token, platform);

alter table public.device_tokens enable row level security;

-- Users can read only their own tokens.
create policy "device_tokens_select_own"
  on public.device_tokens for select
  using (
    auth.uid() is not null
    and user_id = auth.uid()
  );

-- Users can insert their own tokens.
create policy "device_tokens_insert_own"
  on public.device_tokens for insert
  with check (
    auth.uid() is not null
    and user_id = auth.uid()
  );

-- Users can update their own tokens (covers `upsert`).
create policy "device_tokens_update_own"
  on public.device_tokens for update
  using (
    auth.uid() is not null
    and user_id = auth.uid()
  )
  with check (
    auth.uid() is not null
    and user_id = auth.uid()
  );

-- Users can delete their own tokens.
create policy "device_tokens_delete_own"
  on public.device_tokens for delete
  using (
    auth.uid() is not null
    and user_id = auth.uid()
  );

