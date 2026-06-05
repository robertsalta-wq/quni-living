-- =============================================================================
-- Schema discovery (project flegysnshryzvkwzfclc, 2026-05-23)
--
-- public.platform_config columns (information_schema):
--   id uuid, config_key text, config_value text, label text, category text,
--   is_sensitive boolean, sort_order integer, updated_at timestamptz, updated_by text
--
-- NOT a singleton row table - one row per config_key (EAV). This view pivots keys
-- into a single public trust-signal row.
--
-- Mapped config_key → view column:
--   business.legal_name              → legal_name
--   business.trading_name            → trading_name
--   business.abn                     → abn
--   contact.registered_address_line1 → registered_address_line1
--   contact.registered_address_line2 → registered_address_line2
--   contact.registered_suburb        → registered_suburb
--   contact.registered_state         → registered_state
--   contact.registered_postcode      → registered_postcode
-- =============================================================================

create or replace view public.public_legal_entity
with (security_invoker = false)
as
select
  coalesce(
    max(case when pc.config_key = 'business.legal_name' then nullif(trim(pc.config_value), '') end),
    ''
  ) as legal_name,
  coalesce(
    max(case when pc.config_key = 'business.trading_name' then nullif(trim(pc.config_value), '') end),
    ''
  ) as trading_name,
  coalesce(
    max(case when pc.config_key = 'business.abn' then nullif(trim(pc.config_value), '') end),
    ''
  ) as abn,
  coalesce(
    max(
      case
        when pc.config_key = 'contact.registered_address_line1' then nullif(trim(pc.config_value), '')
      end
    ),
    ''
  ) as registered_address_line1,
  coalesce(
    max(
      case
        when pc.config_key = 'contact.registered_address_line2' then nullif(trim(pc.config_value), '')
      end
    ),
    ''
  ) as registered_address_line2,
  coalesce(
    max(
      case when pc.config_key = 'contact.registered_suburb' then nullif(trim(pc.config_value), '') end
    ),
    ''
  ) as registered_suburb,
  coalesce(
    max(case when pc.config_key = 'contact.registered_state' then nullif(trim(pc.config_value), '') end),
    ''
  ) as registered_state,
  coalesce(
    max(
      case when pc.config_key = 'contact.registered_postcode' then nullif(trim(pc.config_value), '') end
    ),
    ''
  ) as registered_postcode
from public.platform_config pc
where pc.config_key in (
  'business.legal_name',
  'business.trading_name',
  'business.abn',
  'contact.registered_address_line1',
  'contact.registered_address_line2',
  'contact.registered_suburb',
  'contact.registered_state',
  'contact.registered_postcode'
);

comment on view public.public_legal_entity is
  'Public read surface for legal entity trust signals (admin Business Settings). Does not expose bank or sensitive platform_config rows.';

grant select on public.public_legal_entity to anon, authenticated;
