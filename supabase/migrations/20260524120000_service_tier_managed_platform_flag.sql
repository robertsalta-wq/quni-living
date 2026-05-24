-- Global Managed tier toggle + public read surface for client feature flags.

insert into public.platform_config (config_key, config_value, label, category, is_sensitive, sort_order)
values (
  'quni_service_tier_managed_enabled',
  'false',
  'Enable Quni Managed tier platform-wide',
  'compliance',
  false,
  911
)
on conflict (config_key) do nothing;

create or replace view public.public_platform_features
with (security_invoker = false)
as
select
  coalesce(
    bool_or(
      pc.config_key = 'quni_service_tier_managed_enabled'
      and lower(trim(pc.config_value)) = 'true'
    ),
    false
  ) as managed_tier_enabled,
  coalesce(
    bool_or(
      pc.config_key = 'quni_service_tier_module_enabled'
      and lower(trim(pc.config_value)) = 'true'
    ),
    false
  ) as listing_module_enabled
from public.platform_config pc
where pc.config_key in (
  'quni_service_tier_managed_enabled',
  'quni_service_tier_module_enabled'
);

comment on view public.public_platform_features is
  'Public read surface for non-sensitive platform feature toggles (service tiers).';

grant select on public.public_platform_features to anon, authenticated;
