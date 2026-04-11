-- Date-aware availability:
-- 1) Confirmed/active bookings overlapping the requested move-in / move-out range.
-- 2) Property listing window (available_from / available_to) when set.

alter table public.properties add column if not exists available_from date;
alter table public.properties add column if not exists available_to date;

comment on column public.properties.available_from is
  'First date a move-in is accepted for this listing (null = no lower bound).';
comment on column public.properties.available_to is
  'Last date covered by the listing window (null = no upper bound; tenancy must not extend past this when set).';

drop function if exists public.property_ids_leased_to_others(uuid[], uuid);

create or replace function public.property_availability_check(
  p_property_ids uuid[],
  p_move_in_date date,
  p_move_out_date date default null,
  p_exclude_student_id uuid default null
)
returns uuid[]
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    array_agg(distinct pid) filter (where pid is not null),
    '{}'::uuid[]
  )
  from (
    select b.property_id as pid
    from public.bookings b
    where b.property_id = any(p_property_ids)
      and b.status in ('confirmed', 'active')
      and b.start_date < coalesce(p_move_out_date, '9999-12-31'::date)
      and coalesce(b.end_date, '9999-12-31'::date) > p_move_in_date
      and (
        p_exclude_student_id is null
        or b.student_id is distinct from p_exclude_student_id
      )
    union
    select p.id as pid
    from public.properties p
    where p.id = any(p_property_ids)
      and (
        (p.available_from is not null and p_move_in_date < p.available_from)
        or (p.available_to is not null and p_move_in_date > p.available_to)
        or (
          p.available_to is not null
          and coalesce(p_move_out_date, '9999-12-31'::date) > p.available_to
        )
      )
  ) x(pid);
$$;

comment on function public.property_availability_check(uuid[], date, date, uuid) is
  'Returns property ids in p_property_ids that are not available: overlapping confirmed/active booking, or move-in/move-out outside available_from/available_to.';

revoke all on function public.property_availability_check(uuid[], date, date, uuid) from public;
grant execute on function public.property_availability_check(uuid[], date, date, uuid) to anon, authenticated;
