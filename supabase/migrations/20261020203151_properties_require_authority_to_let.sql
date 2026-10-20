-- A listing cannot be inserted or updated to active unless authority to let
-- has been attested. Draft and paused rows may stay unattested.
-- Client publish writes the timestamp first, then sets status to active.

create or replace function public.trg_properties_require_authority_to_let()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from 'active' then
    return new;
  end if;

  if new.authority_to_let_attested_at is null then
    raise exception 'Confirm authority to let before this listing can go live.'
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
