-- Expose which properties have a confirmed or active tenancy (for listings/detail/booking UX).
-- Bookings RLS hides other students' rows; this RPC runs as definer and only returns property ids.

create or replace function public.property_ids_leased_to_others(
  p_property_ids uuid[],
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
  where
    b.property_id = any(p_property_ids)
    and b.status in ('confirmed', 'active')
    and (
      p_exclude_student_id is null
      or b.student_id is distinct from p_exclude_student_id
    );
$$;

comment on function public.property_ids_leased_to_others(uuid[], uuid) is
  'Property ids in p_property_ids that have a confirmed or active booking held by someone other than p_exclude_student_id (omit or null = any tenant).';

revoke all on function public.property_ids_leased_to_others(uuid[], uuid) from public;
grant execute on function public.property_ids_leased_to_others(uuid[], uuid) to anon, authenticated;
