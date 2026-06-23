-- Bond weeks model on properties + invite bond overrides.
-- Rob applies in Supabase SQL editor before deploying code that reads these columns.

-- ---------------------------------------------------------------------------
-- properties: weeks / fixed bond config
-- ---------------------------------------------------------------------------
alter table public.properties
  add column if not exists bond_weeks integer,
  add column if not exists bond_is_fixed boolean not null default false,
  add column if not exists bond_fixed_amount numeric(10, 2);

comment on column public.properties.bond_weeks is
  'Bond as weeks of rent (0–4). Null when bond_is_fixed.';
comment on column public.properties.bond_is_fixed is
  'When true, bond_fixed_amount is the bond in AUD (capped at 4× rent).';
comment on column public.properties.bond_fixed_amount is
  'Fixed bond AUD when bond_is_fixed; imported from legacy properties.bond.';

-- Backfill: positive legacy dollar bond → fixed override (do not derive weeks).
update public.properties
set
  bond_is_fixed = true,
  bond_fixed_amount = bond,
  bond_weeks = null
where bond is not null
  and bond > 0;

-- Backfill: null / zero → no bond.
update public.properties
set
  bond_weeks = 0,
  bond_is_fixed = false,
  bond_fixed_amount = null
where bond is null
  or bond <= 0;

alter table public.properties alter column bond_weeks set default 2;

alter table public.properties drop constraint if exists properties_bond_weeks_range_check;
alter table public.properties
  add constraint properties_bond_weeks_range_check
  check (bond_weeks is null or (bond_weeks >= 0 and bond_weeks <= 4));

-- VIC multipliers parked — 4 weeks cap for all live states (NSW, QLD).
create or replace function public.enforce_property_bond_fixed_cap()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.bond_is_fixed, false) and new.bond_fixed_amount is not null then
    if new.rent_per_week is null or new.rent_per_week <= 0 then
      raise exception 'bond_fixed_requires_positive_rent';
    end if;
    if new.bond_fixed_amount > new.rent_per_week * 4 then
      raise exception 'bond_fixed_exceeds_four_week_cap';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists properties_bond_fixed_cap on public.properties;
create trigger properties_bond_fixed_cap
  before insert or update on public.properties
  for each row
  execute function public.enforce_property_bond_fixed_cap();

-- ---------------------------------------------------------------------------
-- tenant_invites: optional bond override at invite
-- ---------------------------------------------------------------------------
alter table public.tenant_invites
  add column if not exists offered_bond_weeks integer,
  add column if not exists offered_bond_fixed numeric(10, 2);

comment on column public.tenant_invites.offered_bond_weeks is
  'Optional bond override as weeks (0–4) for this invite.';
comment on column public.tenant_invites.offered_bond_fixed is
  'Optional fixed bond override (AUD) for this invite.';

-- ---------------------------------------------------------------------------
-- resolve_tenant_invite: expose bond offer fields
-- ---------------------------------------------------------------------------
drop function if exists public.resolve_tenant_invite(text);

create or replace function public.resolve_tenant_invite(p_token text)
returns table (
  property_id uuid,
  property_slug text,
  student_only boolean,
  invite_status text,
  invited_email text,
  invited_name text,
  offered_weekly_rent numeric,
  offer_reason text,
  offered_bond_weeks integer,
  offered_bond_fixed numeric
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  inv public.tenant_invites%rowtype;
  prop public.properties%rowtype;
begin
  if p_token is null or length(trim(p_token)) < 16 then
    return query
    select null::uuid, null::text, null::boolean, 'invalid'::text,
      null::text, null::text, null::numeric, null::text, null::integer, null::numeric;
    return;
  end if;

  v_hash := encode(digest(trim(p_token), 'sha256'::text), 'hex');

  select * into inv
  from public.tenant_invites ti
  where ti.token_hash = v_hash
  limit 1;

  if not found then
    return query
    select null::uuid, null::text, null::boolean, 'invalid'::text,
      null::text, null::text, null::numeric, null::text, null::integer, null::numeric;
    return;
  end if;

  if inv.status = 'pending' and inv.expires_at < now() then
    update public.tenant_invites
    set status = 'expired', updated_at = now()
    where id = inv.id;
    inv.status := 'expired';
  end if;

  select * into prop from public.properties p where p.id = inv.property_id limit 1;

  if not found then
    return query
    select null::uuid, null::text, null::boolean, 'invalid'::text,
      null::text, null::text, null::numeric, null::text, null::integer, null::numeric;
    return;
  end if;

  return query
  select
    prop.id,
    prop.slug,
    (coalesce(prop.open_to_non_students, false) = false),
    inv.status,
    inv.invited_email,
    inv.invited_name,
    inv.offered_weekly_rent,
    inv.offer_reason,
    inv.offered_bond_weeks,
    inv.offered_bond_fixed;
end;
$$;

revoke all on function public.resolve_tenant_invite(text) from public;
grant execute on function public.resolve_tenant_invite(text) to anon, authenticated;

comment on function public.resolve_tenant_invite(text) is
  'Hash lookup for /invite/:token — property, status, invitee hints, rent and bond offers.';
