-- Date-aware availability: overlap with confirmed/active bookings (incl. open-ended tenancies).

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
    array_agg(distinct b.property_id) filter (where b.property_id is not null),
    '{}'::uuid[]
  )
  from public.bookings b
  where b.property_id = any(p_property_ids)
    and b.status in ('confirmed', 'active')
    and b.start_date < coalesce(p_move_out_date, '9999-12-31'::date)
    and coalesce(b.end_date, '9999-12-31'::date) > p_move_in_date
    and (
      p_exclude_student_id is null
      or b.student_id is distinct from p_exclude_student_id
    );
$$;

comment on function public.property_availability_check(uuid[], date, date, uuid) is
  'Returns property ids in p_property_ids that are not available for [p_move_in_date, p_move_out_date] due to a confirmed/active booking (open-ended bookings count as indefinite).';

revoke all on function public.property_availability_check(uuid[], date, date, uuid) from public;
grant execute on function public.property_availability_check(uuid[], date, date, uuid) to anon, authenticated;
