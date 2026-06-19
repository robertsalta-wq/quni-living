-- Landlord-initiated tenant invites: deep-link external prospects into the standard renter booking flow.
-- Rob applies this migration to prod before deploying code that depends on it.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- tenant_invites
-- ---------------------------------------------------------------------------
create table if not exists public.tenant_invites (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  landlord_id uuid not null references public.landlord_profiles (id) on delete cascade,
  invited_email text,
  invited_name text,
  landlord_note text,
  token_hash text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_by uuid references public.student_profiles (id) on delete set null,
  accepted_booking_id uuid references public.bookings (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tenant_invites is
  'Landlord copy-link invites for external tenant sourcing; token_hash only (never raw token).';
comment on column public.tenant_invites.invited_email is
  'Prefill hint for signup UI only — not matched against the renter account email.';
comment on column public.tenant_invites.landlord_note is
  'Optional landlord note at invite creation; not shown to the prospect (no platform email yet).';

create index if not exists tenant_invites_property_id_idx on public.tenant_invites (property_id);
create index if not exists tenant_invites_landlord_id_idx on public.tenant_invites (landlord_id);
create index if not exists tenant_invites_status_idx on public.tenant_invites (status)
  where status = 'pending';

alter table public.tenant_invites enable row level security;

drop policy if exists tenant_invites_landlord_select on public.tenant_invites;
create policy tenant_invites_landlord_select on public.tenant_invites
  for select to authenticated
  using (
    landlord_id in (
      select lp.id from public.landlord_profiles lp where lp.user_id = auth.uid()
    )
  );

drop policy if exists tenant_invites_landlord_insert on public.tenant_invites;
create policy tenant_invites_landlord_insert on public.tenant_invites
  for insert to authenticated
  with check (
    landlord_id in (
      select lp.id from public.landlord_profiles lp where lp.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.properties p
      where p.id = property_id
        and p.landlord_id = tenant_invites.landlord_id
        and p.status = 'active'
        and p.service_tier = 'listing'
    )
  );

drop policy if exists tenant_invites_landlord_update on public.tenant_invites;
create policy tenant_invites_landlord_update on public.tenant_invites
  for update to authenticated
  using (
    landlord_id in (
      select lp.id from public.landlord_profiles lp where lp.user_id = auth.uid()
    )
  )
  with check (
    landlord_id in (
      select lp.id from public.landlord_profiles lp where lp.user_id = auth.uid()
    )
  );

drop policy if exists tenant_invites_landlord_delete on public.tenant_invites;
create policy tenant_invites_landlord_delete on public.tenant_invites
  for delete to authenticated
  using (
    landlord_id in (
      select lp.id from public.landlord_profiles lp where lp.user_id = auth.uid()
    )
  );

-- Optional provenance link on bookings (listing-tier invite path).
alter table public.bookings
  add column if not exists tenant_invite_id uuid references public.tenant_invites (id) on delete set null;

comment on column public.bookings.tenant_invite_id is
  'Set when a booking request is created via a landlord tenant invite link.';

-- ---------------------------------------------------------------------------
-- Public token resolution (no broad table read)
-- ---------------------------------------------------------------------------
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
stable
security definer
set search_path = public
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

  v_hash := encode(digest(trim(p_token), 'sha256'), 'hex');

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

comment on function public.resolve_tenant_invite(text) is
  'Hash lookup for /invite/:token — property id/slug, student_only, status, and optional invitee hints for signup prefill.';
