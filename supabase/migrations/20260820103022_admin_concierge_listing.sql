-- Concierge listing: staff create a draft on another landlord's profile.
-- Idempotent admin INSERT policies (also in supabase/admin_rls_policies.sql; may already be on prod).
-- Audit RPC writes journey_events (client cannot insert that table).
-- Rob applies on Quni-Living-AU before relying on the audit row.

drop policy if exists "Platform admins insert properties" on public.properties;
create policy "Platform admins insert properties"
  on public.properties for insert
  to authenticated
  with check (public.is_platform_admin());

drop policy if exists "Platform admins manage all property_features" on public.property_features;
create policy "Platform admins manage all property_features"
  on public.property_features for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Platform admins manage all property_house_rules" on public.property_house_rules;
create policy "Platform admins manage all property_house_rules"
  on public.property_house_rules for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Platform admins manage property_payout_details" on public.property_payout_details;
create policy "Platform admins manage property_payout_details"
  on public.property_payout_details for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create or replace function public.admin_record_concierge_listing(
  p_property_id uuid,
  p_landlord_profile_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_staff uuid := auth.uid();
  v_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
begin
  if v_staff is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;

  if p_property_id is null or p_landlord_profile_id is null then
    raise exception 'property_id and landlord_profile_id required';
  end if;

  if not exists (
    select 1
    from public.properties p
    where p.id = p_property_id
      and p.landlord_id = p_landlord_profile_id
  ) then
    raise exception 'property not found for landlord';
  end if;

  insert into public.journey_events (
    user_id,
    email,
    property_id,
    event_type,
    source,
    metadata
  )
  values (
    v_staff,
    nullif(v_email, ''),
    p_property_id,
    'admin_created_listing',
    'admin',
    jsonb_build_object('landlord_profile_id', p_landlord_profile_id)
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.admin_record_concierge_listing(uuid, uuid) is
  'Platform staff audit row after creating a listing for a landlord. Asserts is_platform_admin(); does not insert the property.';

revoke all on function public.admin_record_concierge_listing(uuid, uuid) from public;
grant execute on function public.admin_record_concierge_listing(uuid, uuid) to authenticated;
