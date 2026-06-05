-- =============================================================================
-- Peer messaging (chunk 1): conversations, messages, mask events, RLS, backfill.
-- Requires: platform_staff / is_platform_admin() (20260526120000).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- M1 - is_platform_admin() (no-op if already present)
-- ---------------------------------------------------------------------------
-- Function defined in 20260526120000_platform_staff.sql.

-- ---------------------------------------------------------------------------
-- M2 - conversations
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  landlord_profile_id uuid not null references public.landlord_profiles (id) on delete cascade,
  landlord_user_id uuid not null references auth.users (id) on delete cascade,
  tenant_user_id uuid not null references auth.users (id) on delete cascade,
  tenant_profile_id uuid references public.student_profiles (id) on delete set null,
  booking_id uuid references public.bookings (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'archived')),
  contact_unlocked_at timestamptz,
  last_message_at timestamptz not null default now(),
  last_message_preview text not null default '',
  landlord_last_read_at timestamptz,
  tenant_last_read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint conversations_property_tenant_key unique (property_id, tenant_user_id)
);

comment on table public.conversations is
  'One thread per property + tenant; pre-booking enquiries and post-booking chat share this row.';

create index if not exists conversations_landlord_inbox_idx
  on public.conversations (landlord_user_id, last_message_at desc);

create index if not exists conversations_tenant_inbox_idx
  on public.conversations (tenant_user_id, last_message_at desc);

create index if not exists conversations_booking_id_idx
  on public.conversations (booking_id)
  where booking_id is not null;

-- ---------------------------------------------------------------------------
-- M3 - conversation_messages
-- ---------------------------------------------------------------------------
create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_user_id uuid references auth.users (id) on delete set null,
  sender_role text not null check (sender_role in ('tenant', 'landlord', 'system')),
  kind text not null check (kind in ('user', 'system')),
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint conversation_messages_user_requires_sender check (
    kind <> 'user' or sender_user_id is not null
  )
);

comment on table public.conversation_messages is
  'Full body stored; mask at read for participants until contact_unlocked_at. System rows may omit sender_user_id.';

create index if not exists conversation_messages_conversation_created_idx
  on public.conversation_messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- M4 - message_contact_mask_events
-- ---------------------------------------------------------------------------
create table if not exists public.message_contact_mask_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  message_id uuid not null references public.conversation_messages (id) on delete cascade,
  sender_user_id uuid references auth.users (id) on delete set null,
  mask_type text not null check (mask_type in ('phone', 'email', 'url', 'social')),
  match_count int not null check (match_count > 0),
  content_dedup_hash text not null,
  created_at timestamptz not null default now()
);

comment on table public.message_contact_mask_events is
  'Audit of detected contact info in messages; content_dedup_hash is for dedup stats only, not privacy.';

create index if not exists message_contact_mask_events_conversation_created_idx
  on public.message_contact_mask_events (conversation_id, created_at desc);

create index if not exists message_contact_mask_events_sender_created_idx
  on public.message_contact_mask_events (sender_user_id, created_at desc)
  where sender_user_id is not null;

-- ---------------------------------------------------------------------------
-- M5 - bookings.conversation_id
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists conversation_id uuid references public.conversations (id) on delete set null;

create index if not exists bookings_conversation_id_idx
  on public.bookings (conversation_id)
  where conversation_id is not null;

comment on column public.bookings.conversation_id is
  'Links booking pipeline to the same peer thread as pre-booking messages.';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations c
    where c.id = p_conversation_id
      and (
        c.landlord_user_id = auth.uid()
        or c.tenant_user_id = auth.uid()
      )
  );
$$;

comment on function public.is_conversation_participant(uuid) is
  'True when auth.uid() is the landlord or tenant on the conversation.';

grant execute on function public.is_conversation_participant(uuid) to authenticated;

create or replace function public.conversations_fill_from_property()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.property_id is null then
    raise exception 'property_id is required';
  end if;

  select p.landlord_id, lp.user_id
  into new.landlord_profile_id, new.landlord_user_id
  from public.properties p
  join public.landlord_profiles lp on lp.id = p.landlord_id
  where p.id = new.property_id;

  if new.landlord_profile_id is null or new.landlord_user_id is null then
    raise exception 'Property has no landlord';
  end if;

  if new.tenant_profile_id is null then
    select sp.id
    into new.tenant_profile_id
    from public.student_profiles sp
    where sp.user_id = new.tenant_user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists conversations_fill_from_property on public.conversations;
