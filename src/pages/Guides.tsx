import { Link } from 'react-router-dom'
import PageHeroBand from '../components/PageHeroBand'
import Seo from '../components/Seo'
import { getGuideBySlug, listGuideSlugs } from '../lib/guides/registry'
import { SITE_CONTENT_MAX_CLASS } from '../lib/site'

const PLATFORM_HELP_LINKS = [
  { to: '/international', label: 'International students', description: 'Renting in Australia as an international student.' },
  { to: '/how-it-works', label: 'How it works', description: 'How Quni helps you find verified rooms near campus.' },
  { to: '/faq', label: 'FAQ', description: 'Answers on fees, verification, bookings, and support.' },
] as const

const SEO_TITLE = 'Guides & advice for student renters'
const SEO_DESCRIPTION =
  'Practical guides for students renting in Australia — your rights, fair housing, and how to search with confidence on Quni.'

export default function Guides() {
  const articles = listGuideSlugs()
    .map((slug) => getGuideBySlug(slug))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-[#FAF6EE]">
      <Seo title={SEO_TITLE} description={SEO_DESCRIPTION} canonicalPath="/guides" />
      <PageHeroBand
        title="Guides & advice for student renters"
        subtitle="Know your rights, search fairly, and rent with confidence near campus."
      />

      <div className={`${SITE_CONTENT_MAX_CLASS} py-10 md:py-14`}>
        <section aria-labelledby="guides-articles-heading">
          <h2 id="guides-articles-heading" className="font-display text-xl font-bold text-[#1B2A4A] sm:text-2xl">
            Articles
          </h2>
          {articles.length === 0 ? (
            <p className="mt-4 text-sm text-[#1B2A4A]/70">New guides are on the way.</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {articles.map(({ seo }) => (
                <li key={seo.slug}>
                  <Link
                    to={`/guides/${seo.slug}`}
                    className="block rounded-2xl border border-[#1B2A4A]/10 bg-white px-5 py-4 shadow-sm transition-colors hover:border-[#FF6F61]/35 hover:bg-[#FF6F61]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6F61]/40"
                  >
                    <span className="block font-medium text-[#1B2A4A]">{seo.navLabel ?? seo.headline}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-[#1B2A4A]/70">{seo.metaDescription}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-12 md:mt-16" aria-labelledby="guides-platform-help-heading">
          <h2 id="guides-platform-help-heading" className="font-display text-xl font-bold text-[#1B2A4A] sm:text-2xl">
            Platform help
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_HELP_LINKS.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="flex h-full flex-col rounded-2xl border border-[#1B2A4A]/10 bg-white px-5 py-4 shadow-sm transition-colors hover:border-[#FF6F61]/35 hover:bg-[#FF6F61]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6F61]/40"
                >
                  <span className="font-medium text-[#1B2A4A]">{item.label}</span>
                  <span className="mt-1 text-sm leading-relaxed text-[#1B2A4A]/70">{item.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
