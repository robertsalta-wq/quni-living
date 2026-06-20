-- Phase 2: optional special weekly rent offer on landlord tenant invites.
-- Rob applies to prod before deploying code that reads offered_weekly_rent / offer_reason.

alter table public.tenant_invites
  add column if not exists offered_weekly_rent numeric(10, 2),
  add column if not exists offer_reason text;

comment on column public.tenant_invites.offered_weekly_rent is
  'Optional fixed weekly rent (AUD) offered to this invitee. Must not exceed listing rent at apply.';
comment on column public.tenant_invites.offer_reason is
  'Optional note shown to the invitee about the special rent offer.';

drop function if exists public.resolve_tenant_invite(text);

create or replace function public.resolve_tenant_invite(p_token text)
returns table (
  property_id uuid,
  property_slug text,
  student_only boolean,
  invite_status text,
  invited_email text,
  invited_name text,
  offered_weekly_rent numeric,
  offer_reason text
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  inv public.tenant_invites%rowtype;
  prop public.properties%rowtype;
begin
  if p_token is null or length(trim(p_token)) < 16 then
    return query select null::uuid, null::text, null::boolean, 'invalid'::text, null::text, null::text, null::numeric, null::text;
    return;
  end if;

  v_hash := encode(digest(trim(p_token), 'sha256'::text), 'hex');

  select * into inv
  from public.tenant_invites ti
  where ti.token_hash = v_hash
  limit 1;

  if not found then
    return query select null::uuid, null::text, null::boolean, 'invalid'::text, null::text, null::text, null::numeric, null::text;
    return;
  end if;

  if inv.status = 'pending' and inv.expires_at < now() then
    update public.tenant_invites
    set status = 'expired', updated_at = now()
    where id = inv.id;
    inv.status := 'expired';
  end if;

  select * into prop from public.properties p where p.id = inv.property_id limit 1;

  if not found then
    return query select null::uuid, null::text, null::boolean, 'invalid'::text, null::text, null::text, null::numeric, null::text;
    return;
  end if;

  return query
  select
    prop.id,
    prop.slug,
    (coalesce(prop.open_to_non_students, false) = false),
    inv.status,
    inv.invited_email,
    inv.invited_name,
    inv.offered_weekly_rent,
    inv.offer_reason;
end;
$$;

revoke all on function public.resolve_tenant_invite(text) from public;
grant execute on function public.resolve_tenant_invite(text) to anon, authenticated;

comment on function public.resolve_tenant_invite(text) is
  'Hash lookup for /invite/:token — property, status, invitee hints, and optional special rent offer.';
