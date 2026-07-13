-- Harden grants after booking_events foundation (Stage 1).
-- Supabase default privileges grant ALL on new public tables to anon/authenticated,
-- including TRUNCATE (not covered by RLS or row-level append-only triggers).
-- Prod already applied 20260713150000; this migration closes that hole.
--
-- Rob may have applied this SQL via SQL Editor before the file landed in git;
-- statements are idempotent.

-- ---------------------------------------------------------------------------
-- booking_events
-- ---------------------------------------------------------------------------
revoke all on table public.booking_events from anon;

revoke insert, update, delete, truncate, references, trigger
  on table public.booking_events
  from authenticated;

-- authenticated keeps SELECT (landlord / student / admin RLS).

-- ---------------------------------------------------------------------------
-- provider_webhook_health
-- ---------------------------------------------------------------------------
revoke all on table public.provider_webhook_health from anon;

revoke insert, update, delete, truncate, references, trigger
  on table public.provider_webhook_health
  from authenticated;

-- authenticated keeps SELECT (admin RLS only).

-- ---------------------------------------------------------------------------
-- TRUNCATE statement triggers (RLS + row triggers do not cover TRUNCATE)
-- ---------------------------------------------------------------------------
create or replace function public.trg_forbid_truncate()
returns trigger
language plpgsql
as $$
begin
  raise exception 'TRUNCATE forbidden on %', tg_table_name
    using errcode = 'restrict_violation';
end;
$$;

drop trigger if exists booking_events_no_truncate on public.booking_events;
create trigger booking_events_no_truncate
  before truncate on public.booking_events
  for each statement
  execute function public.trg_forbid_truncate();

drop trigger if exists provider_webhook_health_no_truncate on public.provider_webhook_health;
create trigger provider_webhook_health_no_truncate
  before truncate on public.provider_webhook_health
  for each statement
  execute function public.trg_forbid_truncate();

-- Belt-and-braces: JWT roles must not call write helpers directly.
revoke all on function public.insert_booking_event(
  text, uuid, uuid, uuid, timestamptz, text, text, text, uuid, text,
  jsonb, text, text, text, text, uuid, jsonb, smallint
) from public, anon, authenticated;

revoke all on function public.touch_provider_webhook_health(text, text, text)
  from public, anon, authenticated;

grant execute on function public.insert_booking_event(
  text, uuid, uuid, uuid, timestamptz, text, text, text, uuid, text,
  jsonb, text, text, text, text, uuid, jsonb, smallint
) to service_role;

grant execute on function public.touch_provider_webhook_health(text, text, text)
  to service_role;
