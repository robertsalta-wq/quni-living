-- Harden NSW T3 compliance attestations: append-only enforcement, RPC write path,
-- H4b retain-on-property-delete, and T3-only publish guard on properties.
-- Agents must not apply this to production. Rob runs this. Proceed?

-- Keep in sync with src/lib/tenancy/nswT3ComplianceAttestation.ts
-- NSW_T3_COMPLIANCE_WARRANTY_VERSION / NSW_T3_COMPLIANCE_BLOCKED_MESSAGE.
-- A wording change is a v2 key + migration that updates these literals.

-- ---------------------------------------------------------------------------
-- H4b: retain attestation when the listing is deleted
-- ---------------------------------------------------------------------------
alter table public.property_t3_attestations
  drop constraint if exists property_t3_attestations_property_id_fkey;

alter table public.property_t3_attestations
  alter column property_id drop not null;

alter table public.property_t3_attestations
  add column if not exists property_id_at_attestation uuid;

update public.property_t3_attestations
set property_id_at_attestation = property_id
where property_id_at_attestation is null
  and property_id is not null;

-- Zero rows on prod at ship time; if any orphaned nulls appear, fail loudly.
do $$
begin
  if exists (
    select 1
    from public.property_t3_attestations
    where property_id_at_attestation is null
  ) then
    raise exception 'property_t3_attestations.property_id_at_attestation backfill left null rows';
  end if;
end;
$$;

alter table public.property_t3_attestations
  alter column property_id_at_attestation set not null;

alter table public.property_t3_attestations
  add column if not exists premises_address text;

alter table public.property_t3_attestations
  add column if not exists premises_suburb text;

alter table public.property_t3_attestations
  add column if not exists premises_state text;

alter table public.property_t3_attestations
  add column if not exists premises_postcode text;

alter table public.property_t3_attestations
  add constraint property_t3_attestations_property_id_fkey
  foreign key (property_id) references public.properties(id) on delete set null;

comment on column public.property_t3_attestations.property_id is
  'Live FK to properties. NULL after the listing is deleted (ON DELETE SET NULL).';

comment on column public.property_t3_attestations.property_id_at_attestation is
  'Listing id at attestation time. Not a FK; survives property delete.';

comment on column public.property_t3_attestations.premises_address is
  'Snapshot of properties.address at attestation time.';

comment on column public.property_t3_attestations.premises_suburb is
  'Snapshot of properties.suburb at attestation time.';

comment on column public.property_t3_attestations.premises_state is
  'Snapshot of properties.state at attestation time.';

comment on column public.property_t3_attestations.premises_postcode is
  'Snapshot of properties.postcode at attestation time.';

comment on column public.property_t3_attestations.head_lessor_consent_declared is
  'True when the operator declared written head-lessor consent. Required for completeness when properties.lister_role = head_tenant. May be true on an owner-row attestation (additive) so an active listing can attest then flip to head_tenant.';

comment on table public.property_t3_attestations is
  'Append-only NSW T3 boarding-house compliance self-attestations. Current row has superseded_at IS NULL. Survives property delete (property_id SET NULL; premises snapshot retained). Quni records the declaration and does not verify DA, fire, or registration.';

-- ---------------------------------------------------------------------------
-- RLS: SELECT only (JWT write path is the RPC)
-- ---------------------------------------------------------------------------
drop policy if exists "Landlord manages own property T3 attestations"
  on public.property_t3_attestations;

drop policy if exists "Landlords select own property T3 attestations"
  on public.property_t3_attestations;

drop policy if exists "Platform admins select property T3 attestations"
  on public.property_t3_attestations;

create policy "Landlords select own property T3 attestations"
  on public.property_t3_attestations for select
  to authenticated
  using (
    property_id in (
      select p.id
      from public.properties p
      join public.landlord_profiles lp on lp.id = p.landlord_id
      where lp.user_id = auth.uid()
    )
  );

create policy "Platform admins select property T3 attestations"
  on public.property_t3_attestations for select
  to authenticated
  using (public.is_platform_admin());

revoke all on table public.property_t3_attestations from anon;

revoke insert, update, delete, truncate, references, trigger
  on table public.property_t3_attestations
  from authenticated;

revoke insert, update, delete, truncate
  on table public.property_t3_attestations
  from service_role;

grant select on table public.property_t3_attestations to authenticated;
grant select on table public.property_t3_attestations to service_role;

-- ---------------------------------------------------------------------------
-- Append-only row guards
-- ---------------------------------------------------------------------------
create or replace function public.trg_property_t3_attestations_stamp_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_addr text;
  v_suburb text;
  v_state text;
  v_postcode text;
