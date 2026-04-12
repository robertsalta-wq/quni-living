-- Qase: internal support tickets (tables + enums + seeds). RLS in a follow-up migration.

create type public.qase_status as enum (
  'new',
  'open',
  'pending',
  'on_hold',
  'solved',
  'closed'
);

create type public.qase_priority as enum (
  'urgent',
  'high',
  'normal',
  'low'
);

create sequence public.qase_ticket_number_seq
  start with 1000
  increment by 1
  minvalue 1000
  no maxvalue
  cache 1;

create table public.qase_fields (
  id uuid primary key default gen_random_uuid(),
  field_type text not null,
  field_key text not null,
  label text not null,
  options jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.qase_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number integer not null default nextval('public.qase_ticket_number_seq'::regclass),
  submitted_by_type text not null,
  submitted_by_id uuid,
  booking_id uuid references public.bookings (id),
  property_id uuid references public.properties (id),
  status public.qase_status not null default 'new',
  priority public.qase_priority not null default 'normal',
  category text,
  received_via text not null,
  subject text not null,
  ai_suggested_category text,
  ai_suggested_priority text,
  ai_draft_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter sequence public.qase_ticket_number_seq owned by public.qase_tickets.ticket_number;

create table public.qase_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.qase_tickets (id),
  author_id uuid,
  author_type text not null,
  body text not null,
  is_internal_note boolean not null default false,
  created_at timestamptz not null default now()
);

create index qase_tickets_status_idx on public.qase_tickets (status);
create index qase_tickets_submitted_by_id_idx on public.qase_tickets (submitted_by_id);
create index qase_tickets_booking_id_idx on public.qase_tickets (booking_id);
create index qase_tickets_property_id_idx on public.qase_tickets (property_id);
create index qase_messages_ticket_id_idx on public.qase_messages (ticket_id);

insert into public.qase_fields (field_type, field_key, label, sort_order)
values
  ('category', 'booking_issue', 'Booking issue', 10),
  ('category', 'payment_payout', 'Payment / payout', 20),
  ('category', 'verification', 'Verification', 30),
  ('category', 'property_listing', 'Property / listing', 40),
  ('category', 'lease_document', 'Lease / document', 50),
  ('category', 'other', 'Other', 60),
  ('priority', 'urgent', 'Urgent', 10),
  ('priority', 'high', 'High', 20),
  ('priority', 'normal', 'Normal', 30),
  ('priority', 'low', 'Low', 40);

drop trigger if exists qase_tickets_updated_at on public.qase_tickets;
create trigger qase_tickets_updated_at
  before update on public.qase_tickets
  for each row execute function public.set_updated_at();
