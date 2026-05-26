-- Internal fee-exempt allowlist (admin Business settings). Landlords matching email pay no platform fees.

create table if not exists public.fee_exempt_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  constraint fee_exempt_accounts_email_key unique (email)
);

comment on table public.fee_exempt_accounts is
  'Admin allowlist: matching landlord emails bypass listing and managed platform fees.';

create index if not exists fee_exempt_accounts_email_lower_idx
  on public.fee_exempt_accounts (lower(trim(email)));

create or replace function public.normalize_fee_exempt_email()
returns trigger
language plpgsql
as $$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists fee_exempt_accounts_normalize_email on public.fee_exempt_accounts;
create trigger fee_exempt_accounts_normalize_email
  before insert or update of email on public.fee_exempt_accounts
  for each row execute function public.normalize_fee_exempt_email();

alter table public.landlord_profiles
  add column if not exists fee_exempt boolean not null default false;

comment on column public.landlord_profiles.fee_exempt is
  'Synced from fee_exempt_accounts; when true, platform fees are zero.';

create index if not exists landlord_profiles_email_lower_idx
  on public.landlord_profiles (lower(trim(email)));

create or replace function public.sync_landlord_fee_exempt_for_email(target_email text, is_exempt boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  norm text := lower(trim(coalesce(target_email, '')));
begin
  if norm = '' then
    return;
  end if;

  if is_exempt then
    update public.landlord_profiles
    set fee_exempt = true
    where lower(trim(coalesce(email, ''))) = norm;
  else
    update public.landlord_profiles
    set fee_exempt = false
    where lower(trim(coalesce(email, ''))) = norm
      and not exists (
        select 1
        from public.fee_exempt_accounts fe
        where fe.email = norm
      );
  end if;
end;
$$;

-- Keep fee_exempt in sync when landlord email changes or profile is created outside auth trigger.
create or replace function public.landlord_profiles_sync_fee_exempt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.fee_exempt := exists (
    select 1
    from public.fee_exempt_accounts fe
    where fe.email = lower(trim(coalesce(new.email, '')))
  );
  return new;
end;
$$;

drop trigger if exists landlord_profiles_sync_fee_exempt on public.landlord_profiles;
create trigger landlord_profiles_sync_fee_exempt
  before insert or update of email on public.landlord_profiles
  for each row execute function public.landlord_profiles_sync_fee_exempt();

create or replace function public.fee_exempt_accounts_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_landlord_fee_exempt_for_email(new.email, true);
  return new;
end;
$$;

create or replace function public.fee_exempt_accounts_after_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_landlord_fee_exempt_for_email(old.email, false);
  return old;
end;
$$;

drop trigger if exists fee_exempt_accounts_after_insert on public.fee_exempt_accounts;
create trigger fee_exempt_accounts_after_insert
  after insert on public.fee_exempt_accounts
  for each row execute function public.fee_exempt_accounts_after_insert();

drop trigger if exists fee_exempt_accounts_after_delete on public.fee_exempt_accounts;
create trigger fee_exempt_accounts_after_delete
  after delete on public.fee_exempt_accounts
  for each row execute function public.fee_exempt_accounts_after_delete();

alter table public.fee_exempt_accounts enable row level security;

drop policy if exists "Fee exempt accounts readable by admins" on public.fee_exempt_accounts;
create policy "Fee exempt accounts readable by admins"
  on public.fee_exempt_accounts for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "Fee exempt accounts insertable by admins" on public.fee_exempt_accounts;
create policy "Fee exempt accounts insertable by admins"
  on public.fee_exempt_accounts for insert
  to authenticated
  with check (public.is_platform_admin());

drop policy if exists "Fee exempt accounts updatable by admins" on public.fee_exempt_accounts;
create policy "Fee exempt accounts updatable by admins"
  on public.fee_exempt_accounts for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Fee exempt accounts deletable by admins" on public.fee_exempt_accounts;
create policy "Fee exempt accounts deletable by admins"
  on public.fee_exempt_accounts for delete
  to authenticated
  using (public.is_platform_admin());

-- Signup: fee-exempt when email is on the allowlist before profile insert.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nm text;
  route text;
  landlord_exempt boolean;
begin
  nm := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  route := nullif(trim(lower(new.raw_user_meta_data->>'accommodation_verification_route')), '');
  if route = 'identity' then
    route := 'non_student';
  end if;
  if route is not null and route not in ('student', 'non_student') then
    route := null;
  end if;

  if coalesce(new.raw_user_meta_data->>'role', '') = 'landlord' then
    select exists (
      select 1
      from public.fee_exempt_accounts fe
      where fe.email = lower(trim(coalesce(new.email, '')))
    )
    into landlord_exempt;

    insert into public.landlord_profiles (user_id, email, full_name, fee_exempt)
    values (new.id, new.email, nm, coalesce(landlord_exempt, false))
    on conflict (user_id) do nothing;
  else
    insert into public.student_profiles (user_id, email, full_name, accommodation_verification_route)
    values (new.id, new.email, nm, route)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;
