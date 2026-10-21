-- Extend the authority-to-let guard so a head tenant cannot go live, or
-- become a head tenant while live, without head_tenant_landlord_consent_at.
-- Clearing that timestamp on a live head-tenant row is rejected.
-- Other updates of an already-live row are allowed, including the QLD listing
-- that has been live since June with no consent recorded.
-- A role that is not head_tenant never keeps a consent timestamp.
-- Do not apply this until the client that writes the timestamp is on Production.

create or replace function public.trg_properties_require_authority_to_let()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.lister_role is distinct from 'head_tenant' then
    new.head_tenant_landlord_consent_at := null;
  end if;

  if tg_op = 'INSERT' then
    if new.status is not distinct from 'active'
       and new.authority_to_let_attested_at is null then
      raise exception 'Confirm authority to let before this listing can go live.'
        using errcode = 'check_violation';
    end if;
    if new.status is not distinct from 'active'
       and new.lister_role is not distinct from 'head_tenant'
       and new.head_tenant_landlord_consent_at is null then
      raise exception 'Confirm written landlord consent before this listing can go live.'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if new.status is not distinct from 'active'
     and old.status is distinct from 'active'
     and new.authority_to_let_attested_at is null then
    raise exception 'Confirm authority to let before this listing can go live.'
      using errcode = 'check_violation';
  end if;

  if new.status is not distinct from 'active'
     and old.authority_to_let_attested_at is not null
     and new.authority_to_let_attested_at is null then
    raise exception 'Authority to let cannot be cleared while this listing is live.'
      using errcode = 'check_violation';
  end if;

  if new.status is not distinct from 'active'
     and new.lister_role is not distinct from 'head_tenant'
     and old.head_tenant_landlord_consent_at is not null
     and new.head_tenant_landlord_consent_at is null then
    raise exception 'Head-tenant landlord consent cannot be cleared while this listing is live.'
      using errcode = 'check_violation';
  end if;

  if new.status is not distinct from 'active'
     and new.lister_role is not distinct from 'head_tenant'
     and new.head_tenant_landlord_consent_at is null
     and (
       old.status is distinct from 'active'
       or old.lister_role is distinct from 'head_tenant'
     ) then
    raise exception 'Confirm written landlord consent before this listing can go live.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists properties_require_authority_to_let on public.properties;
create trigger properties_require_authority_to_let
  before insert or update on public.properties
  for each row
  execute function public.trg_properties_require_authority_to_let();
