-- Vendor rows the code calls that were missing from Admin → Apps.
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
      'OpenAI',
      'Embeddings for the knowledge base',
      'https://platform.openai.com/',
      'https://platform.openai.com/settings/organization/billing',
      null,
      0,
      'USD',
      'usage',
      null::text
    ),
    (
      'PageSpeed Insights',
      'Performance lab checks',
      'https://pagespeed.web.dev/',
      null,
      null,
      0,
      'USD',
      'free',
      null::text
    ),
    (
      'Google Drive API',
      'Admin Documents view',
      'https://drive.google.com/',
      null,
      null,
      0,
      'USD',
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
