-- VIC agreement package wired (Form 1 T2 + licence T1); enable Managed per tier.

update public.service_tier_state_matrix
set
  managed_status = 'available',
  notes = null,
  updated_at = now()
where state_code = 'VIC'
  and property_tier in ('t1', 't2');