begin
  new.attested_at := now();
  new.superseded_at := null;

  if auth.uid() is not null then
    new.attested_by := auth.uid();
  end if;

  if new.property_id is null then
    raise exception 'property_t3_attestations.property_id required on insert'
      using errcode = 'check_violation';
  end if;

  new.property_id_at_attestation := new.property_id;

  select p.address, p.suburb, p.state, p.postcode
  into v_addr, v_suburb, v_state, v_postcode
  from public.properties p
  where p.id = new.property_id;

  if not found then
    raise exception 'property_t3_attestations insert: property % not found', new.property_id
      using errcode = 'foreign_key_violation';
  end if;

  new.premises_address := v_addr;
  new.premises_suburb := v_suburb;
  new.premises_state := v_state;
  new.premises_postcode := v_postcode;

  return new;
end;
$$;

drop trigger if exists property_t3_attestations_stamp_insert
  on public.property_t3_attestations;
create trigger property_t3_attestations_stamp_insert
  before insert on public.property_t3_attestations
  for each row
  execute function public.trg_property_t3_attestations_stamp_insert();

create or replace function public.trg_property_t3_attestations_append_only()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'property_t3_attestations is append-only (DELETE forbidden)'
      using errcode = 'restrict_violation';
  end if;

  -- Shape 1: RPC supersede (superseded_at null -> non-null; force server now()).
  if old.superseded_at is null
     and new.superseded_at is not null
     and new.id is not distinct from old.id
     and new.property_id is not distinct from old.property_id
     and new.property_id_at_attestation is not distinct from old.property_id_at_attestation
     and new.attested_by is not distinct from old.attested_by
     and new.attested_at is not distinct from old.attested_at
     and new.registration_number is not distinct from old.registration_number
     and new.da_lawful_use_declared is not distinct from old.da_lawful_use_declared
     and new.afss_current_declared is not distinct from old.afss_current_declared
     and new.afss_statement_date is not distinct from old.afss_statement_date
     and new.afss_expiry_date is not distinct from old.afss_expiry_date
     and new.head_lessor_consent_declared is not distinct from old.head_lessor_consent_declared
     and new.warranty_version is not distinct from old.warranty_version
     and new.evidence_paths is not distinct from old.evidence_paths
     and new.premises_address is not distinct from old.premises_address
     and new.premises_suburb is not distinct from old.premises_suburb
     and new.premises_state is not distinct from old.premises_state
     and new.premises_postcode is not distinct from old.premises_postcode
  then
    new.superseded_at := now();
    return new;
  end if;

  -- Shape 2: parent delete ON DELETE SET NULL (property_id -> null only).
  if old.property_id is not null
     and new.property_id is null
     and new.id is not distinct from old.id
     and new.property_id_at_attestation is not distinct from old.property_id_at_attestation
     and new.attested_by is not distinct from old.attested_by
     and new.attested_at is not distinct from old.attested_at
     and new.registration_number is not distinct from old.registration_number
     and new.da_lawful_use_declared is not distinct from old.da_lawful_use_declared
     and new.afss_current_declared is not distinct from old.afss_current_declared
     and new.afss_statement_date is not distinct from old.afss_statement_date
     and new.afss_expiry_date is not distinct from old.afss_expiry_date
     and new.head_lessor_consent_declared is not distinct from old.head_lessor_consent_declared
     and new.warranty_version is not distinct from old.warranty_version
     and new.evidence_paths is not distinct from old.evidence_paths
     and new.superseded_at is not distinct from old.superseded_at
     and new.premises_address is not distinct from old.premises_address
     and new.premises_suburb is not distinct from old.premises_suburb
     and new.premises_state is not distinct from old.premises_state
     and new.premises_postcode is not distinct from old.premises_postcode
  then
    return new;
  end if;

  raise exception 'property_t3_attestations is append-only (UPDATE forbidden except supersede or parent SET NULL)'
    using errcode = 'restrict_violation';
end;
$$;

drop trigger if exists property_t3_attestations_append_only
  on public.property_t3_attestations;
create trigger property_t3_attestations_append_only
  before update or delete on public.property_t3_attestations
  for each row
  execute function public.trg_property_t3_attestations_append_only();

drop trigger if exists property_t3_attestations_no_truncate
  on public.property_t3_attestations;
create trigger property_t3_attestations_no_truncate
  before truncate on public.property_t3_attestations
  for each statement
  execute function public.trg_forbid_truncate();

-- ---------------------------------------------------------------------------
-- Completeness helper (shared by publish trigger)
-- Keep in sync with isCompleteNswT3ComplianceAttestation + isNswT3ListingFields.
-- ---------------------------------------------------------------------------
create or replace function public.property_has_complete_nsw_t3_attestation(
  p_property_id uuid,
  p_lister_role text
)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.property_t3_attestations a
    where a.property_id = p_property_id
      and a.superseded_at is null
      and length(trim(a.registration_number)) > 0
      and a.da_lawful_use_declared is true
      and a.afss_current_declared is true
      and a.warranty_version = 'nsw-t3-compliance-warranty-v1'
      and (
        coalesce(p_lister_role, 'owner') is distinct from 'head_tenant'
        or a.head_lessor_consent_declared is true
      )
  );
