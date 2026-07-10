-- Legal-name signing gate (Phase 4). Default OFF — enable in Admin only after locks are in place.

insert into public.platform_config (config_key, config_value, label, category, is_sensitive, sort_order)
values (
  'legal_name_signing_gate_enabled',
  'false',
  'Require locked tenant legal name before signing / bond documents',
  'compliance',
  false,
  20
)
on conflict (config_key) do nothing;
