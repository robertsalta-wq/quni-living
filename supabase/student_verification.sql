-- ============================================================
-- Student verification: uni email OTP, document storage paths
-- Run in Supabase SQL Editor after profile tables exist.
-- ============================================================

-- student_profiles (not legacy "profiles")
alter table public.student_profiles add column if not exists uni_email text;
alter table public.student_profiles add column if not exists uni_email_verified boolean default false;
alter table public.student_profiles add column if not exists uni_email_verified_at timestamptz;
alter table public.student_profiles add column if not exists id_document_url text;
alter table public.student_profiles add column if not exists id_submitted_at timestamptz;
alter table public.student_profiles add column if not exists enrolment_doc_url text;
alter table public.student_profiles add column if not exists enrolment_submitted_at timestamptz;

comment on column public.student_profiles.uni_email is 'Verified university email address (.edu.au etc.).';
comment on column public.student_profiles.id_document_url is 'Storage object path in student-documents bucket (private), not a public URL.';
comment on column public.student_profiles.enrolment_doc_url is 'Storage object path for enrolment / CoE (private).';

create table if not exists public.verification_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  otp text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists verification_otps_user_id_idx on public.verification_otps (user_id);

-- One active OTP per user (required for Edge Function upsert)
delete from public.verification_otps a
using public.verification_otps b
where a.user_id = b.user_id
  and a.created_at < b.created_at;
create unique index if not exists verification_otps_user_id_key on public.verification_otps (user_id);

alter table public.verification_otps enable row level security;

-- No policies: only service role (edge functions) reads/writes OTP rows.

-- Private bucket for ID + enrolment (create if missing)
insert into storage.buckets (id, name, public)
values ('student-documents', 'student-documents', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Students upload own student-documents folder" on storage.objects;
drop policy if exists "Students update own student-documents folder" on storage.objects;
drop policy if exists "Students delete own student-documents folder" on storage.objects;
drop policy if exists "Students read own student-documents folder" on storage.objects;
drop policy if exists "Platform admins read student-documents" on storage.objects;

-- First path segment = auth user id
create policy "Students upload own student-documents folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'student-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Students update own student-documents folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'student-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'student-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Students delete own student-documents folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'student-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Students read own student-documents folder"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'student-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Align with supabase/admin_rls_policies.sql admin emails (JWT email claim)
create policy "Platform admins read student-documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'student-documents'
    and lower(trim(coalesce(auth.jwt() ->> 'email', ''))) in ('hello@quni.com.au')
  );
