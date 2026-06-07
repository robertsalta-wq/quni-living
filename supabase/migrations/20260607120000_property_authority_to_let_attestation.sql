-- Per-listing attestation: landlord owns the property or holds written consent to sub-let/transfer.
-- Required before a listing can be published (status -> active).

alter table public.properties
  add column if not exists authority_to_let_attested_at timestamptz null;

comment on column public.properties.authority_to_let_attested_at is
  'Timestamp the landlord attested they own the property OR hold written landlord consent to sub-let/transfer it. NULL = not attested. Required non-null before a listing can be published/activated.';

-- Grandfather currently live inventory (properties.status uses active, not published).
update public.properties
set authority_to_let_attested_at = now()
where authority_to_let_attested_at is null
  and status = 'active';
