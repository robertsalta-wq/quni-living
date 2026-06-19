-- Fix resolve_tenant_invite: pgcrypto digest() lives in extensions schema on Supabase hosted.
-- Without extensions on search_path the RPC errors: function digest(text, unknown) does not exist.

create extension if not exists pgcrypto with schema extensions;

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
