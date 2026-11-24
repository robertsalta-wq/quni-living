-- Executable verification after applying
-- supabase/migrations/20261124143000_vic_rooming_house_listing.sql
--
-- Agents must not run this. Rob runs it in the Supabase SQL Editor on
-- cqakltqzqrxnmxfbqatx. It raises on the first failure and prints VERIFY OK.
--
-- SETUP: paste a real landlord auth.users.id into v_landlord_user below.
-- The script inserts throwaway drafts, checks the fee-snapshot seed and the
-- Victorian attestation stamp, then deletes those rows.

do $$
declare
  -- >>> PASTE landlord auth.users.id (must own a landlord_profiles row) <<<
  v_landlord_user uuid := null;

  v_landlord_id uuid;
  v_nsw uuid := gen_random_uuid();
  v_qld uuid := gen_random_uuid();
  v_vic uuid := gen_random_uuid();
  v_nsw_t3 uuid := gen_random_uuid();
  v_qld_t1 uuid := gen_random_uuid();
  v_sig text;
  v_sig_count int;
  v_seed_src text;
  v_reset_src text;
  v_cfg int;
  v_snap int;
  v_tier_ok int;
  v_attestation uuid;
  v_row public.property_vic_rooming_operator_attestations%rowtype;
begin
  if v_landlord_user is null then
    raise exception 'SETUP: set v_landlord_user to a landlord auth.users.id before running';
  end if;

  select lp.id into v_landlord_id
  from public.landlord_profiles lp
  where lp.user_id = v_landlord_user;
  if v_landlord_id is null then
    raise exception 'SETUP: no landlord_profiles row for user %', v_landlord_user;
  end if;

  select count(*), min(pg_get_function_identity_arguments(p.oid))
  into v_sig_count, v_sig
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'resolve_property_tier_from_listing';

  if v_sig_count is distinct from 1 then
    raise exception 'FAIL: expected one resolve_property_tier_from_listing, found %', v_sig_count;
  end if;
  if v_sig is distinct from 'p_property_type text, p_is_registered_rooming_house boolean, p_state text, p_premises_occupant_capacity integer' then
    raise exception 'FAIL: unexpected signature %', v_sig;
  end if;

  select p.prosrc into v_seed_src
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'trg_properties_seed_fee_snapshots';
  if v_seed_src is null
     or position('new.state' in v_seed_src) = 0
     or position('new.vic_premises_occupant_capacity' in v_seed_src) = 0 then
    raise exception 'FAIL: seed trigger does not pass state and capacity';
  end if;

  select p.prosrc into v_reset_src
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'admin_reset_property_fee_snapshots_from_template';
  if v_reset_src is null
     or position('state' in v_reset_src) = 0
     or position('vic_premises_occupant_capacity' in v_reset_src) = 0 then
    raise exception 'FAIL: admin reset does not pass state and capacity';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'vic_rooming_condition_report'
  ) then
    raise exception 'FAIL: vic_rooming_condition_report is still on properties';
  end if;
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookings'
      and column_name = 'vic_rooming_condition_report'
  ) then
    raise exception 'FAIL: bookings.vic_rooming_condition_report is missing';
  end if;

  insert into public.properties (
    id, title, slug, landlord_id, status, featured,
    rent_per_week, state, property_type, is_registered_rooming_house,
    lister_role, address, suburb, postcode, bond_weeks
  ) values
  (
    v_nsw, 'VIC rooming verify NSW t2 (delete me)',
    'vic-rooming-verify-nsw-' || substr(replace(v_nsw::text, '-', ''), 1, 12),
    v_landlord_id, 'draft', false, 400, 'NSW',
    'private_room_landlord_off_site', false, 'owner',
    '1 Verify St', 'Sydney', '2000', 0
  ),
  (
    v_qld, 'VIC rooming verify QLD t2 (delete me)',
    'vic-rooming-verify-qld-' || substr(replace(v_qld::text, '-', ''), 1, 12),
    v_landlord_id, 'draft', false, 400, 'QLD',
    'private_room_landlord_off_site', false, 'owner',
    '2 Verify St', 'Brisbane', '4000', 0
  ),
  (
    v_nsw_t3, 'VIC rooming verify NSW t3 (delete me)',
    'vic-rooming-verify-nsw3-' || substr(replace(v_nsw_t3::text, '-', ''), 1, 12),
    v_landlord_id, 'draft', false, 400, 'NSW',
    'private_room_landlord_off_site', true, 'owner',
    '3 Verify St', 'Sydney', '2000', 0
  ),
  (
    v_qld_t1, 'VIC rooming verify QLD t1 (delete me)',
    'vic-rooming-verify-qld1-' || substr(replace(v_qld_t1::text, '-', ''), 1, 12),
    v_landlord_id, 'draft', false, 400, 'QLD',
    'private_room_landlord_on_site', false, 'owner',
    '4 Verify St', 'Brisbane', '4000', 0
  ),
  (
    v_vic, 'VIC rooming verify VIC (delete me)',
    'vic-rooming-verify-vic-' || substr(replace(v_vic::text, '-', ''), 1, 12),
    v_landlord_id, 'draft', false, 400, 'VIC',
    'private_room_landlord_off_site', false, 'owner',
    '5 Verify St', 'Melbourne', '3000', 0
  );

  select count(*) into v_cfg
  from public.pricing_config
  where property_tier = 't2';
  if v_cfg < 1 then
    raise exception 'FAIL: pricing_config has no t2 rows, so the seed cannot be checked';
  end if;

  select count(*), count(*) filter (where source_property_tier = 't2' and snapshot_source = 'listing_creation' and is_active)
  into v_snap, v_tier_ok
  from public.property_fee_snapshots
  where property_id = v_nsw;
  if v_snap is distinct from v_cfg or v_tier_ok is distinct from v_cfg then
    raise exception 'FAIL: NSW off-site unregistered seed is % rows, % on t2, pricing_config t2 is %', v_snap, v_tier_ok, v_cfg;
  end if;

  select count(*), count(*) filter (where source_property_tier = 't2' and snapshot_source = 'listing_creation' and is_active)
  into v_snap, v_tier_ok
  from public.property_fee_snapshots
  where property_id = v_qld;
  if v_snap is distinct from v_cfg or v_tier_ok is distinct from v_cfg then
    raise exception 'FAIL: QLD off-site unregistered seed is % rows, % on t2, pricing_config t2 is %', v_snap, v_tier_ok, v_cfg;
  end if;

  select count(*) into v_cfg
  from public.pricing_config
  where property_tier = 't3';
  select count(*), count(*) filter (where source_property_tier = 't3' and snapshot_source = 'listing_creation' and is_active)
  into v_snap, v_tier_ok
  from public.property_fee_snapshots
  where property_id = v_nsw_t3;
  if v_cfg < 1 or v_snap is distinct from v_cfg or v_tier_ok is distinct from v_cfg then
    raise exception 'FAIL: NSW off-site registered seed is % rows, % on t3, pricing_config t3 is %', v_snap, v_tier_ok, v_cfg;
  end if;

  select count(*) into v_cfg
  from public.pricing_config
  where property_tier = 't1';
  select count(*), count(*) filter (where source_property_tier = 't1' and snapshot_source = 'listing_creation' and is_active)
  into v_snap, v_tier_ok
  from public.property_fee_snapshots
  where property_id = v_qld_t1;
  if v_cfg < 1 or v_snap is distinct from v_cfg or v_tier_ok is distinct from v_cfg then
    raise exception 'FAIL: QLD on-site seed is % rows, % on t1, pricing_config t1 is %', v_snap, v_tier_ok, v_cfg;
  end if;

  perform set_config('request.jwt.claim.sub', v_landlord_user::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_landlord_user::text, 'role', 'authenticated')::text,
    true
  );

  begin
    perform public.record_property_vic_rooming_operator_attestation(
      v_nsw,
      'REG-1',
      'LIC-1',
      true,
      true,
      'vic-rooming-operator-attestation-v1'
    );
    raise exception 'FAIL: attestation accepted a NSW property';
  exception
    when others then
      if sqlerrm not like '%requires a VIC property%' then
        raise;
      end if;
  end;

  v_attestation := public.record_property_vic_rooming_operator_attestation(
    v_vic,
    'REG-VIC',
    'LIC-VIC',
    true,
    true,
    'vic-rooming-operator-attestation-v1'
  );

  select * into v_row
  from public.property_vic_rooming_operator_attestations
  where id = v_attestation;

  if v_row.attested_by is distinct from v_landlord_user then
    raise exception 'FAIL: attested_by is %', v_row.attested_by;
  end if;
  if v_row.attested_at is null then
    raise exception 'FAIL: attested_at is null';
  end if;
  if v_row.property_id_at_attestation is distinct from v_vic then
    raise exception 'FAIL: property_id_at_attestation is %', v_row.property_id_at_attestation;
  end if;
  if v_row.premises_address is distinct from '5 Verify St'
     or v_row.premises_suburb is distinct from 'Melbourne'
     or v_row.premises_state is distinct from 'VIC'
     or v_row.premises_postcode is distinct from '3000' then
    raise exception 'FAIL: premises snapshot % / % / % / %',
      v_row.premises_address, v_row.premises_suburb, v_row.premises_state, v_row.premises_postcode;
  end if;

  delete from public.properties
  where id in (v_nsw, v_qld, v_vic, v_nsw_t3, v_qld_t1);

  alter table public.property_vic_rooming_operator_attestations
    disable trigger property_vic_rooming_operator_attestations_append_only;
  delete from public.property_vic_rooming_operator_attestations
  where id = v_attestation;
  alter table public.property_vic_rooming_operator_attestations
    enable trigger property_vic_rooming_operator_attestations_append_only;

  raise notice 'VERIFY OK';
end;
$$;
