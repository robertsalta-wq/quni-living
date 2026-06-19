-- Tenant invite funnel timestamps for early product learning (opened → signup → booking).
-- Rob applies to prod before deploying code that reads these columns.

alter table public.tenant_invites
  add column if not exists first_opened_at timestamptz,
  add column if not exists last_opened_at timestamptz,
  add column if not exists signup_started_at timestamptz,
  add column if not exists booking_started_at timestamptz,
  add column if not exists booking_submitted_at timestamptz;

comment on column public.tenant_invites.first_opened_at is
  'First time the invite landing page (/invite/:token) resolved a pending invite.';
comment on column public.tenant_invites.last_opened_at is
  'Most recent invite landing page view.';
comment on column public.tenant_invites.signup_started_at is
  'Prospect opened signup in the invite flow (first occurrence).';
comment on column public.tenant_invites.booking_started_at is
  'Prospect opened the booking flow with invite token (first occurrence).';
comment on column public.tenant_invites.booking_submitted_at is
  'Prospect submitted a booking request via the invite flow (first occurrence).';

-- Record link opens when the invite landing page resolves a pending invite.
create or replace function public.resolve_tenant_invite(p_token text)
returns table (
  property_id uuid,
  property_slug text,
  student_only boolean,
  invite_status text,
  invited_email text,
  invited_name text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  inv public.tenant_invites%rowtype;
  prop public.properties%rowtype;
begin
  if p_token is null or length(trim(p_token)) < 16 then
    return query select null::uuid, null::text, null::boolean, 'invalid'::text, null::text, null::text;
    return;
  end if;

  v_hash := encode(digest(trim(p_token), 'sha256'::text), 'hex');

  select * into inv
  from public.tenant_invites ti
  where ti.token_hash = v_hash
  limit 1;

  if not found then
    return query select null::uuid, null::text, null::boolean, 'invalid'::text, null::text, null::text;
    return;
  end if;

  if inv.status = 'pending' and inv.expires_at < now() then
    update public.tenant_invites
    set status = 'expired', updated_at = now()
    where id = inv.id;
    inv.status := 'expired';
  end if;

  if inv.status = 'pending' then
    update public.tenant_invites
    set
      first_opened_at = coalesce(first_opened_at, now()),
      last_opened_at = now(),
      updated_at = now()
    where id = inv.id;
  end if;

  select * into prop from public.properties p where p.id = inv.property_id limit 1;

  if not found then
    return query select null::uuid, null::text, null::boolean, 'invalid'::text, null::text, null::text;
    return;
  end if;

  return query
  select
    prop.id,
    prop.slug,
    (coalesce(prop.open_to_non_students, false) = false),
    inv.status,
    inv.invited_email,
    inv.invited_name;
end;
$$;

revoke all on function public.resolve_tenant_invite(text) from public;
grant execute on function public.resolve_tenant_invite(text) to anon, authenticated;

-- Later funnel stages (signup, booking) — callable with the secret invite token.
create or replace function public.record_tenant_invite_funnel_event(p_token text, p_event text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_id uuid;
begin
  if p_token is null or length(trim(p_token)) < 16 then
    return false;
  end if;

  if p_event not in ('signup_started', 'booking_started', 'booking_submitted') then
    return false;
  end if;

  v_hash := encode(digest(trim(p_token), 'sha256'::text), 'hex');

  select ti.id into v_id
  from public.tenant_invites ti
  where ti.token_hash = v_hash
    and ti.status = 'pending'
    and ti.expires_at >= now()
  limit 1;

  if not found then
    return false;
  end if;

  if p_event = 'signup_started' then
    update public.tenant_invites
    set signup_started_at = coalesce(signup_started_at, now()), updated_at = now()
    where id = v_id and signup_started_at is null;
  elsif p_event = 'booking_started' then
    update public.tenant_invites
    set booking_started_at = coalesce(booking_started_at, now()), updated_at = now()
    where id = v_id and booking_started_at is null;
  elsif p_event = 'booking_submitted' then
    update public.tenant_invites
    set booking_submitted_at = coalesce(booking_submitted_at, now()), updated_at = now()
    where id = v_id and booking_submitted_at is null;
  end if;

  return true;
end;
$$;

revoke all on function public.record_tenant_invite_funnel_event(text, text) from public;
grant execute on function public.record_tenant_invite_funnel_event(text, text) to anon, authenticated;

comment on function public.record_tenant_invite_funnel_event(text, text) is
  'Record invite funnel stage from client when prospect has the raw token (signup / booking steps).';
