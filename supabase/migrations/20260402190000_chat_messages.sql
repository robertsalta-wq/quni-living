-- Quni Living AI chat logging + rate limiting
-- Creates `public.chat_messages` for streaming chat assistant.

create table if not exists public.chat_messages (
  id uuid primary key default uuid_generate_v4(),

  -- Authenticated users (student/landlord/admin) can be logged here.
  user_id uuid references auth.users(id) on delete cascade,

  -- Visitor persona identifier (sessionStorage only). Used for visitors (logged-out) and rate limiting.
  visitor_session_id text,

  -- persona key used for prompt selection and UI copy
  persona text not null check (persona in ('student_renter', 'landlord', 'visitor')),

  -- Direction for rate limiting + history
  direction text not null check (direction in ('user', 'assistant')),

  -- Rate limiting / audit
  status text not null default 'ok' check (status in ('ok', 'error')),

  -- Optional grouping for future conversation threads
  conversation_id text,

  -- Optional: listing context ids for analytics/debugging
  listing_ids jsonb not null default '[]'::jsonb,

  message text not null,
  error_code text,

  created_at timestamptz not null default now(),

  -- For any row, at least one identity must exist.
  constraint chat_messages_identity_chk check (
    (user_id is not null) or (visitor_session_id is not null)
  )
);

create index if not exists chat_messages_user_id_created_at_idx
  on public.chat_messages (user_id, created_at desc);

create index if not exists chat_messages_visitor_session_id_created_at_idx
  on public.chat_messages (visitor_session_id, created_at desc);

create index if not exists chat_messages_persona_direction_created_at_idx
  on public.chat_messages (persona, direction, created_at desc);

alter table public.chat_messages enable row level security;

-- Authed users can select only their own chat messages.
create policy "Authed users can select own chat messages"
  on public.chat_messages for select
  using (
    auth.uid() is not null
    and user_id = auth.uid()
  );

-- Authed users can insert their own chat messages (future/defense; Edge uses service role).
create policy "Authed users can insert own chat messages"
  on public.chat_messages for insert
  with check (
    auth.uid() is not null
    and user_id = auth.uid()
  );

-- No visitor select policy on purpose: visitors (logged-out) never read history in this phase.

