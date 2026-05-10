-- Property service_tier audit trail and one-way ratchet enforcement.
--
-- Background: as of migration 20260510190000, properties carry a per-row
-- service_tier ('listing' | 'managed'). The product rule is one-way:
-- a Listing property may be upgraded to Managed (manually via the property
-- form, or automatically when a landlord accepts a Listing booking and
-- elects to upgrade). A Managed property must never move back to Listing.
--
-- This migration:
--   1. Adds a BEFORE UPDATE trigger that hard-blocks Managed -> Listing
--      regardless of caller role (browser, edge, service role). The form
--      already gates this in the UI; this is belt-and-braces.
--   2. Adds AFTER INSERT / AFTER UPDATE triggers that append rows to
--      service_tier_events so admins can see when a property was created
--      with a tier, and when (and from what) a property was upgraded.

-- ---------------------------------------------------------------------------
-- 1. Block Managed -> Listing downgrades
-- ---------------------------------------------------------------------------
create or replace function public.trg_properties_block_managed_downgrade()
returns trigger
language plpgsql
as $$
begin
  if old.service_tier = 'managed' and new.service_tier <> 'managed' then
    raise exception 'Quni Managed properties cannot be downgraded to Listing (property %).', old.id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists properties_block_managed_downgrade on public.properties;
create trigger properties_block_managed_downgrade
  before update of service_tier on public.properties
  for each row
  when (old.service_tier is distinct from new.service_tier)
  execute procedure public.trg_properties_block_managed_downgrade();

-- ---------------------------------------------------------------------------
-- 2. service_tier_events audit on property insert / update
-- ---------------------------------------------------------------------------
create or replace function public.trg_properties_log_service_tier_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.service_tier_events (
    property_id,
    landlord_id,
    event_type,
    service_tier,
    metadata
  ) values (
    new.id,
    new.landlord_id,
    'property_created',
    case new.service_tier
      when 'listing' then 'listing'::public.service_tier_enum
      when 'managed' then 'managed'::public.service_tier_enum
      else null
    end,
    jsonb_build_object('service_tier', new.service_tier)
  );
  return new;
end;
$$;

drop trigger if exists properties_log_service_tier_insert on public.properties;
create trigger properties_log_service_tier_insert
  after insert on public.properties
  for each row
  execute procedure public.trg_properties_log_service_tier_insert();

create or replace function public.trg_properties_log_service_tier_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.service_tier_events (
    property_id,
    landlord_id,
    event_type,
    service_tier,
    metadata
  ) values (
    new.id,
    new.landlord_id,
    'property_tier_changed',
    case new.service_tier
      when 'listing' then 'listing'::public.service_tier_enum
      when 'managed' then 'managed'::public.service_tier_enum
      else null
    end,
    jsonb_build_object(
      'from', old.service_tier,
      'to', new.service_tier
    )
  );
  return new;
end;
$$;

drop trigger if exists properties_log_service_tier_update on public.properties;
create trigger properties_log_service_tier_update
  after update of service_tier on public.properties
  for each row
  when (old.service_tier is distinct from new.service_tier)
  execute procedure public.trg_properties_log_service_tier_update();
