-- Baseline: tenancies + tenancy_documents (previously applied manually on live projects).
-- Later migrations extend document_type checks and add co_tenant_signed_at.
-- Depends on: bookings, properties, landlord_profiles, student_profiles, auth.users, set_updated_at().

-- ---------------------------------------------------------------------------
-- tenancies
-- ---------------------------------------------------------------------------
create table if not exists public.tenancies (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings (id) on delete restrict,
  property_id uuid references public.properties (id) on delete restrict,
  landlord_profile_id uuid references public.landlord_profiles (id) on delete restrict,
  student_profile_id uuid references public.student_profiles (id) on delete restrict,
  start_date date not null,
  end_date date,
  weekly_rent numeric not null,
  bond_amount numeric,
  bond_lodgement_reference text,
  bond_lodged_at timestamptz,
  status text not null default 'active' check (status in ('active', 'ended', 'disputed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.tenancies is
  'Active or historical tenancy for a booking: landlord, student, property, rent/bond, status.';

create index if not exists tenancies_booking_id_idx on public.tenancies (booking_id);
create index if not exists tenancies_landlord_profile_id_idx on public.tenancies (landlord_profile_id);
create index if not exists tenancies_student_profile_id_idx on public.tenancies (student_profile_id);
create index if not exists tenancies_status_idx on public.tenancies (status);

drop trigger if exists tenancies_handle_updated_at on public.tenancies;
drop trigger if exists tenancies_updated_at on public.tenancies;
create trigger tenancies_updated_at
  before update on public.tenancies
  for each row execute function public.set_updated_at();

alter table public.tenancies enable row level security;

drop policy if exists "Landlords select own tenancies" on public.tenancies;
create policy "Landlords select own tenancies"
  on public.tenancies for select to authenticated
  using (
    landlord_profile_id in (
      select lp.id from public.landlord_profiles lp where lp.user_id = auth.uid()
    )
  );

drop policy if exists "Students select own tenancies" on public.tenancies;
create policy "Students select own tenancies"
  on public.tenancies for select to authenticated
  using (
    student_profile_id in (
      select sp.id from public.student_profiles sp where sp.user_id = auth.uid()
    )
  );

drop policy if exists "Service role full access tenancies" on public.tenancies;
create policy "Service role full access tenancies"
  on public.tenancies for all to service_role
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- tenancy_documents
-- ---------------------------------------------------------------------------
create table if not exists public.tenancy_documents (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid references public.tenancies (id) on delete restrict,
  document_type text not null check (
    document_type in (
      'lease',
      'condition_report_ingoing',
      'condition_report_outgoing',
      'breach_notice',
      'termination_notice',
      'rent_increase_notice',
      'bond_lodgement',
      'other'
    )
  ),
  status text not null default 'draft' check (
    status in (
      'draft',
      'sent_for_signing',
      'signed',
      'acknowledged',
      'disputed',
      'archived'
    )
  ),
  file_path text,
  docuseal_submission_id text,
  generated_by uuid references auth.users (id),
  landlord_signed_at timestamptz,
  student_signed_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.tenancy_documents is
  'Documents tied to a tenancy (DocuSeal, storage path, signing timestamps).';

create index if not exists tenancy_documents_tenancy_id_idx on public.tenancy_documents (tenancy_id);
create index if not exists tenancy_documents_document_type_idx on public.tenancy_documents (document_type);
create index if not exists tenancy_documents_status_idx on public.tenancy_documents (status);
create index if not exists tenancy_documents_docuseal_submission_id_idx
  on public.tenancy_documents (docuseal_submission_id)
  where docuseal_submission_id is not null;

drop trigger if exists tenancy_documents_handle_updated_at on public.tenancy_documents;
drop trigger if exists tenancy_documents_updated_at on public.tenancy_documents;
create trigger tenancy_documents_updated_at
  before update on public.tenancy_documents
  for each row execute function public.set_updated_at();

alter table public.tenancy_documents enable row level security;

drop policy if exists "Landlords select tenancy_documents for own tenancies" on public.tenancy_documents;
create policy "Landlords select tenancy_documents for own tenancies"
  on public.tenancy_documents for select to authenticated
  using (
    exists (
      select 1
      from public.tenancies t
      join public.landlord_profiles lp on lp.id = t.landlord_profile_id
      where t.id = tenancy_documents.tenancy_id
        and lp.user_id = auth.uid()
    )
  );

drop policy if exists "Landlords insert tenancy_documents for own tenancies" on public.tenancy_documents;
create policy "Landlords insert tenancy_documents for own tenancies"
  on public.tenancy_documents for insert to authenticated
  with check (
    exists (
      select 1
      from public.tenancies t
      join public.landlord_profiles lp on lp.id = t.landlord_profile_id
      where t.id = tenancy_documents.tenancy_id
        and lp.user_id = auth.uid()
    )
  );

drop policy if exists "Landlords update tenancy_documents for own tenancies" on public.tenancy_documents;
create policy "Landlords update tenancy_documents for own tenancies"
  on public.tenancy_documents for update to authenticated
  using (
    exists (
      select 1
      from public.tenancies t
      join public.landlord_profiles lp on lp.id = t.landlord_profile_id
      where t.id = tenancy_documents.tenancy_id
        and lp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.tenancies t
      join public.landlord_profiles lp on lp.id = t.landlord_profile_id
      where t.id = tenancy_documents.tenancy_id
        and lp.user_id = auth.uid()
    )
  );

drop policy if exists "Students select tenancy_documents for own tenancies" on public.tenancy_documents;
create policy "Students select tenancy_documents for own tenancies"
  on public.tenancy_documents for select to authenticated
  using (
    exists (
      select 1
      from public.tenancies t
      join public.student_profiles sp on sp.id = t.student_profile_id
      where t.id = tenancy_documents.tenancy_id
        and sp.user_id = auth.uid()
    )
  );

drop policy if exists "Service role full access tenancy_documents" on public.tenancy_documents;
create policy "Service role full access tenancy_documents"
  on public.tenancy_documents for all to service_role
  using (true)
  with check (true);
