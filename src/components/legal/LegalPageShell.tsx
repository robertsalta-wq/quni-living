import { type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import PageHeroBand from '../PageHeroBand'

const LEGAL_DOC_LINKS = [
  { to: '/terms', label: 'Terms of Service' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/landlord-service-agreement', label: 'Landlord Service Agreement' },
] as const

export type LegalTocItem = { id: string; label: string }

type LegalPageShellProps = {
  bandTitle: string
  pageTitle: string
  toc: LegalTocItem[]
  children: ReactNode
}

function scrollToId(id: string) {
  const el = document.getElementById(id)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const legalNavLinkClass =
  'block w-full text-left rounded-lg px-2 py-1.5 text-stone-600 hover:bg-white hover:text-stone-900 hover:shadow-sm transition-colors text-sm'

export function LegalPageShell({ bandTitle, pageTitle, toc, children }: LegalPageShellProps) {
  const location = useLocation()
  const otherLegalLinks = LEGAL_DOC_LINKS.filter((d) => d.to !== location.pathname)

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-stone-50 pb-16">
      <PageHeroBand title={bandTitle} />

      <div className="max-w-6xl mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-8 pt-8 lg:pt-10">
        <div className="lg:flex lg:justify-center lg:items-start lg:gap-10 xl:gap-14">
          <aside className="hidden lg:block w-52 shrink-0">
            <div className="sticky top-28 space-y-8">
              <nav className="space-y-1 text-sm" aria-label="Other legal documents">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Other legal documents</p>
                {otherLegalLinks.map((d) => (
                  <Link key={d.to} to={d.to} className={legalNavLinkClass}>
                    {d.label}
                  </Link>
                ))}
              </nav>
              <nav className="space-y-1 text-sm" aria-label="On this page">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">On this page</p>
                {toc.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToId(item.id)}
                    className={legalNavLinkClass}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          <article className="w-full max-w-4xl bg-white rounded-2xl shadow-sm ring-1 ring-stone-900/5 px-6 py-8 sm:px-10 sm:py-10">
            <div className="lg:hidden mb-6 pb-6 border-b border-stone-100">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Other legal documents</p>
              <ul className="flex flex-wrap gap-x-4 gap-y-2">
                {otherLegalLinks.map((d) => (
                  <li key={d.to}>
                    <Link
                      to={d.to}
                      className="text-sm font-medium text-[#FF6F61] underline underline-offset-2 hover:opacity-90"
                    >
                      {d.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <header className="mb-8 pb-6 border-b border-stone-100">
              <h2 className="font-display text-3xl sm:text-[2rem] font-bold text-[#FF6F61] tracking-tight">{pageTitle}</h2>
              <p className="mt-2 text-sm text-stone-500">Last updated: 23 March 2026</p>
            </header>
            <div>{children}</div>
          </article>
        </div>
      </div>
    </div>
  )
}

export function LegalH2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-28 text-lg font-bold text-stone-900 mt-10 first:mt-0 mb-3">
      {children}
    </h2>
  )
}

export function LegalH3({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3 id={id} className="scroll-mt-28 text-base font-bold text-stone-900 mt-6 mb-2">
      {children}
    </h3>
  )
}

export function LegalP({ children }: { children: ReactNode }) {
  return <p className="text-stone-700 text-[15px] leading-relaxed mb-4 last:mb-0">{children}</p>
}

export function LegalUl({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-2 text-stone-700 text-[15px] leading-relaxed mb-4">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  )
}
