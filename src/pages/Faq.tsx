import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import ChatEmbed from '../components/aiChat/ChatEmbed'
import CssCollapseAccordion from '../components/CssCollapseAccordion'
import Seo from '../components/Seo'
import PageHeroBand from '../components/PageHeroBand'
import { buildFaqPageJsonLd } from '../lib/buildFaqPageJsonLd'
import { ALL_FAQ_ITEMS, collectFaqPlainPairs, FAQ_SECTIONS } from '../lib/faqContent'

export default function Faq() {
  const faqJsonLd = useMemo(() => buildFaqPageJsonLd(collectFaqPlainPairs()), [])

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50">
      <Seo
        title="FAQ"
        description="Answers about accommodation for renters and landlords, fees, verification, bookings, bond, and support on Quni Living."
        canonicalPath="/faq"
        jsonLd={faqJsonLd ? [faqJsonLd] : undefined}
      />
      <PageHeroBand
        title="Frequently asked questions"
        subtitle="Everything about finding a place, listing a property, fees, verification, and getting help on Quni."
      />

      <div className="max-w-site mx-auto w-full px-6 py-10 md:py-14">
        <div className="mb-10 w-full">
          <ChatEmbed variant="listings" />
        </div>

        <nav
          className="sticky top-below-fixed-header z-30 -mx-6 mb-10 flex flex-wrap gap-2 border-b border-gray-200 bg-gray-50 px-6 py-4 shadow-sm md:top-24"
          aria-label="FAQ sections"
        >
          {FAQ_SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#faq-${section.id}`}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:border-admin-coral/40 hover:text-[var(--quni-coral)] focus:outline-none focus-visible:ring-2 focus-visible:ring-admin-coral/40"
            >
              {section.label}
            </a>
          ))}
        </nav>

        <div className="space-y-12">
          {FAQ_SECTIONS.map((section) => (
            <section key={section.id} id={`faq-${section.id}`} className="scroll-mt-32 md:scroll-mt-36">
              <h2 className="font-display text-xl font-bold text-gray-900 sm:text-2xl">{section.label}</h2>
              <div className="quni-card mt-4">
                <CssCollapseAccordion
                  variant="faq"
                  defaultOpenId={section.id === FAQ_SECTIONS[0]?.id ? ALL_FAQ_ITEMS[0]?.id ?? null : null}
                  items={section.items.map((item) => ({
                    id: item.id,
                    question: item.question,
                    answer: item.answer,
                  }))}
                />
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-admin-coral/25 bg-admin-coral/5 p-6 md:p-8 text-center">
          <h2 className="font-display text-lg font-bold text-gray-900">Still have a question?</h2>
          <p className="mt-2 text-sm text-gray-600 max-w-lg mx-auto">
            We are happy to help - send a message and we will usually reply within one business day.
          </p>
          <Link
            to="/contact"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-[var(--quni-coral)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-95"
          >
            Contact us
          </Link>
        </div>
      </div>
    </div>
  )
}
