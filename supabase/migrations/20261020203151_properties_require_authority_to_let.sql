-- Reject going live without authority to let, and reject clearing that stamp
-- while a listing stays live. An update of an already-active row that does
-- neither is allowed. Draft and paused rows may stay unattested.
-- Client publish writes the timestamp first, then sets status to active.

create or replace function public.trg_properties_require_authority_to_let()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status is not distinct from 'active'
       and new.authority_to_let_attested_at is null then
      raise exception 'Confirm authority to let before this listing can go live.'
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

  return new;
end;
$$;

drop trigger if exists properties_require_authority_to_let on public.properties;
create trigger properties_require_authority_to_let
  before insert or update on public.properties
  for each row
  execute function public.trg_properties_require_authority_to_let();
