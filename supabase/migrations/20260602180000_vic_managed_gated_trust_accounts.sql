-- VIC Managed remains gated until trust accounts are operational (documents may still generate for Listing).

update public.service_tier_state_matrix
set
  managed_status = 'gated',
  notes = 'Managed unavailable until trust account setup is complete',
  updated_at = now()
where state_code = 'VIC'
  and property_tier in ('t1', 't2');
