-- Platform staff allowlist (Unstash pattern). Admins stay in auth.users; access via platform_staff.

create table if not exists public.platform_staff (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null default 'admin' check (role in ('admin', 'support', 'moderator')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  constraint platform_staff_email_key unique (email)
);

comment on table public.platform_staff is
  'Platform admin/support allowlist. JWT email matched at login; not a separate auth table.';

create index if not exists platform_staff_email_lower_idx
  on public.platform_staff (lower(trim(email)));

insert into public.platform_staff (email, role, notes)
values ('hello@quni.com.au', 'admin', 'Bootstrap admin')
on conflict (email) do nothing;

create or replace function public.normalize_platform_staff_email()
returns trigger
language plpgsql
as $$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists platform_staff_normalize_email on public.platform_staff;
create trigger platform_staff_normalize_email
  before insert or update of email on public.platform_staff
  for each row execute function public.normalize_platform_staff_email();

drop trigger if exists platform_staff_set_updated_at on public.platform_staff;
create trigger platform_staff_set_updated_at
  before update on public.platform_staff
  for each row execute function public.set_updated_at();

create or replace function public.platform_staff_prevent_last_delete()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.platform_staff) <= 1 then
    raise exception 'Cannot remove the last platform staff member';
  end if;
  return old;
end;
$$;

drop trigger if exists platform_staff_prevent_last_delete on public.platform_staff;
create trigger platform_staff_prevent_last_delete
  before delete on public.platform_staff
  for each row execute function public.platform_staff_prevent_last_delete();

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_staff ps
    where ps.email = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

comment on function public.is_platform_admin() is
  'True when the authenticated JWT email exists in platform_staff.';

grant execute on function public.is_platform_admin() to authenticated;

alter table public.platform_staff enable row level security;

drop policy if exists "Platform staff readable by admins" on public.platform_staff;
create policy "Platform staff readable by admins"
  on public.platform_staff for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "Platform staff insertable by admins" on public.platform_staff;
create policy "Platform staff insertable by admins"
  on public.platform_staff for insert
  to authenticated
  with check (public.is_platform_admin());

drop policy if exists "Platform staff updatable by admins" on public.platform_staff;
create policy "Platform staff updatable by admins"
  on public.platform_staff for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Platform staff deletable by admins" on public.platform_staff;
create policy "Platform staff deletable by admins"
  on public.platform_staff for delete
  to authenticated
  using (public.is_platform_admin());

-- student-documents bucket: use is_platform_admin() instead of hardcoded email
drop policy if exists "Platform admins read student-documents" on storage.objects;
create policy "Platform admins read student-documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'student-documents'
    and public.is_platform_admin()
  );
