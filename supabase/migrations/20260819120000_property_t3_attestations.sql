-- NSW T3 compliance self-attestation (append-only).
-- Agents must not apply this to production. Rob runs this. Proceed?

create table if not exists public.property_t3_attestations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  attested_by uuid not null references auth.users(id),
  attested_at timestamptz not null default now(),
  registration_number text not null,
  da_lawful_use_declared boolean not null,
  afss_current_declared boolean not null,
  afss_statement_date date null,
  afss_expiry_date date null,
  head_lessor_consent_declared boolean null,
  warranty_version text not null,
  evidence_paths jsonb null,
  superseded_at timestamptz null
);

comment on table public.property_t3_attestations is
  'Append-only NSW T3 boarding-house compliance self-attestations. Current row has superseded_at IS NULL. Quni records the declaration and does not verify DA, fire, or registration.';

comment on column public.property_t3_attestations.registration_number is
  'Fair Trading registrable boarding-house registration number declared at attestation time.';

comment on column public.property_t3_attestations.head_lessor_consent_declared is
  'Required true when properties.lister_role = head_tenant. NULL for owner listings.';

comment on column public.property_t3_attestations.warranty_version is
  'Version key of the warranty copy the operator accepted (e.g. nsw-t3-compliance-warranty-v1).';

comment on column public.property_t3_attestations.superseded_at is
  'NULL = current attestation. Set when a newer attestation is recorded.';

create unique index if not exists property_t3_attestations_one_current_per_property_idx
  on public.property_t3_attestations (property_id)
  where superseded_at is null;

create index if not exists property_t3_attestations_property_id_idx
  on public.property_t3_attestations (property_id, attested_at desc);

alter table public.property_t3_attestations enable row level security;

create policy "Landlord manages own property T3 attestations"
  on public.property_t3_attestations for all
  using (
    property_id in (
      select p.id from public.properties p
      join public.landlord_profiles lp on lp.id = p.landlord_id
      where lp.user_id = auth.uid()
    )
  )
  with check (
    property_id in (
      select p.id from public.properties p
      join public.landlord_profiles lp on lp.id = p.landlord_id
      where lp.user_id = auth.uid()
    )
    and attested_by = auth.uid()
  );
