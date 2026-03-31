import { useState } from 'react'
import { adminCardClass } from './adminUi'

const APPS = [
  {
    title: 'Supabase',
    subtitle: 'Database + auth',
    href: 'https://supabase.com',
  },
  {
    title: 'Sentry',
    subtitle: 'Errors + performance monitoring',
    href: 'https://sentry.io',
    logoSrc: '/sentry-logo.svg',
  },
  {
    title: 'EmailJS',
    subtitle: 'Email templates',
    href: 'https://emailjs.com',
  },
  {
    title: 'Resend',
    subtitle: 'Email sending + logs',
    href: 'https://resend.com/dashboard',
  },
  {
    title: 'DocuSeal',
    subtitle: 'E-signatures + document workflows',
    href: 'https://www.docuseal.com/',
    logoSrc: '/docuseal-logo.svg',
  },
  {
    title: 'Vercel',
    subtitle: 'Deployments',
    href: 'https://vercel.com',
  },
  {
    title: 'Railway',
    subtitle: 'Hosting + databases',
    href: 'https://railway.app/',
    logoSrc: '/railway-logo.svg',
  },
  {
    title: 'Stripe',
    subtitle: 'Payments, Connect, webhooks',
    href: 'https://dashboard.stripe.com',
  },
  {
    title: 'Xero',
    subtitle: 'Accounting + invoicing',
    href: 'https://go.xero.com/',
    logoSrc: '/xero-logo.svg',
  },
  {
    title: 'Cloudflare',
    subtitle: 'Turnstile + DNS',
    href: 'https://dash.cloudflare.com',
  },
  {
    title: 'GitHub',
    subtitle: 'Repo: quni-living',
    href: 'https://github.com/robertsalta-wq/quni-living',
  },
  {
    title: 'Anthropic Console',
    subtitle: 'Claude API keys + usage',
    href: 'https://console.anthropic.com/',
    logoSrc: '/anthropic-logo.svg',
  },
  {
    title: 'Google Cloud',
    subtitle: 'OAuth credentials',
    href: 'https://console.cloud.google.com',
  },
  {
    title: 'Google Search Console',
    subtitle: 'Indexing, sitemaps, search performance',
    href: 'https://search.google.com/search-console',
  },
  {
    title: 'Gmail',
    subtitle: 'hello@quni.com.au',
    href: 'https://mail.google.com',
  },
  {
    title: 'TPP Wholesale',
    subtitle: 'Reseller login',
    href: 'https://www.tppwholesale.com.au/reseller-login/',
  },
] as const satisfies readonly {
  title: string
  subtitle: string
  href: string
  logoSrc?: string
}[]

function faviconForHref(href: string): string | null {
  try {
    const url = new URL(href)
    return `${url.origin}/favicon.ico`
  } catch {
    return null
  }
}

function BrandLogo({
  title,
  href,
  logoSrc,
}: {
  title: string
  href: string
  logoSrc?: string | null
}) {
  const [errored, setErrored] = useState(false)
  const src = logoSrc ?? faviconForHref(href)
  const initials = title.trim().split(/\s+/)[0]?.[0]?.toUpperCase() ?? 'B'

  if (!src || errored) {
    return (
      <div
        className="h-9 w-9 shrink-0 rounded-xl border border-gray-100 bg-white flex items-center justify-center"
        aria-hidden
      >
        <span className="text-sm font-semibold text-gray-700">{initials}</span>
      </div>
    )
  }

  return (
    <div
      className="h-9 w-9 shrink-0 rounded-xl border border-gray-100 bg-white flex items-center justify-center overflow-hidden"
      aria-hidden
    >
      <img
        src={src}
        alt=""
        className="h-7 w-7 object-contain"
        onError={() => setErrored(true)}
      />
    </div>
  )
}

export default function AdminApps() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Apps</h1>
      <p className="text-sm text-gray-500 mt-1 mb-8">External tools for running Quni Living.</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {APPS.map((app) => (
          <a
            key={app.href}
            href={app.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`${adminCardClass} block transition-shadow hover:shadow-md hover:border-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2`}
          >
            <div className="flex items-start gap-3">
              <BrandLogo
                title={app.title}
                href={app.href}
                logoSrc={'logoSrc' in app ? app.logoSrc : undefined}
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">{app.title}</p>
                <p className="text-sm text-gray-500 mt-1">{app.subtitle}</p>
                <p className="text-xs text-indigo-600 font-medium mt-3">Open in new tab →</p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
