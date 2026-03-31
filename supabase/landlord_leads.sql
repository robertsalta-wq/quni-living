-- Landlord partnership lead capture (public insert; admins read in dashboard / SQL).
-- Run in Supabase SQL Editor after quni_supabase_schema.sql.
-- Also run admin_rls_policies.sql (or re-run the landlord_leads block there) for admin SELECT.

create table if not exists public.landlord_leads (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  phone text not null,
  suburb text not null,
  property_count text not null,
  message text,
  created_at timestamptz not null default now()
);

alter table public.landlord_leads enable row level security;

drop policy if exists "Anyone can submit a landlord lead" on public.landlord_leads;
create policy "Anyone can submit a landlord lead"
  on public.landlord_leads for insert
  with check (true);
