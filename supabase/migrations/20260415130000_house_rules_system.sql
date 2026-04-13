-- House rules reference + property junction (mirrors features / property_features).
-- Seeds platform_config house_rules.default; backfills properties.house_rules where null.
-- Platform admin ALL on junction (mirrors admin_rls_policies.sql for property_features).

-- ---------------------------------------------------------------------------
-- house_rules_ref (reference — mirrors features; icon required for seeds)
-- ---------------------------------------------------------------------------
create table if not exists public.house_rules_ref (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null,
  sort_order integer not null default 0,
  constraint house_rules_ref_name_key unique (name)
);

comment on table public.house_rules_ref is
  'Canonical house rule labels; icon is the display glyph (e.g. emoji).';

-- ---------------------------------------------------------------------------
-- property_house_rules (junction — mirrors property_features + permitted flag)
-- ---------------------------------------------------------------------------
create table if not exists public.property_house_rules (
  property_id uuid not null references public.properties (id) on delete cascade,
  rule_id uuid not null references public.house_rules_ref (id) on delete cascade,
  permitted text not null check (permitted in ('yes', 'no', 'approval')),
  primary key (property_id, rule_id)
);

comment on table public.property_house_rules is
  'Per-listing house rule flags: yes, no, or approval required.';

alter table public.house_rules_ref enable row level security;
alter table public.property_house_rules enable row level security;

drop policy if exists "Public can read house_rules_ref" on public.house_rules_ref;
drop policy if exists "Public can read property house rules" on public.property_house_rules;
drop policy if exists "Landlords manage property_house_rules for own listings" on public.property_house_rules;
drop policy if exists "Platform admins manage all property_house_rules" on public.property_house_rules;

-- Reference table: public read
create policy "Public can read house_rules_ref"
  on public.house_rules_ref for select
  using (true);

-- Junction table: public read
create policy "Public can read property house rules"
  on public.property_house_rules for select
  using (true);

-- Junction table: landlord write (ALL) — same shape as property_features
create policy "Landlords manage property_house_rules for own listings"
  on public.property_house_rules for all
  to authenticated
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_house_rules.property_id
        and p.landlord_id in (
          select lp.id from public.landlord_profiles lp where lp.user_id = auth.uid()
        )
    )
  )
  with check (
    exists (
      select 1 from public.properties p
      where p.id = property_house_rules.property_id
        and p.landlord_id in (
          select lp.id from public.landlord_profiles lp where lp.user_id = auth.uid()
        )
    )
  );

-- Platform admins (same pattern as property_features in admin_rls_policies.sql)
create policy "Platform admins manage all property_house_rules"
  on public.property_house_rules for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Seed house_rules_ref (idempotent on name)
-- ---------------------------------------------------------------------------
insert into public.house_rules_ref (name, icon, sort_order)
values
  ('No smoking', '🚭', 10),
  ('Pets', '🐾', 20),
  ('Overnight guests', '👥', 30),
  ('Parties/events', '🎉', 40),
  ('Quiet hours', '🌙', 50),
  ('Parking', '🚗', 60)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Seed platform_config (idempotent on config_key)
-- ---------------------------------------------------------------------------
insert into public.platform_config (config_key, config_value, label, category, is_sensitive, sort_order)
values
  (
    'house_rules.default',
    '',
    'Default house rules template',
    'house_rules',
    false,
    10
  )
on conflict (config_key) do nothing;

-- ---------------------------------------------------------------------------
-- Backfill (after seed): null property text → platform default template value
-- ---------------------------------------------------------------------------
update public.properties p
set house_rules = (
  select pc.config_value
  from public.platform_config pc
  where pc.config_key = 'house_rules.default'
  limit 1
)
where p.house_rules is null;
