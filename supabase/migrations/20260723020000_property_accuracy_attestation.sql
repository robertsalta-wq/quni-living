-- Landlord listing accuracy attestation: timestamp + material-content hash.
-- Re-required when material fields change (hash mismatch). No backfill — null means not attested.

alter table public.properties
  add column if not exists accuracy_attested_at timestamptz null;

alter table public.properties
  add column if not exists accuracy_attested_content_hash text null;

comment on column public.properties.accuracy_attested_at is
  'Timestamp the landlord attested listing details/photos are accurate. NULL = not attested. Re-required when accuracy_attested_content_hash no longer matches the material-field hash.';

comment on column public.properties.accuracy_attested_content_hash is
  'SHA-256 hex of canonical JSON over material listing fields at last attestation. NULL = not attested.';
