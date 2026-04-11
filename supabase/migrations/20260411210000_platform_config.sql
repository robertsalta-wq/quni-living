-- platform_config — Quni business / bank / compliance / document defaults (admin-editable).
-- RLS: public.is_platform_admin() — requires supabase/admin_rls_policies.sql.
-- Audit: app writes to pricing_change_log with tier = null; redact sensitive values in the client.

create table if not exists public.platform_config (
  id uuid primary key default gen_random_uuid(),
  config_key text not null,
  config_value text not null default '',
  label text not null,
  category text not null,
  is_sensitive boolean not null default false,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by text null,
  constraint platform_config_config_key_key unique (config_key)
);

comment on table public.platform_config is
  'Platform-wide business settings for admin UI and document generation; separate from platform_settings.';

create index if not exists platform_config_category_sort_idx
  on public.platform_config (category, sort_order);

drop trigger if exists platform_config_updated_at on public.platform_config;
create trigger platform_config_updated_at
  before update on public.platform_config
  for each row execute function public.set_updated_at();

alter table public.platform_config enable row level security;

drop policy if exists "Platform admins select platform_config" on public.platform_config;
drop policy if exists "Platform admins insert platform_config" on public.platform_config;
drop policy if exists "Platform admins update platform_config" on public.platform_config;
drop policy if exists "Platform admins delete platform_config" on public.platform_config;

create policy "Platform admins select platform_config"
  on public.platform_config for select
  using (public.is_platform_admin());

create policy "Platform admins insert platform_config"
  on public.platform_config for insert
  with check (public.is_platform_admin());

create policy "Platform admins update platform_config"
  on public.platform_config for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "Platform admins delete platform_config"
  on public.platform_config for delete
  using (public.is_platform_admin());

-- Seed: business + bank only (no payments category — UI omits until rows exist).
insert into public.platform_config (config_key, config_value, label, category, is_sensitive, sort_order)
values
  ('business.legal_name', '', 'Legal entity name', 'business', false, 10),
  ('business.trading_name', '', 'Trading name', 'business', false, 20),
  ('business.abn', '', 'ABN', 'business', false, 30),
  ('business.contact_email', '', 'Contact email', 'business', false, 40),
  ('business.contact_phone', '', 'Contact phone', 'business', false, 50),
  ('business.gst_registered', 'false', 'GST registered', 'business', false, 60),
  ('business.gst_rate', '', 'GST rate (%)', 'business', false, 70),
  ('business.gst_registration_date', '', 'GST registration date (YYYY-MM-DD)', 'business', false, 80),
  ('bank.account_name', '', 'Account name', 'bank', true, 10),
  ('bank.bsb', '', 'BSB', 'bank', true, 20),
  ('bank.account_number', '', 'Account number', 'bank', true, 30)
on conflict (config_key) do nothing;
