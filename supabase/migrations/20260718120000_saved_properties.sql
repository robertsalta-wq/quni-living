-- Saved properties (favourites) for renters.
-- Target: Quni-Living-AU (cqakltqzqrxnmxfbqatx).
-- Rob applies this migration to prod before deploying app code that inserts into saved_properties.

create table if not exists public.saved_properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, property_id)
);

comment on table public.saved_properties is
  'Renter favourites; client inserts omit user_id so default auth.uid() applies.';

create index if not exists saved_properties_user_created_at_idx
  on public.saved_properties (user_id, created_at desc);

alter table public.saved_properties enable row level security;

drop policy if exists "Users select own saved properties" on public.saved_properties;
create policy "Users select own saved properties"
  on public.saved_properties for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users insert own saved properties" on public.saved_properties;
create policy "Users insert own saved properties"
  on public.saved_properties for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own saved properties" on public.saved_properties;
create policy "Users delete own saved properties"
  on public.saved_properties for delete
  to authenticated
  using (auth.uid() = user_id);
