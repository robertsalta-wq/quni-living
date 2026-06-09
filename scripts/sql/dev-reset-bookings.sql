-- Ephemeral dev-only helper: applied and dropped by scripts/dev-reset-bookings.mjs.
-- NOT part of the production migration set — do not add to supabase/migrations.

create or replace function public.dev_reset_bookings(
  p_booking_ids uuid[],
  p_dry_run boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_missing uuid[];
  v_blocked uuid[];
  v_counts jsonb := '{}'::jsonb;
  v_n bigint;
begin
  if p_booking_ids is null or array_length(p_booking_ids, 1) is null then
    raise exception 'p_booking_ids must be a non-empty uuid array';
  end if;

  select array_agg(req.id)
  into v_missing
  from unnest(p_booking_ids) as req(id)
  where not exists (select 1 from public.bookings b where b.id = req.id);

  if v_missing is not null then
    raise exception 'Unknown booking id(s): %', v_missing;
  end if;

  select array_agg(b.id)
  into v_blocked
  from public.bookings b
  where b.id = any (p_booking_ids)
    and b.status in ('confirmed', 'active', 'completed');

  if v_blocked is not null then
    raise exception
      'Refusing reset: booking(s) % have protected status (confirmed, active, or completed)',
      v_blocked;
  end if;

  select count(*) into v_n
  from public.qase_messages m
  where m.ticket_id in (
    select q.id from public.qase_tickets q where q.booking_id = any (p_booking_ids)
  );
  v_counts := v_counts || jsonb_build_object('qase_messages', v_n);

  select count(*) into v_n
  from public.qase_tickets q
  where q.booking_id = any (p_booking_ids);
  v_counts := v_counts || jsonb_build_object('qase_tickets', v_n);

  select count(*) into v_n
  from public.tenancy_documents td
  where td.tenancy_id in (
    select t.id from public.tenancies t where t.booking_id = any (p_booking_ids)
  );
  v_counts := v_counts || jsonb_build_object('tenancy_documents', v_n);

  select count(*) into v_n
  from public.tenancies t
  where t.booking_id = any (p_booking_ids);
  v_counts := v_counts || jsonb_build_object('tenancies', v_n);

  select count(*) into v_n
  from public.service_tier_events e
  where e.booking_id = any (p_booking_ids);
  v_counts := v_counts || jsonb_build_object('service_tier_events', v_n);

  select count(*) into v_n
  from public.payments p
  where p.booking_id = any (p_booking_ids);
  v_counts := v_counts || jsonb_build_object('payments', v_n);

  select count(*) into v_n
  from public.ai_matching_compliance_audit a
  where a.booking_id = any (p_booking_ids);
  v_counts := v_counts || jsonb_build_object('ai_matching_compliance_audit', v_n);

  select count(*) into v_n
  from public.booking_messages m
  where m.booking_id = any (p_booking_ids);
  v_counts := v_counts || jsonb_build_object('booking_messages', v_n);

  select count(*) into v_n
  from public.bonds bo
  where bo.booking_id = any (p_booking_ids);
  v_counts := v_counts || jsonb_build_object('bonds', v_n);

  select count(*) into v_n
  from public.bookings b
  where b.id = any (p_booking_ids);
  v_counts := v_counts || jsonb_build_object('bookings', v_n);

  if p_dry_run then
    return jsonb_build_object(
      'dry_run', true,
      'booking_ids', to_jsonb(p_booking_ids),
      'counts', v_counts
    );
  end if;

  delete from public.qase_messages m
  where m.ticket_id in (
    select q.id from public.qase_tickets q where q.booking_id = any (p_booking_ids)
  );

  delete from public.qase_tickets q
  where q.booking_id = any (p_booking_ids);

  delete from public.tenancy_documents td
  where td.tenancy_id in (
    select t.id from public.tenancies t where t.booking_id = any (p_booking_ids)
  );

  delete from public.tenancies t
  where t.booking_id = any (p_booking_ids);

  delete from public.service_tier_events e
  where e.booking_id = any (p_booking_ids);

  delete from public.payments p
  where p.booking_id = any (p_booking_ids);

  delete from public.ai_matching_compliance_audit a
  where a.booking_id = any (p_booking_ids);

  delete from public.bookings b
  where b.id = any (p_booking_ids);

  return jsonb_build_object(
    'dry_run', false,
    'booking_ids', to_jsonb(p_booking_ids),
    'counts', v_counts
  );
end;
$$;

revoke all on function public.dev_reset_bookings(uuid[], boolean) from public;
grant execute on function public.dev_reset_bookings(uuid[], boolean) to service_role;
