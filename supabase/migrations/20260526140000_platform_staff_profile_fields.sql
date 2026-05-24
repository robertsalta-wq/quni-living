-- Optional display name + auth.users link for platform_staff rows.

alter table public.platform_staff
  add column if not exists display_name text,
  add column if not exists user_id uuid references auth.users (id) on delete set null;

comment on column public.platform_staff.display_name is
  'Optional label shown in Admin → Team (e.g. full name).';
comment on column public.platform_staff.user_id is
  'Linked auth.users id after staff first logs in with matching email.';

create unique index if not exists platform_staff_user_id_key
  on public.platform_staff (user_id)
  where user_id is not null;
