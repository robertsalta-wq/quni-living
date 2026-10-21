-- Head-tenant written consent. Null means not recorded.
-- Written only when lister_role is head_tenant and the lister answers yes.
-- The go-live guard is a later migration so this column can exist before that
-- check is enforced. Existing live rows stay valid with a null value.

alter table public.properties
  add column if not exists head_tenant_landlord_consent_at timestamptz null;

comment on column public.properties.head_tenant_landlord_consent_at is
  'When a head tenant confirmed they have written landlord consent to sub-let or transfer. Null if not a head tenant, or if they have not confirmed.';
