import { adminCardClass } from './adminUi'

const APPS = [
  {
    title: 'Supabase',
    subtitle: 'Database + auth',
    href: 'https://supabase.com',
  },
  {
    title: 'EmailJS',
    subtitle: 'Email templates',
    href: 'https://emailjs.com',
  },
  {
    title: 'Vercel',
    subtitle: 'Deployments',
    href: 'https://vercel.com',
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
    title: 'Google Cloud',
    subtitle: 'OAuth credentials',
    href: 'https://console.cloud.google.com',
  },
  {
    title: 'Gmail',
    subtitle: 'hello@quni.com.au',
    href: 'https://mail.google.com',
  },
] as const

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
            <p className="font-semibold text-gray-900">{app.title}</p>
            <p className="text-sm text-gray-500 mt-1">{app.subtitle}</p>
            <p className="text-xs text-indigo-600 font-medium mt-3">Open in new tab →</p>
          </a>
        ))}
      </div>
    </div>
  )
}
