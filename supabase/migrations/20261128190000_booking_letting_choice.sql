-- Phase 2 room letting choices.
-- Stores how a room that is not shared was booked: sole (one person) or together
-- (two people, one agreement, one price).
-- Null on bookings made before this choice, and on shared rooms and entire places,
-- which still use occupant_count.
-- No backfill. Do not rewrite live rows. No bed value.
--
-- Not applied by the agent. Rob runs this in the SQL editor on Quni-Living-AU,
-- then records the ledger row. Do not supabase db push.

alter table public.bookings
  add column if not exists letting_choice text;

alter table public.bookings
  drop constraint if exists bookings_letting_choice_check;

alter table public.bookings
  add constraint bookings_letting_choice_check
  check (letting_choice is null or letting_choice in ('sole', 'together'));

comment on column public.bookings.letting_choice is
  'How this booking lets a room that is not shared: sole (one person at rent_per_week) or together (two people at together_weekly_rent). Null on older bookings and on shared rooms and entire places.';