create trigger conversations_fill_from_property
  before insert on public.conversations
  for each row execute function public.conversations_fill_from_property();

create or replace function public.conversations_guard_participant_update()
returns trigger
language plpgsql
as $$
begin
  if public.is_platform_admin() then
    return new;
  end if;

  if not (
    old.landlord_user_id = auth.uid()
    or old.tenant_user_id = auth.uid()
  ) then
    raise exception 'Not a conversation participant';
  end if;

  if to_jsonb(new) - 'landlord_last_read_at' - 'tenant_last_read_at'
     is distinct from to_jsonb(old) - 'landlord_last_read_at' - 'tenant_last_read_at' then
    raise exception 'Participants may only update read timestamps';
  end if;

  return new;
end;
$$;

drop trigger if exists conversations_guard_participant_update on public.conversations;
create trigger conversations_guard_participant_update
  before update on public.conversations
  for each row execute function public.conversations_guard_participant_update();

-- ---------------------------------------------------------------------------
-- M6 - RLS
-- ---------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.message_contact_mask_events enable row level security;

-- conversations
drop policy if exists "Conversation participants select" on public.conversations;
create policy "Conversation participants select"
  on public.conversations for select
  using (
    landlord_user_id = auth.uid()
    or tenant_user_id = auth.uid()
    or public.is_platform_admin()
  );

drop policy if exists "Tenants create conversations" on public.conversations;
create policy "Tenants create conversations"
  on public.conversations for insert
  with check (tenant_user_id = auth.uid());

drop policy if exists "Conversation participants update read" on public.conversations;
create policy "Conversation participants update read"
  on public.conversations for update
  using (
    landlord_user_id = auth.uid()
    or tenant_user_id = auth.uid()
    or public.is_platform_admin()
  )
  with check (
    landlord_user_id = auth.uid()
    or tenant_user_id = auth.uid()
    or public.is_platform_admin()
  );

drop policy if exists "Platform admins all conversations" on public.conversations;
create policy "Platform admins all conversations"
  on public.conversations for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- conversation_messages
drop policy if exists "Conversation messages participants select" on public.conversation_messages;
create policy "Conversation messages participants select"
  on public.conversation_messages for select
  using (
    public.is_conversation_participant(conversation_id)
    or public.is_platform_admin()
  );

