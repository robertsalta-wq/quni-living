-- Append-only audit log: platform admins opening renter profile detail on /admin/students.
-- No foreign keys — rows survive user/profile deletion.
-- Client inserts via authenticated JWT (is_platform_admin); no update/delete policies.

create table public.profile_access_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null,
  admin_email text not null,
  student_profile_id uuid not null,
  viewed_at timestamptz not null default now()
);

comment on table public.profile_access_log is
  'Immutable audit: which platform admin opened which renter profile detail and when.';

create index profile_access_log_viewed_at_idx
  on public.profile_access_log (viewed_at desc);

create index profile_access_log_student_profile_id_idx
  on public.profile_access_log (student_profile_id);

alter table public.profile_access_log enable row level security;

create policy "Admins insert own profile access log rows"
  on public.profile_access_log for insert
  to authenticated
  with check (
    public.is_platform_admin()
    and admin_user_id = auth.uid()
  );

create policy "Admins read profile access log"
  on public.profile_access_log for select
  to authenticated
  using (public.is_platform_admin());
