-- VIC Managed remains gated until trust accounts and Victorian licensing are cleared (Listing/doc gen may still run).

update public.service_tier_state_matrix
set
  managed_status = 'gated',
  notes = 'Managed unavailable until trust accounts are operational and Victorian licensing requirements are satisfied',
  updated_at = now()
where state_code = 'VIC'
  and property_tier in ('t1', 't2');
