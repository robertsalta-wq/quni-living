-- APPLY BEFORE DEPLOY: run in Supabase before pushing code that reads these columns.
--
-- QLD Listing: landlord bond remittance preference + RTA lodgement record on bookings.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS qld_bond_remittance_preference text
  CHECK (
    qld_bond_remittance_preference IS NULL OR
    qld_bond_remittance_preference IN ('landlord_collects_remits', 'tenant_choice')
  );

COMMENT ON COLUMN properties.qld_bond_remittance_preference IS
  'QLD Listing only: landlord-stated bond payment preference (steer, not block).';

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS rta_bond_number text,
  ADD COLUMN IF NOT EXISTS rta_acknowledgement_reference text,
  ADD COLUMN IF NOT EXISTS rta_bond_lodged_at timestamptz;

COMMENT ON COLUMN bookings.rta_bond_number IS
  'RTA Queensland bond number from Acknowledgement of Rental Bond (record only, not a gate).';
COMMENT ON COLUMN bookings.rta_acknowledgement_reference IS
  'RTA Acknowledgement of Rental Bond reference (record only).';
COMMENT ON COLUMN bookings.rta_bond_lodged_at IS
  'Date bond was lodged with RTA Queensland (record only).';