drop policy if exists "Participants insert user messages" on public.conversation_messages;
create policy "Participants insert user messages"
  on public.conversation_messages for insert
  with check (
    kind = 'user'
    and sender_user_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
    and (
      (
        sender_role = 'tenant'
        and exists (
          select 1
          from public.conversations c
          where c.id = conversation_id
            and c.tenant_user_id = auth.uid()
        )
      )
      or (
        sender_role = 'landlord'
        and exists (
          select 1
          from public.conversations c
          where c.id = conversation_id
            and c.landlord_user_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "Platform admins all conversation_messages" on public.conversation_messages;
create policy "Platform admins all conversation_messages"
  on public.conversation_messages for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- message_contact_mask_events (admin read only; writes via service role)
drop policy if exists "Platform admins select mask events" on public.message_contact_mask_events;
create policy "Platform admins select mask events"
  on public.message_contact_mask_events for select
  using (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- M7 - Grants
-- ---------------------------------------------------------------------------
grant select, insert, update on public.conversations to authenticated;
grant select, insert on public.conversation_messages to authenticated;
-- mask_events: no grant to authenticated (service role + admin RLS)

-- ---------------------------------------------------------------------------
-- M8 - booking_messages freeze at cutover (read-only for app users)
-- ---------------------------------------------------------------------------
drop policy if exists "Landlord inserts booking messages" on public.booking_messages;
drop policy if exists "Student inserts booking messages" on public.booking_messages;

revoke insert on public.booking_messages from authenticated;

comment on table public.booking_messages is
  'Legacy booking review thread - frozen at peer messaging cutover. New chat uses conversation_messages.';

-- ---------------------------------------------------------------------------
-- M9 - Realtime publication
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.conversation_messages;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.conversations;
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- M10 - platform_config: contact_masking_enabled
-- ---------------------------------------------------------------------------
insert into public.platform_config (config_key, config_value, label, category, is_sensitive, sort_order)
values (
  'contact_masking_enabled',
  'true',
  'Mask contact info in message UI (mask_events always logged)',
  'messaging',
  false,
  10
)
on conflict (config_key) do nothing;

-- ---------------------------------------------------------------------------
-- M11 - Backfill enquiries → conversations (authenticated tenants only)
-- Skips rows with student_id null (anonymous legacy enquiries).
-- ---------------------------------------------------------------------------
insert into public.conversations (
  property_id,
  landlord_profile_id,
  landlord_user_id,
  tenant_user_id,
  tenant_profile_id,
  status,
  last_message_at,
  last_message_preview,
  created_at
)
select distinct on (e.property_id, sp.user_id)
  e.property_id,
  lp.id,
  lp.user_id,
  sp.user_id,
  sp.id,
  case when e.status = 'archived' then 'archived' else 'open' end,
  coalesce(e.replied_at, e.created_at),
  left(
    coalesce(nullif(trim(e.reply), ''), nullif(trim(e.message), '')),
    200
  ),
  e.created_at
from public.enquiries e
join public.student_profiles sp on sp.id = e.student_id
join public.properties p on p.id = e.property_id
join public.landlord_profiles lp on lp.id = coalesce(e.landlord_id, p.landlord_id)
where e.property_id is not null
  and e.student_id is not null
  and sp.user_id is not null
  and lp.user_id is not null
order by e.property_id, sp.user_id, e.created_at desc
on conflict (property_id, tenant_user_id) do nothing;

-- First message per backfilled thread (earliest enquiry in group)
insert into public.conversation_messages (
  conversation_id,
  sender_user_id,
  sender_role,
  kind,
  body,
  metadata,
  created_at
)
select
  c.id,
  sp.user_id,
  'tenant',
  'user',
  e.message,
  jsonb_build_object('backfill', 'enquiry', 'enquiryId', e.id),
  e.created_at
from public.enquiries e
join public.student_profiles sp on sp.id = e.student_id
join public.conversations c
  on c.property_id = e.property_id
  and c.tenant_user_id = sp.user_id
where e.student_id is not null
  and e.property_id is not null
  and not exists (
    select 1
    from public.conversation_messages cm
    where cm.conversation_id = c.id
      and cm.metadata ->> 'enquiryId' = e.id::text
  );

-- Landlord reply as second message when present
insert into public.conversation_messages (
  conversation_id,
  sender_user_id,
  sender_role,
  kind,
  body,
  metadata,
  created_at
)
select
  c.id,
  lp.user_id,
  'landlord',
  'user',
  e.reply,
  jsonb_build_object('backfill', 'enquiry_reply', 'enquiryId', e.id),
  e.replied_at
from public.enquiries e
join public.student_profiles sp on sp.id = e.student_id
join public.properties p on p.id = e.property_id
join public.landlord_profiles lp on lp.id = coalesce(e.landlord_id, p.landlord_id)
join public.conversations c
  on c.property_id = e.property_id
  and c.tenant_user_id = sp.user_id
where e.reply is not null
  and trim(e.reply) <> ''
  and e.replied_at is not null
  and e.student_id is not null
  and not exists (
    select 1
    from public.conversation_messages cm
    where cm.conversation_id = c.id
      and cm.metadata ->> 'enquiryId' = e.id::text
      and cm.metadata ->> 'backfill' = 'enquiry_reply'
  );

-- Refresh inbox fields from backfilled messages
update public.conversations c
set
  last_message_at = agg.max_at,
  last_message_preview = left(agg.preview_body, 200)
from (
  select
    cm.conversation_id,
    max(cm.created_at) as max_at,
    (
      array_agg(cm.body order by cm.created_at desc)
    )[1] as preview_body
  from public.conversation_messages cm
  group by cm.conversation_id
) agg
where c.id = agg.conversation_id;

-- Link bookings to conversations where property + tenant match
update public.bookings b
set conversation_id = c.id
from public.student_profiles sp,
  public.conversations c
where b.student_id = sp.id
  and b.property_id is not null
  and b.conversation_id is null
  and c.property_id = b.property_id
  and c.tenant_user_id = sp.user_id;
