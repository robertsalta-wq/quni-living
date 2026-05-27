import { useState } from 'react'
import { Link } from 'react-router-dom'
import ChatEmbed from '../components/aiChat/ChatEmbed'
import Seo from '../components/Seo'
import PageHeroBand from '../components/PageHeroBand'
import { ALL_FAQ_ITEMS, FAQ_SECTIONS } from '../lib/faqContent'

export default function Faq() {
  const [openFaqId, setOpenFaqId] = useState<string | null>(ALL_FAQ_ITEMS[0]?.id ?? null)

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50">
      <Seo
        title="FAQ"
        description="Answers about student accommodation, landlord listings, fees, verification, bookings, bond, and support on Quni Living."
        canonicalPath="/faq"
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
          className="sticky top-below-fixed-header z-20 -mx-6 mb-10 flex flex-wrap gap-2 bg-gray-50/95 px-6 py-3 backdrop-blur-sm md:top-24"
          aria-label="FAQ sections"
        >
          {FAQ_SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#faq-${section.id}`}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:border-[#FF6F61]/40 hover:text-[#FF6F61] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6F61]/40"
            >
              {section.label}
            </a>
          ))}
        </nav>

        <div className="space-y-12">
          {FAQ_SECTIONS.map((section) => (
            <section key={section.id} id={`faq-${section.id}`} className="scroll-mt-32 md:scroll-mt-36">
              <h2 className="font-display text-xl font-bold text-gray-900 sm:text-2xl">{section.label}</h2>
              <div className="mt-4 rounded-2xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-100">
                {section.items.map((item) => {
                  const open = openFaqId === item.id
                  return (
                    <div key={item.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-gray-900 hover:bg-gray-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF6F61]/40 sm:px-6 sm:text-base"
                        aria-expanded={open}
                        onClick={() => setOpenFaqId((current) => (current === item.id ? null : item.id))}
                      >
                        <span className="min-w-0 pr-2">{item.question}</span>
                        <svg
                          className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                        </svg>
                      </button>
                      {open ? (
                        <div className="px-5 pb-4 text-sm leading-relaxed text-gray-600 sm:px-6">{item.answer}</div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-[#FF6F61]/25 bg-[#FF6F61]/5 p-6 md:p-8 text-center">
          <h2 className="font-display text-lg font-bold text-gray-900">Still have a question?</h2>
          <p className="mt-2 text-sm text-gray-600 max-w-lg mx-auto">
            We are happy to help — send a message and we will usually reply within one business day.
          </p>
          <Link
            to="/contact"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#FF6F61] px-6 py-2.5 text-sm font-medium text-white hover:opacity-95"
          >
            Contact us
          </Link>
        </div>
      </div>
    </div>
  )
}
