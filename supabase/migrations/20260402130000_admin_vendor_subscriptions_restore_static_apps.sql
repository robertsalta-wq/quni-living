-- Restore vendor rows that existed on the old static Admin Apps page but were not in the initial seed (9 rows only).
-- Safe to re-run: skips any title that already exists.

insert into public.admin_vendor_subscriptions (
  title, subtitle, href, billing_href, plan_name, amount, currency, cadence, logo_src, is_active
)
select
  v.title,
  v.subtitle,
  v.href,
  v.billing_href,
  v.plan_name,
  v.amount,
  v.currency,
  v.cadence,
  v.logo_src,
  true
from (
  values
    (
      'EmailJS',
      'Email templates',
      'https://emailjs.com',
      'https://dashboard.emailjs.com/admin',
      null,
      0,
      'USD',
      'free',
      null::text
    ),
    (
      'Xero',
      'Accounting + invoicing',
      'https://go.xero.com/',
      'https://subscriptions.xero.com/',
      null,
      0,
      'USD',
      'free',
      '/xero-logo.svg'
    ),
    (
      'GitHub',
      'Repo: quni-living',
      'https://github.com/robertsalta-wq/quni-living',
      'https://github.com/settings/billing',
      null,
      0,
      'USD',
      'free',
      null::text
    ),
    (
      'Anthropic Console',
      'Claude API keys + usage',
      'https://console.anthropic.com/',
      'https://console.anthropic.com/settings/plans',
      null,
      0,
      'USD',
      'usage',
      '/anthropic-logo.svg'
    ),
    (
      'Google Cloud',
      'OAuth credentials',
      'https://console.cloud.google.com',
      'https://console.cloud.google.com/billing',
      null,
      0,
      'USD',
      'usage',
      null::text
    ),
    (
      'Google Search Console',
      'Indexing, sitemaps, search performance',
      'https://search.google.com/search-console',
      null,
      null,
      0,
      'USD',
      'free',
      null::text
    ),
    (
      'Gmail',
      'hello@quni.com.au',
      'https://mail.google.com',
      'https://admin.google.com/ac/billing/subscriptions',
      null,
      0,
      'USD',
      'free',
      null::text
    ),
    (
      'TPP Wholesale',
      'Reseller login',
      'https://www.tppwholesale.com.au/reseller-login/',
      null,
      null,
      0,
      'AUD',
      'free',
      null::text
    )
) as v (
  title,
  subtitle,
  href,
  billing_href,
  plan_name,
  amount,
  currency,
  cadence,
  logo_src
)
where not exists (
  select 1 from public.admin_vendor_subscriptions a where a.title = v.title
);
