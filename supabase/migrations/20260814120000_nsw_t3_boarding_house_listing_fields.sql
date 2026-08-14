-- NSW T3 boarding-house occupancy agreement listing particulars.
-- Agents must not apply this to production. Rob runs this. Proceed?

alter table public.properties
  add column if not exists room_description text,
  add column if not exists shared_areas jsonb not null default '{}'::jsonb,
  add column if not exists additional_charges jsonb not null default '[]'::jsonb;

comment on column public.properties.room_description is
  'NSW T3 boarding-house room identifier printed on the Standard Occupancy Agreement. Required when the listing is NSW T3.';

comment on column public.properties.shared_areas is
  'NSW T3 shared-area ticks: kitchen, bathroom, common_room, laundry, other (text). Empty object means none selected.';

comment on column public.properties.additional_charges is
  'NSW T3 Annexure 2 rows: [{item, amount, when_due, how_calculated}]. Empty array omits Annexure 2.';
