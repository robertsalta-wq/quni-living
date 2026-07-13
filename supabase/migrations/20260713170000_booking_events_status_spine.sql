-- Stage 3: booking status spine — AFTER UPDATE trigger on curated bookings columns.
-- Emits booking.status_changed (audience=both) and booking.field_changed (audience=internal)
-- into booking_events via insert_booking_event. Same transaction as the UPDATE (fail-closed).
--
-- Actor enrichment: optional session vars quni.actor_type / quni.actor_id / quni.actor_label
-- (see set_booking_event_actor). These only apply when set in the SAME database transaction
-- as the UPDATE — PostgREST separate HTTP calls do not share sessions; domain events
-- (Stages 4–6) carry actor when the trigger row stays system.
--
-- Rob applies this to prod before merging application code that depends on it.
-- Agent must not supabase db push to production.
-- Forward-only; no backfill.

-- ---------------------------------------------------------------------------
-- 1. Optional actor session helper (same-transaction use only)
-- ---------------------------------------------------------------------------
create or replace function public.set_booking_event_actor(
  p_actor_type text default 'system',
  p_actor_id uuid default null,
  p_actor_label text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text := coalesce(nullif(trim(p_actor_type), ''), 'system');
begin
  if v_type not in ('system', 'student', 'landlord', 'admin', 'webhook', 'cron') then
    raise exception 'set_booking_event_actor: invalid actor_type %', v_type;
  end if;

  perform set_config('quni.actor_type', v_type, true);
  perform set_config(
    'quni.actor_id',
    case when p_actor_id is null then '' else p_actor_id::text end,
    true
  );
  perform set_config(
    'quni.actor_label',
    coalesce(p_actor_label, ''),
    true
  );
end;
$$;

comment on function public.set_booking_event_actor is
  'Set transaction-local actor for booking_events trigger rows. Must run in the same transaction as the bookings UPDATE.';

revoke all on function public.set_booking_event_actor(text, uuid, text) from public, anon, authenticated;
grant execute on function public.set_booking_event_actor(text, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 2. Bookings UPDATE → booking_events
-- ---------------------------------------------------------------------------
create or replace function public.trg_bookings_log_booking_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_type text;
  v_actor_id uuid;
  v_actor_label text;
  v_actor_id_raw text;
  v_changes jsonb;
begin
  v_actor_type := nullif(current_setting('quni.actor_type', true), '');
  if v_actor_type is null
     or v_actor_type not in ('system', 'student', 'landlord', 'admin', 'webhook', 'cron') then
    v_actor_type := 'system';
  end if;

  v_actor_id := null;
  v_actor_id_raw := nullif(current_setting('quni.actor_id', true), '');
  if v_actor_id_raw is not null then
    begin
      v_actor_id := v_actor_id_raw::uuid;
    exception
      when invalid_text_representation then
        v_actor_id := null;
    end;
  end if;

  v_actor_label := nullif(trim(current_setting('quni.actor_label', true)), '');

  if old.status is distinct from new.status then
    v_changes := jsonb_build_array(
      jsonb_build_object(
        'field', 'status',
        'old', to_jsonb(old.status),
        'new', to_jsonb(new.status)
      )
    );
    perform public.insert_booking_event(
      p_event_type := 'booking.status_changed',
      p_booking_id := new.id,
      p_landlord_id := new.landlord_id,
      p_student_id := new.student_id,
      p_audience := 'both',
      p_outcome := 'n/a',
      p_actor_type := v_actor_type,
      p_actor_id := v_actor_id,
      p_actor_label := v_actor_label,
      p_changes := v_changes,
      p_metadata := jsonb_build_object('source', 'trigger')
    );
  end if;

  if old.listing_agreement_status is distinct from new.listing_agreement_status then
    v_changes := jsonb_build_array(
      jsonb_build_object(
        'field', 'listing_agreement_status',
        'old', to_jsonb(old.listing_agreement_status),
        'new', to_jsonb(new.listing_agreement_status)
      )
    );
    perform public.insert_booking_event(
      p_event_type := 'booking.field_changed',
      p_booking_id := new.id,
      p_landlord_id := new.landlord_id,
      p_student_id := new.student_id,
      p_audience := 'internal',
      p_outcome := 'n/a',
      p_actor_type := v_actor_type,
      p_actor_id := v_actor_id,
      p_actor_label := v_actor_label,
      p_changes := v_changes,
      p_metadata := jsonb_build_object('source', 'trigger', 'field', 'listing_agreement_status')
    );
  end if;

  if old.bond_received_by_landlord_at is distinct from new.bond_received_by_landlord_at then
    v_changes := jsonb_build_array(
      jsonb_build_object(
        'field', 'bond_received_by_landlord_at',
        'old', to_jsonb(old.bond_received_by_landlord_at),
        'new', to_jsonb(new.bond_received_by_landlord_at)
      )
    );
    perform public.insert_booking_event(
      p_event_type := 'booking.field_changed',
      p_booking_id := new.id,
      p_landlord_id := new.landlord_id,
      p_student_id := new.student_id,
      p_audience := 'internal',
      p_outcome := 'n/a',
      p_actor_type := v_actor_type,
      p_actor_id := v_actor_id,
      p_actor_label := v_actor_label,
      p_changes := v_changes,
      p_metadata := jsonb_build_object('source', 'trigger', 'field', 'bond_received_by_landlord_at')
    );
  end if;

  if old.booking_fee_paid is distinct from new.booking_fee_paid then
    v_changes := jsonb_build_array(
      jsonb_build_object(
        'field', 'booking_fee_paid',
        'old', to_jsonb(old.booking_fee_paid),
        'new', to_jsonb(new.booking_fee_paid)
      )
    );
    perform public.insert_booking_event(
      p_event_type := 'booking.field_changed',
      p_booking_id := new.id,
      p_landlord_id := new.landlord_id,
      p_student_id := new.student_id,
      p_audience := 'internal',
      p_outcome := 'n/a',
      p_actor_type := v_actor_type,
      p_actor_id := v_actor_id,
      p_actor_label := v_actor_label,
      p_changes := v_changes,
      p_metadata := jsonb_build_object('source', 'trigger', 'field', 'booking_fee_paid')
    );
  end if;

  if old.expired_at is distinct from new.expired_at then
    v_changes := jsonb_build_array(
      jsonb_build_object(
        'field', 'expired_at',
        'old', to_jsonb(old.expired_at),
        'new', to_jsonb(new.expired_at)
      )
    );
    perform public.insert_booking_event(
      p_event_type := 'booking.field_changed',
      p_booking_id := new.id,
      p_landlord_id := new.landlord_id,
      p_student_id := new.student_id,
      p_audience := 'internal',
      p_outcome := 'n/a',
      p_actor_type := v_actor_type,
      p_actor_id := v_actor_id,
      p_actor_label := v_actor_label,
      p_changes := v_changes,
      p_metadata := jsonb_build_object('source', 'trigger', 'field', 'expired_at')
    );
  end if;

  if old.declined_at is distinct from new.declined_at then
    v_changes := jsonb_build_array(
      jsonb_build_object(
        'field', 'declined_at',
        'old', to_jsonb(old.declined_at),
        'new', to_jsonb(new.declined_at)
      )
    );
    perform public.insert_booking_event(
      p_event_type := 'booking.field_changed',
      p_booking_id := new.id,
      p_landlord_id := new.landlord_id,
      p_student_id := new.student_id,
      p_audience := 'internal',
      p_outcome := 'n/a',
      p_actor_type := v_actor_type,
      p_actor_id := v_actor_id,
      p_actor_label := v_actor_label,
      p_changes := v_changes,
      p_metadata := jsonb_build_object('source', 'trigger', 'field', 'declined_at')
    );
  end if;

  return new;
end;
$$;

comment on function public.trg_bookings_log_booking_events is
  'Append booking.status_changed / booking.field_changed rows on curated bookings column updates.';

drop trigger if exists bookings_log_booking_events on public.bookings;
create trigger bookings_log_booking_events
  after update of
    status,
    listing_agreement_status,
    bond_received_by_landlord_at,
    booking_fee_paid,
    expired_at,
    declined_at
  on public.bookings
  for each row
  execute function public.trg_bookings_log_booking_events();
