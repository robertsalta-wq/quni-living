-- Executable verification after applying
-- supabase/migrations/20260819140000_harden_property_t3_attestations.sql
--
-- Agents must not run this. Rob runs it in the Supabase SQL Editor on
-- cqakltqzqrxnmxfbqatx. It raises on the first failure and prints VERIFY OK.
--
-- SETUP: paste a real landlord auth.users.id into v_landlord_user below.
-- The script creates one throwaway draft NSW T3 property, exercises the gates,
-- deletes the property (H4b), then cleans the orphaned attestation via a
-- temporary DISABLE TRIGGER (verify cleanup only - not a production escape hatch).

do $$
declare
  -- >>> PASTE landlord auth.users.id (must own a landlord_profiles row) <<<
  v_landlord_user uuid := null;

  v_landlord_id uuid;
  v_prop uuid := gen_random_uuid();
  v_attestation uuid;
  v_attestation_2 uuid;
  v_err text;
  v_row public.property_t3_attestations%rowtype;
  v_pol text;
  v_idxdef text;
  v_fn text;
  v_trg text;
  v_name text;
  v_old_attested_at timestamptz;
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

  -- =========================================================================
  -- A) Catalog / grant / policy invariants
  -- =========================================================================

  select tg.tgname into v_trg
  from pg_trigger tg
  join pg_class c on c.oid = tg.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'property_t3_attestations'
    and tg.tgname = 'property_t3_attestations_no_truncate'
    and not tg.tgisinternal;
  if v_trg is null then
    raise exception 'FAIL A1: missing property_t3_attestations_no_truncate trigger';
  end if;

  foreach v_name in array array[
    'trg_property_t3_attestations_stamp_insert',
    'trg_property_t3_attestations_append_only',
    'trg_properties_require_nsw_t3_attestation'
  ]
  loop
    select pg_get_functiondef(p.oid) into v_fn
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = v_name;
    if v_fn is null or position('search_path' in lower(v_fn)) = 0 then
      raise exception 'FAIL A2: % missing set search_path', v_name;
    end if;
  end loop;

  if not has_function_privilege(
    'authenticated',
    'public.record_property_t3_attestation(uuid,text,boolean,boolean,date,date,boolean,text)',
    'execute'
  ) then
    raise exception 'FAIL A3: authenticated lacks EXECUTE on record_property_t3_attestation';
  end if;
  if has_function_privilege(
    'anon',
    'public.record_property_t3_attestation(uuid,text,boolean,boolean,date,date,boolean,text)',
    'execute'
  ) then
    raise exception 'FAIL A3: anon must not EXECUTE record_property_t3_attestation';
  end if;

  select pg_get_functiondef(p.oid) into v_fn
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'record_property_t3_attestation';
  if v_fn is null
     or position('security definer' in lower(v_fn)) = 0
     or position('search_path' in lower(v_fn)) = 0
  then
    raise exception 'FAIL A3b: record_property_t3_attestation must be SECURITY DEFINER with search_path';
  end if;

  if has_table_privilege('authenticated', 'public.property_t3_attestations', 'insert')
     or has_table_privilege('authenticated', 'public.property_t3_attestations', 'update')
     or has_table_privilege('authenticated', 'public.property_t3_attestations', 'delete')
  then
    raise exception 'FAIL A4: authenticated still has write privilege on property_t3_attestations';
  end if;

  select pg_get_expr(pol.polqual, pol.polrelid) into v_pol
  from pg_policy pol
  join pg_class c on c.oid = pol.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'property_t3_attestations'
    and pol.polname = 'Landlords select own property T3 attestations';
  if v_pol is null then
    raise exception 'FAIL A5: missing landlord SELECT policy';
  end if;
  if position('attested_by' in lower(v_pol)) > 0 then
    raise exception 'FAIL A5: landlord SELECT still references attested_by: %', v_pol;
  end if;

  select pg_get_indexdef(i.indexrelid) into v_idxdef
  from pg_index i
  join pg_class t on t.oid = i.indrelid
  join pg_namespace n on n.oid = t.relnamespace
  join pg_class idx on idx.oid = i.indexrelid
  where n.nspname = 'public'
    and t.relname = 'property_t3_attestations'
    and idx.relname = 'property_t3_attestations_one_current_per_property_idx';
  if v_idxdef is null then
    raise exception 'FAIL A6: missing one_current_per_property unique index';
  end if;
  if position('nulls not distinct' in lower(v_idxdef)) > 0 then
    raise exception 'FAIL A6: unique index uses NULLS NOT DISTINCT: %', v_idxdef;
  end if;

  -- =========================================================================
  -- B) Behaviour on a throwaway draft NSW T3 property
  -- =========================================================================

  insert into public.properties (
    id, title, slug, landlord_id, status, featured,
    rent_per_week, state, property_type, is_registered_rooming_house,
    lister_role, address, suburb, postcode, bond_weeks
  ) values (
    v_prop,
    'T3 harden verify (delete me)',
    't3-harden-verify-' || substr(replace(v_prop::text, '-', ''), 1, 12),
    v_landlord_id,
    'draft',
    false,
    400,
    'NSW',
    'private_room_landlord_off_site',
    true,
    'owner',
    '1 Verify St',
    'Sydney',
    '2000',
    0
  );

  perform set_config('request.jwt.claim.sub', v_landlord_user::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_landlord_user::text, 'role', 'authenticated')::text,
    true
  );

  -- B1: publish without attestation must fail (F2)
  begin
    update public.properties set status = 'active' where id = v_prop;
    raise exception 'FAIL B1: activate without attestation should have raised';
  exception
    when others then
      get stacked diagnostics v_err = message_text;
      if position('FAIL B1:' in v_err) = 1 then
        raise;
      end if;
      if position('Complete the NSW boarding-house compliance attestation' in v_err) = 0 then
        raise exception 'FAIL B1: wrong error activating without attestation: %', v_err;
      end if;
  end;

  -- B2: RPC insert - server stamps + premises from NEW.property_id lookup
  v_attestation := public.record_property_t3_attestation(
    v_prop, 'BH-VERIFY-1', true, true, null, null, null, 'nsw-t3-compliance-warranty-v1'
  );

  select * into strict v_row from public.property_t3_attestations where id = v_attestation;
  if v_row.property_id is distinct from v_prop
     or v_row.property_id_at_attestation is distinct from v_prop
     or v_row.superseded_at is not null
     or v_row.attested_by is distinct from v_landlord_user
     or v_row.attested_at is null
     or v_row.attested_at < now() - interval '1 minute'
     or v_row.premises_address is distinct from '1 Verify St'
     or v_row.premises_suburb is distinct from 'Sydney'
     or v_row.premises_state is distinct from 'NSW'
     or v_row.premises_postcode is distinct from '2000'
     or v_row.head_lessor_consent_declared is not null
  then
    raise exception 'FAIL B2: attestation row shape wrong: %', to_jsonb(v_row);
  end if;
  v_old_attested_at := v_row.attested_at;

  -- B3: declaration UPDATE must fail (append-only shape 1 only allows supersede)
  begin
    update public.property_t3_attestations
    set registration_number = 'TAMPERED'
    where id = v_attestation;
    raise exception 'FAIL B3: declaration UPDATE should have raised';
  exception
    when others then
      get stacked diagnostics v_err = message_text;
      if position('FAIL B3:' in v_err) = 1 then
        raise;
      end if;
      if position('append-only' in lower(v_err)) = 0 then
        raise exception 'FAIL B3: unexpected error on declaration UPDATE: %', v_err;
      end if;
  end;

  -- B4: DELETE must fail
  begin
    delete from public.property_t3_attestations where id = v_attestation;
    raise exception 'FAIL B4: DELETE should have raised';
  exception
    when others then
      get stacked diagnostics v_err = message_text;
      if position('FAIL B4:' in v_err) = 1 then
        raise;
      end if;
      if position('append-only' in lower(v_err)) = 0 then
        raise exception 'FAIL B4: unexpected error on DELETE: %', v_err;
      end if;
  end;

  -- B5: re-attest supersedes atomically; prior row frozen; new row current
  perform pg_sleep(0.05);
  v_attestation_2 := public.record_property_t3_attestation(
    v_prop, 'BH-VERIFY-2', true, true, null, null, true, 'nsw-t3-compliance-warranty-v1'
  );

  select * into strict v_row from public.property_t3_attestations where id = v_attestation;
  if v_row.superseded_at is null then
    raise exception 'FAIL B5: prior row not superseded';
  end if;
  if v_row.registration_number is distinct from 'BH-VERIFY-1' then
    raise exception 'FAIL B5: superseded row declaration mutated';
  end if;

  select * into strict v_row from public.property_t3_attestations where id = v_attestation_2;
  if v_row.superseded_at is not null
     or v_row.registration_number is distinct from 'BH-VERIFY-2'
     or v_row.head_lessor_consent_declared is not true
  then
    raise exception 'FAIL B5: new current row wrong (expect head_lessor true stored while property still owner): %', to_jsonb(v_row);
  end if;

  -- B6: activate after complete attestation succeeds
  update public.properties set status = 'active' where id = v_prop;
  if not found then
    raise exception 'FAIL B6: activate after attestation failed silently';
  end if;

  -- B7: attest-then-flip owner → head_tenant on active listing (fix #1)
  update public.properties set lister_role = 'head_tenant' where id = v_prop;
  if not found then
    raise exception 'FAIL B7: owner→head_tenant flip should succeed with head_lessor already true';
  end if;

  -- B8: H4b retain on property delete (UPDATE shape 2: property_id → null)
  delete from public.properties where id = v_prop;

  select * into strict v_row from public.property_t3_attestations where id = v_attestation_2;
  if v_row.property_id is not null then
    raise exception 'FAIL B8: property_id should be NULL after parent delete';
  end if;
  if v_row.property_id_at_attestation is distinct from v_prop then
    raise exception 'FAIL B8: property_id_at_attestation must survive delete';
  end if;
  if v_row.premises_address is distinct from '1 Verify St'
     or v_row.registration_number is distinct from 'BH-VERIFY-2'
     or v_row.head_lessor_consent_declared is not true
  then
    raise exception 'FAIL B8: snapshot/declaration mutated on parent delete: %', to_jsonb(v_row);
  end if;
  if not exists (
    select 1 from public.property_t3_attestations where id = v_attestation
  ) then
    raise exception 'FAIL B8: superseded row was cascade-deleted';
  end if;

  -- Cleanup throwaway attestations (verify only).
  alter table public.property_t3_attestations disable trigger property_t3_attestations_append_only;
  delete from public.property_t3_attestations
  where property_id_at_attestation = v_prop;
  alter table public.property_t3_attestations enable trigger property_t3_attestations_append_only;

  raise notice 'VERIFY OK: T3 attestation hardening checks A1–A6 and B1–B8 passed (prop %)', v_prop;
end;
$$;
