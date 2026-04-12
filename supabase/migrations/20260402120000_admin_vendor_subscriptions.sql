-- Vendor subscription rows for Admin → Apps.
-- RLS: public.is_platform_admin() — email list MUST stay in sync with supabase/admin_rls_policies.sql and src/lib/adminEmails.ts.
-- This project does not use a single "profiles" table; admin access matches existing platform admin policies.

-- If this fails, apply supabase/admin_rls_policies.sql first (defines public.is_platform_admin()).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.admin_vendor_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  subtitle text,
  href text not null,
  billing_href text,
  plan_name text,
  amount numeric not null default 0,
  currency text not null default 'USD' check (currency in ('AUD', 'USD')),
  cadence text not null default 'monthly' check (cadence in ('monthly', 'yearly', 'usage', 'free')),
  logo_src text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_vendor_subscriptions_active_title_idx
  on public.admin_vendor_subscriptions (is_active, title);

drop trigger if exists admin_vendor_subscriptions_updated_at on public.admin_vendor_subscriptions;
create trigger admin_vendor_subscriptions_updated_at
  before update on public.admin_vendor_subscriptions
  for each row execute function public.set_updated_at();

alter table public.admin_vendor_subscriptions enable row level security;

drop policy if exists "Platform admins select vendor subscriptions" on public.admin_vendor_subscriptions;
drop policy if exists "Platform admins insert vendor subscriptions" on public.admin_vendor_subscriptions;
drop policy if exists "Platform admins update vendor subscriptions" on public.admin_vendor_subscriptions;
drop policy if exists "Platform admins delete vendor subscriptions" on public.admin_vendor_subscriptions;

create policy "Platform admins select vendor subscriptions"
  on public.admin_vendor_subscriptions for select
  to authenticated
  using (public.is_platform_admin());

create policy "Platform admins insert vendor subscriptions"
  on public.admin_vendor_subscriptions for insert
  to authenticated
  with check (public.is_platform_admin());

create policy "Platform admins update vendor subscriptions"
  on public.admin_vendor_subscriptions for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "Platform admins delete vendor subscriptions"
  on public.admin_vendor_subscriptions for delete
  to authenticated
  using (public.is_platform_admin());

-- Placeholder amounts for budgeting only — replace with your real figures.
insert into public.admin_vendor_subscriptions (
  title, subtitle, href, billing_href, plan_name, amount, currency, cadence, logo_src, is_active
) values
  (
    'Supabase (Quni Living)',
    'Database + auth — Quni Living project',
    'https://supabase.com',
    'https://supabase.com/dashboard/org/_/billing',
    'Pro (placeholder)',
    25,
    'USD',
    'monthly',
    null,
    true
  ),
  (
    'Vercel',
    'Deployments',
    'https://vercel.com',
    'https://vercel.com/dashboard',
    'Pro (placeholder)',
    20,
    'USD',
    'monthly',
    null,
    true
  ),
  (
    'Resend',
    'Email sending + logs',
    'https://resend.com/dashboard',
    'https://resend.com/overview',
    'Paid tier (placeholder)',
    20,
    'USD',
    'monthly',
    null,
    true
  ),
  (
    'Sentry',
    'Errors + performance monitoring',
    'https://sentry.io',
    'https://sentry.io/settings/billing/',
    'Team (placeholder)',
    29,
    'USD',
    'monthly',
    '/sentry-logo.svg',
    true
  ),
  (
    'Stripe',
    'Payments, Connect, webhooks',
    'https://dashboard.stripe.com',
    'https://dashboard.stripe.com/settings/billing',
    'Pay-as-you-go (placeholder)',
    50,
    'USD',
    'usage',
    null,
    true
  ),
  (
    'Cloudflare',
    'Turnstile + DNS',
    'https://dash.cloudflare.com',
    'https://dash.cloudflare.com',
    'Free + add-ons (placeholder)',
    0,
    'USD',
    'free',
    null,
    true
  ),
  (
    'DocuSeal',
    'E-signatures + document workflows',
    'https://www.docuseal.com/',
    'https://docuseal.com/',
    'Business (placeholder)',
    29,
    'USD',
    'monthly',
    '/docuseal-logo.svg',
    true
  ),
  (
    'Railway',
    'Hosting + databases',
    'https://railway.app/',
    'https://railway.app/account/billing',
    'Usage (placeholder)',
    15,
    'USD',
    'usage',
    '/railway-logo.svg',
    true
  );
