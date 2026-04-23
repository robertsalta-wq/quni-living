import Seo from '../components/Seo'
import PageHeroBand from '../components/PageHeroBand'
import { ORGANIZATION_EMAIL } from '../lib/site'

const PUBLIC_SITE_LABEL = 'quni.com.au'
const PUBLIC_SITE_URL = 'https://quni.com.au'

export default function About() {

  return (
    <>
      <Seo
        title="About Quni Living"
        description="Quni Living is a rental platform built for compatibility, reliability, and fair outcomes for landlords and tenants — founded by Quinn Lee in Sydney, NSW."
        canonicalPath="/about"
      />
      <div className="flex min-h-0 w-full flex-1 flex-col bg-white">
        <PageHeroBand
          title="About Quni Living"
          subtitle="Built for landlords and tenants who expect more"
        />

        <article className="max-w-site mx-auto w-full px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-3xl space-y-16 text-gray-700">
            <section className="space-y-4 leading-relaxed">
              <h2 className="font-display text-2xl font-bold text-gray-900">About Quinn Lee</h2>
              <p className="font-semibold text-gray-900">Founder, Quni Living · Sydney, NSW</p>
              <p>
                Quinn Lee built Quni Living because she knew there was a better way.
              </p>
              <p>
                As a Sydney-based property investor managing her own portfolio of room-by-room rentals, Quinn
                experienced firsthand what neither side of the market was getting right. Landlords were stuck with
                generic platforms that sent unvetted enquiries and zero support. Students and young professionals were
                navigating a fragmented, stressful search with no structure and no trust layer. The gap between them was
                obvious and fixable.
              </p>
              <p>
                Quni Living is her answer to that gap. A platform built not just for listings, but for compatibility,
                reliability, and outcomes. Students find verified homes that suit how they actually live. Landlords
                access a targeted, trustworthy tenant pool without the friction of traditional property management.
                Every part of the platform, from AI-assisted tools to NSW-compliant tenancy agreements, reflects
                Quinn&apos;s belief that the rental experience should be seamless, intentional, and fair for both sides.
              </p>
              <p>
                Quinn brings an unusual combination of strengths to Quni Living: a practical investor&apos;s eye for
                structure and returns, a deep understanding of Feng Shui and BaZi principles that inform how she thinks
                about spaces and the people who inhabit them, and the grounded perspective of a mother and entrepreneur
                who builds things that actually work in the real world.
              </p>
              <p>
                Her approach to property has always been about more than yield. It is about the lived experience, the
                flow of a space, the fit between a tenant and a home, the small details that make somewhere feel right.
                Quni Living is the platform that makes that philosophy scalable.
              </p>
            </section>

            <footer className="border-t border-gray-200 pt-10 text-sm text-gray-600">
              <p className="leading-relaxed">
                <a href={`mailto:${ORGANIZATION_EMAIL}`} className="text-gray-900 underline-offset-2 hover:underline">
                  {ORGANIZATION_EMAIL}
                </a>
                <span className="mx-2 text-gray-300" aria-hidden>
                  |
                </span>
                <a
                  href={PUBLIC_SITE_URL}
                  className="text-gray-900 underline-offset-2 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {PUBLIC_SITE_LABEL}
                </a>
                <span className="mx-2 text-gray-300" aria-hidden>
                  |
                </span>
                <span>Sydney, NSW</span>
              </p>
            </footer>
          </div>
        </article>
      </div>
    </>
  )
}
