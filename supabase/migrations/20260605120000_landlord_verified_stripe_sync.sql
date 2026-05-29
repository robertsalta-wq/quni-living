-- Stripe-driven landlord verified badge + admin support override.

alter table public.landlord_profiles
  add column if not exists admin_override_verified boolean not null default false;

comment on column public.landlord_profiles.admin_override_verified is
  'When true, Stripe webhooks do not overwrite verified; set by admin manual verify toggle.';
