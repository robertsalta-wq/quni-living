-- Append-only audit log: platform admins opening renter verification documents
-- from /admin/students. No foreign keys — rows survive user/profile deletion.
-- Client inserts via authenticated JWT (is_platform_admin); no update/delete policies.

create table public.document_access_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null,
  admin_email text not null,
  student_profile_id uuid not null,
  document_type text not null check (
    document_type in ('id_document', 'enrolment_doc', 'identity_supporting_doc')
  ),
  viewed_at timestamptz not null default now()
);

comment on table public.document_access_log is
  'Immutable audit: which platform admin opened which renter verification document and when.';

create index document_access_log_viewed_at_idx
  on public.document_access_log (viewed_at desc);

create index document_access_log_student_profile_id_idx
  on public.document_access_log (student_profile_id);

alter table public.document_access_log enable row level security;

create policy "Admins insert own access log rows"
  on public.document_access_log for insert
  to authenticated
  with check (
    public.is_platform_admin()
    and admin_user_id = auth.uid()
  );

create policy "Admins read access log"
  on public.document_access_log for select
  to authenticated
  using (public.is_platform_admin());
