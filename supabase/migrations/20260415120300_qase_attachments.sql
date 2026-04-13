-- Qase: attachment metadata + private storage bucket qase-attachments.
-- Object path inside bucket: {ticket_id}/{filename} (first segment = ticket UUID).
-- Requires public.is_platform_admin() (see supabase/admin_rls_policies.sql).

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table public.qase_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.qase_tickets (id) on delete cascade,
  message_id uuid references public.qase_messages (id) on delete set null,
  file_name text not null,
  file_path text not null,
  file_size bigint not null,
  mime_type text not null,
  uploaded_by_id uuid,
  uploaded_by_type text not null,
  created_at timestamptz not null default now(),
  constraint qase_attachments_uploaded_by_type_chk check (
    uploaded_by_type in ('student', 'landlord', 'admin')
  )
);

create index qase_attachments_ticket_id_idx on public.qase_attachments (ticket_id);
create index qase_attachments_message_id_idx on public.qase_attachments (message_id);

comment on table public.qase_attachments is 'Support ticket file metadata; files live in storage bucket qase-attachments at path ticket_id/filename.';
comment on column public.qase_attachments.file_path is 'Path within bucket qase-attachments (e.g. {ticket_id}/original-name.pdf).';
comment on column public.qase_attachments.uploaded_by_id is 'Profile PK for student/landlord; may be auth user id or null for admin depending on app.';

-- ---------------------------------------------------------------------------
-- Table RLS
-- ---------------------------------------------------------------------------

alter table public.qase_attachments enable row level security;

drop policy if exists "Qase attachments admins all" on public.qase_attachments;
drop policy if exists "Qase attachments owners select" on public.qase_attachments;
drop policy if exists "Qase attachments owners insert" on public.qase_attachments;

create policy "Qase attachments admins all"
  on public.qase_attachments for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "Qase attachments owners select"
  on public.qase_attachments for select
  to authenticated
  using (
    exists (
      select 1
      from public.qase_tickets t
      where t.id = qase_attachments.ticket_id
        and (
          (
            t.submitted_by_type = 'student'
            and exists (
              select 1
              from public.student_profiles sp
              where sp.id = t.submitted_by_id
                and sp.user_id = auth.uid()
            )
          )
          or (
            t.submitted_by_type = 'landlord'
            and exists (
              select 1
              from public.landlord_profiles lp
              where lp.id = t.submitted_by_id
                and lp.user_id = auth.uid()
            )
          )
        )
    )
  );

create policy "Qase attachments owners insert"
  on public.qase_attachments for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.qase_tickets t
      where t.id = qase_attachments.ticket_id
        and (
          (
            t.submitted_by_type = 'student'
            and exists (
              select 1
              from public.student_profiles sp
              where sp.id = t.submitted_by_id
                and sp.user_id = auth.uid()
            )
          )
          or (
            t.submitted_by_type = 'landlord'
            and exists (
              select 1
              from public.landlord_profiles lp
              where lp.id = t.submitted_by_id
                and lp.user_id = auth.uid()
            )
          )
        )
        and uploaded_by_type = t.submitted_by_type
        and uploaded_by_id is not distinct from t.submitted_by_id
    )
    and (
      message_id is null
      or exists (
        select 1
        from public.qase_messages m
        where m.id = message_id
          and m.ticket_id = qase_attachments.ticket_id
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Storage bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'qase-attachments',
  'qase-attachments',
  false,
  20971520,
  array[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]::text[]
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Storage RLS (storage.objects)
-- ---------------------------------------------------------------------------

drop policy if exists "Qase attachments storage admins all" on storage.objects;
drop policy if exists "Qase attachments storage owners insert" on storage.objects;
drop policy if exists "Qase attachments storage owners select" on storage.objects;
drop policy if exists "Qase attachments storage owners update" on storage.objects;
drop policy if exists "Qase attachments storage owners delete" on storage.objects;

-- Admins: full access to objects in this bucket
create policy "Qase attachments storage admins all"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'qase-attachments'
    and public.is_platform_admin()
  )
  with check (
    bucket_id = 'qase-attachments'
    and public.is_platform_admin()
  );

-- Owners: upload only under {ticket_id}/... for tickets they own
create policy "Qase attachments storage owners insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'qase-attachments'
    and exists (
      select 1
      from public.qase_tickets t
      where t.id::text = (storage.foldername(name))[1]
        and (
          (
            t.submitted_by_type = 'student'
            and exists (
              select 1
              from public.student_profiles sp
              where sp.id = t.submitted_by_id
                and sp.user_id = auth.uid()
            )
          )
          or (
            t.submitted_by_type = 'landlord'
            and exists (
              select 1
              from public.landlord_profiles lp
              where lp.id = t.submitted_by_id
                and lp.user_id = auth.uid()
            )
          )
        )
    )
  );

-- Owners: read objects for their tickets (no anon / public)
create policy "Qase attachments storage owners select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'qase-attachments'
    and exists (
      select 1
      from public.qase_tickets t
      where t.id::text = (storage.foldername(name))[1]
        and (
          (
            t.submitted_by_type = 'student'
            and exists (
              select 1
              from public.student_profiles sp
              where sp.id = t.submitted_by_id
                and sp.user_id = auth.uid()
            )
          )
          or (
            t.submitted_by_type = 'landlord'
            and exists (
              select 1
              from public.landlord_profiles lp
              where lp.id = t.submitted_by_id
                and lp.user_id = auth.uid()
            )
          )
        )
    )
  );

create policy "Qase attachments storage owners update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'qase-attachments'
    and exists (
      select 1
      from public.qase_tickets t
      where t.id::text = (storage.foldername(name))[1]
        and (
          (
            t.submitted_by_type = 'student'
            and exists (
              select 1
              from public.student_profiles sp
              where sp.id = t.submitted_by_id
                and sp.user_id = auth.uid()
            )
          )
          or (
            t.submitted_by_type = 'landlord'
            and exists (
              select 1
              from public.landlord_profiles lp
              where lp.id = t.submitted_by_id
                and lp.user_id = auth.uid()
            )
          )
        )
    )
  )
  with check (
    bucket_id = 'qase-attachments'
    and exists (
      select 1
      from public.qase_tickets t
      where t.id::text = (storage.foldername(name))[1]
        and (
          (
            t.submitted_by_type = 'student'
            and exists (
              select 1
              from public.student_profiles sp
              where sp.id = t.submitted_by_id
                and sp.user_id = auth.uid()
            )
          )
          or (
            t.submitted_by_type = 'landlord'
            and exists (
              select 1
              from public.landlord_profiles lp
              where lp.id = t.submitted_by_id
                and lp.user_id = auth.uid()
            )
          )
        )
    )
  );

create policy "Qase attachments storage owners delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'qase-attachments'
    and exists (
      select 1
      from public.qase_tickets t
      where t.id::text = (storage.foldername(name))[1]
        and (
          (
            t.submitted_by_type = 'student'
            and exists (
              select 1
              from public.student_profiles sp
              where sp.id = t.submitted_by_id
                and sp.user_id = auth.uid()
            )
          )
          or (
            t.submitted_by_type = 'landlord'
            and exists (
              select 1
              from public.landlord_profiles lp
              where lp.id = t.submitted_by_id
                and lp.user_id = auth.uid()
            )
          )
        )
    )
  );
