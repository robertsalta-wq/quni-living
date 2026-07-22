-- Listing acknowledgment at booking apply: what the renter reviewed, when, and a content snapshot.
-- Target: Quni-Living-AU (cqakltqzqrxnmxfbqatx).
-- Rob applies this migration to prod before deploying app code that writes these columns.
-- No backfill: historical rows stay null (absence is the truthful state).

alter table public.bookings
  add column if not exists listing_acknowledged boolean,
  add column if not exists listing_acknowledged_at timestamptz,
  add column if not exists listing_snapshot jsonb,
  add column if not exists listing_snapshot_hash text;

comment on column public.bookings.listing_acknowledged is
  'Renter confirmed opportunity to review listing materials before booking; not a contract term.';
comment on column public.bookings.listing_acknowledged_at is
  'Server time when listing_acknowledged was recorded on insert.';
comment on column public.bookings.listing_snapshot is
  'Point-in-time listing content (description, house rules, amenities, photos, etc.) at apply.';
comment on column public.bookings.listing_snapshot_hash is
  'SHA-256 hex of UTF-8 JSON with keys sorted recursively (integrity of listing_snapshot).';