$$;

revoke all on function public.property_has_complete_nsw_t3_attestation(uuid, text)
  from public, anon;

-- Invoked from the properties BEFORE trigger under the caller's role (landlord JWT).
grant execute on function public.property_has_complete_nsw_t3_attestation(uuid, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- F2: block unattested NSW T3 listings going/staying active
-- ---------------------------------------------------------------------------
create or replace function public.trg_properties_require_nsw_t3_attestation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from 'active' then
    return new;
  end if;

  if upper(trim(coalesce(new.state, ''))) is distinct from 'NSW'
     or new.property_type is distinct from 'private_room_landlord_off_site'
     or new.is_registered_rooming_house is not true
  then
    return new;
  end if;

  if not public.property_has_complete_nsw_t3_attestation(new.id, new.lister_role) then
    raise exception 'Complete the NSW boarding-house compliance attestation before publishing or generating an occupancy agreement.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists properties_require_nsw_t3_attestation on public.properties;
create trigger properties_require_nsw_t3_attestation
  before insert or update on public.properties
  for each row
  execute function public.trg_properties_require_nsw_t3_attestation();

-- ---------------------------------------------------------------------------
-- Write path: landlord-callable SECURITY DEFINER RPC
-- ---------------------------------------------------------------------------
create or replace function public.record_property_t3_attestation(
  p_property_id uuid,
  p_registration_number text,
  p_da_lawful_use_declared boolean,
  p_afss_current_declared boolean,
  p_afss_statement_date date,
  p_afss_expiry_date date,
  p_head_lessor_consent_declared boolean,
  p_warranty_version text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_landlord_id uuid;
  v_lister_role text;
  v_reg text := trim(coalesce(p_registration_number, ''));
  v_head_lessor boolean;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_property_id is null then
    raise exception 'property_id required';
  end if;

  select lp.id
  into v_landlord_id
  from public.landlord_profiles lp
  where lp.user_id = v_user_id;

  if v_landlord_id is null then
    raise exception 'not a landlord';
  end if;

  select p.lister_role
  into v_lister_role
  from public.properties p
  where p.id = p_property_id
    and p.landlord_id = v_landlord_id;

  if not found then
    raise exception 'property not found';
  end if;

  if length(v_reg) = 0 then
    raise exception 'registration_number required';
  end if;

  if p_da_lawful_use_declared is not true then
    raise exception 'da_lawful_use_declared required';
  end if;

  if p_afss_current_declared is not true then
    raise exception 'afss_current_declared required';
  end if;

  if coalesce(p_warranty_version, '') is distinct from 'nsw-t3-compliance-warranty-v1' then
    raise exception 'warranty_version must be nsw-t3-compliance-warranty-v1';
  end if;

  -- Store head-lessor consent whenever declared true (additive). Completeness
  -- only *requires* it for head_tenant. Keeping true on an owner-row attestation
  -- lets attest-then-flip-to-head_tenant succeed on an active listing without
  -- unpublishing (RPC still reads lister_role from the property row).
  if coalesce(v_lister_role, 'owner') = 'head_tenant' then
    if p_head_lessor_consent_declared is not true then
      raise exception 'head_lessor_consent_declared required for head_tenant';
    end if;
    v_head_lessor := true;
  elsif p_head_lessor_consent_declared is true then
    v_head_lessor := true;
  else
    v_head_lessor := null;
  end if;

  -- Lock any current row so concurrent re-attestations serialize.
  perform 1
  from public.property_t3_attestations a
  where a.property_id = p_property_id
    and a.superseded_at is null
  for update;

  update public.property_t3_attestations
  set superseded_at = now()
  where property_id = p_property_id
    and superseded_at is null;

  insert into public.property_t3_attestations (
    property_id,
    registration_number,
    da_lawful_use_declared,
    afss_current_declared,
    afss_statement_date,
    afss_expiry_date,
    head_lessor_consent_declared,
    warranty_version,
    evidence_paths
  ) values (
    p_property_id,
    v_reg,
    true,
    true,
    p_afss_statement_date,
    p_afss_expiry_date,
    v_head_lessor,
    'nsw-t3-compliance-warranty-v1',
    null
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.record_property_t3_attestation is
  'Atomic supersede-then-insert for NSW T3 compliance attestations. Server stamps attested_at / superseded_at / premises snapshot. Landlord JWT only.';

revoke all on function public.record_property_t3_attestation(
  uuid, text, boolean, boolean, date, date, boolean, text
) from public, anon;

grant execute on function public.record_property_t3_attestation(
  uuid, text, boolean, boolean, date, date, boolean, text
) to authenticated;
