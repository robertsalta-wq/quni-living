import { useState } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo'

/** Hero collage: contemporary interior + people in professional morning / work context (Unsplash). */
const HERO_IMG_APARTMENT =
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=85&auto=format&fit=crop'
const HERO_IMG_APARTMENT_ALT =
  'Bright open-plan apartment with modern furniture, natural light, and calm contemporary styling'
const HERO_IMG_PROFESSIONALS =
  'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=900&q=85&auto=format&fit=crop'
const HERO_IMG_PROFESSIONALS_ALT =
  'Professionals crossing a busy city street during the morning commute'

const TICKER_ITEMS = [
  '✦ Furnished rooms across Sydney',
  '✦ Landlords who actually reply',
  '✦ Bills included — fewer surprises',
  '✦ Walk in with a suitcase, not a toolkit',
  '✦ Newtown · Glebe · Randwick · Kensington · Macquarie Park · Redfern · Ultimo',
  '✦ Enquire from one dashboard',
  '✦ Built for renters with a career, not a student card',
  '✦ Most verifications within one business day',
] as const

const WHO_CARDS = [
  {
    title: 'University staff',
    body: 'Lecturers, researchers, admin — live minutes from campus in a space that feels settled: furnished, bills wrapped in, and yours for the long semester or the long haul.',
  },
  {
    title: 'Early-career & CBD commuters',
    body: 'Uni precincts often give you more room per dollar than a shoebox closer to town — same Sydney, shorter commute drama, and a home you are happy to open the door to.',
  },
  {
    title: 'New to the city',
    body: 'New job, new postcode? Land with a real address, real photos, and a verified landlord — not a vague gumtree thread and a weekend at IKEA.',
  },
] as const

const HOW_STEPS = [
  {
    n: 1 as const,
    title: 'Create your renter account',
    desc: 'Sign up and, when we ask about study, choose that you are not currently enrolled. That switches you to the professional path — same platform, tailored to how you actually live.',
  },
  {
    n: 2 as const,
    title: 'Verify once, unlock everything',
    desc: 'Photo ID plus one simple supporting document. Most people earn their Verified Identity badge within a business day — then you are on equal footing with every verified renter here.',
  },
  {
    n: 3 as const,
    title: 'Choose your room, move in',
    desc: 'Browse listings from landlords who welcome working renters, ask questions in one place, and book when it feels right — without the endless DM ping-pong.',
  },
] as const

const FAQ_ITEMS = [
  {
    question: 'Do I need to be a student?',
    answer:
      "No. Quni Living is primarily a student marketplace, but landlords can opt in to accepting professional renters. Once verified, you'll see every listing available to you.",
  },
  {
    question: 'What documents do I need?',
    answer:
      "A government-issued photo ID (Australian passport or driver's licence) and one supporting document — a utility bill, employer letter, or Medicare card works fine.",
  },
  {
    question: 'How long does verification take?',
    answer:
      "Usually within 1 business day. You'll get an email when your Verified Identity badge has been applied to your profile.",
  },
  {
    question: 'Which listings can I see?',
    answer:
      "Listings where the landlord has opted in to professional renters are fully visible and bookable. Listings marked 'Students only' are restricted to Verified Student accounts.",
  },
  {
    question: 'What does it cost?',
    answer: 'Creating an account and verifying your identity is completely free.',
  },
] as const

export default function RentNearCampus() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full">
      <style>
        {`
          @keyframes ticker {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}
      </style>
      <Seo
        title="Furnished rentals near Sydney universities | Quni Living"
        description="Modern furnished rooms near Newtown, Glebe, Randwick and Sydney uni precincts — for working renters, not student-only listings. Verify once, browse landlords who welcome professionals, book with confidence."
        canonicalPath="/rent-near-campus"
      />

      {/* Hero */}
      <section className="bg-[#FF6F61] border-b border-black/10">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-20 sm:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center lg:items-stretch">
            <div className="flex flex-col justify-center min-w-0">
              <p className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-white/70 mb-4 [font-variant:small-caps]">
                Sydney uni suburbs · for renters building a career
              </p>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-[4.5rem] font-bold tracking-tight text-white !mt-0 mb-8 sm:mb-10 leading-tight">
                <span className="block">A home that</span>
                <span className="block">matches your pace.</span>
              </h1>
              <p className="text-white/90 text-base sm:text-lg leading-relaxed mb-8 max-w-xl font-normal">
                Furnished rooms in some of Sydney&apos;s best-connected pockets — think light-filled spaces, bills
                sorted, landlords who chose to welcome working renters. Verify your identity once, then explore and book
                on your terms.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full max-w-xl">
                <Link
                  to="/listings"
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/90 bg-white px-6 py-3 text-sm font-semibold text-[#FF6F61] shadow-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#FF6F61] transition-colors"
                >
                  Browse listings
                  <span aria-hidden>→</span>
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-1 rounded-xl border-2 border-white px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#FF6F61] transition-colors"
                >
                  Create an account
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>

            <div className="relative w-full min-h-[280px] sm:min-h-[340px] lg:min-h-[380px] pt-4 pb-6 lg:py-4">
              <div
                className="absolute left-0 top-6 sm:top-10 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6F61] text-white shadow-lg ring-2 ring-white/50"
                aria-hidden
              >
                <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </div>
              <div
                className="absolute right-0 top-[28%] sm:top-[32%] z-30 rounded-full bg-teal-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md whitespace-nowrap"
                aria-hidden
              >
                Verified listings
              </div>
              <div
                className="absolute bottom-4 right-4 z-30 flex max-w-[120px] items-center gap-1.5 rounded-xl border-2 border-[#CC4A3C] bg-[#FF6F61] px-2.5 py-2 text-white shadow-lg"
                aria-hidden
              >
                <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-[11px] font-semibold leading-tight">Furnished</span>
              </div>

              <div className="relative z-10 flex justify-end pr-1">
                <div className="w-3/4 aspect-[4/3] rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/10">
                  <img
                    src={HERO_IMG_APARTMENT}
                    alt={HERO_IMG_APARTMENT_ALT}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              <div className="relative z-20 -mt-8 ml-0 w-2/3">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/10">
                  <img
                    src={HERO_IMG_PROFESSIONALS}
                    alt={HERO_IMG_PROFESSIONALS_ALT}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="w-full overflow-hidden bg-[#1A1A1A] py-3" aria-hidden>
        <div
          className="flex w-fit whitespace-nowrap"
          style={{ animation: 'ticker 30s linear infinite' }}
        >
          {[0, 1].flatMap((dup) =>
            TICKER_ITEMS.map((text, i) => (
              <span
                key={`${dup}-${i}`}
                className="mx-6 inline-block text-sm font-medium tracking-wide text-white"
              >
                {text}
              </span>
            )),
          )}
        </div>
      </div>

      {/* Who it's for */}
      <section className="bg-white py-12 sm:py-16 border-b border-gray-100">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight text-center !mt-0 !mb-3">
            Who this is for
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-gray-600 sm:mb-12 sm:text-base">
            You are past the &ldquo;any roof will do&rdquo; phase — you want a place that fits your commute, your
            headspace, and the version of Sydney you are investing in.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
            {WHO_CARDS.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-[#E1EAE5] bg-white p-6 sm:p-7 shadow-sm text-center md:text-left"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-1.5">{card.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[#F6FAF8] py-14 sm:py-16 border-y border-[#E3EEE9]">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight text-center !mt-0 !mb-3">
            How it works
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-gray-600 sm:mb-12 sm:text-base">
            From first click to keys in hand: one verification, clear listings, and a booking flow that stays in the open.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
            {HOW_STEPS.map((step) => (
              <div
                key={step.n}
                className="relative rounded-2xl border border-[#E1EAE5] bg-white p-6 sm:p-7 shadow-sm text-center md:text-left"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#FFE7E3] text-[#FF6F61] mb-4 mx-auto md:mx-0">
                  {step.n === 1 && (
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  )}
                  {step.n === 2 && (
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                      />
                    </svg>
                  )}
                  {step.n === 3 && (
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 7h.01M4 11.5l8.086-8.086a2 2 0 012.828 0l5.672 5.672a2 2 0 010 2.828L12.5 20a2 2 0 01-2.828 0L4 14.328a2 2 0 010-2.828z"
                      />
                    </svg>
                  )}
                </div>
                <div className="absolute right-4 top-4 inline-flex items-center justify-center h-7 min-w-7 rounded-full bg-[#FDEDEA] px-2 text-xs font-bold text-[#CC4A3C]">
                  {step.n}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1.5">{step.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Badge explainer */}
      <section className="bg-white py-12 sm:py-16 border-b border-gray-100">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight !mt-0 !mb-4">
              What landlords see
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-gray-600 sm:text-base">
              They list furnished, move-in-ready rooms; you show up as a verified renter — credible, serious, and easy to
              say yes to.
            </p>
            <p className="mb-8 text-sm leading-relaxed text-gray-600 sm:text-base">
              Your Verified Identity badge sits alongside our student verification: same bar for trust, whether you are
              on campus or in the office five days a week.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="inline-flex items-center rounded-full bg-purple-700 px-4 py-2 text-sm font-medium text-white">
                ✓ Verified Student
              </span>
              <span className="inline-flex items-center rounded-full bg-teal-700 px-4 py-2 text-sm font-medium text-white">
                ✓ Verified Identity
              </span>
            </div>
            <p className="text-sm text-gray-500 text-center mt-3">
              Both badges indicate a verified renter. Landlords choose which they accept.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#F6FAF8] py-12 sm:py-16 border-y border-[#E3EEE9]">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight text-center !mt-0 !mb-8">
            Common questions
          </h2>
          <div className="max-w-3xl mx-auto rounded-2xl bg-white shadow-md divide-y divide-stone-100">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaqIndex === index
              return (
                <div key={item.question}>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-stone-50/70 transition-colors"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                  >
                    <span className="font-semibold text-gray-900">{item.question}</span>
                    <svg
                      className={`h-5 w-5 shrink-0 text-[#FF6F61] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {isOpen ? <p className="px-6 pb-5 text-sm leading-relaxed text-gray-600">{item.answer}</p> : null}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="w-full bg-[#FF6F61]">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-14 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white !mt-0 !mb-3">See what is available now</h2>
          <p className="mx-auto mb-8 max-w-2xl text-sm text-white/80 sm:text-base">
            Scroll real listings, save the ones that feel right, and start the conversation when you are ready — your
            next chapter does not need to start in a rushed Facebook group.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#FF6F61] border border-white hover:bg-white/95 transition-colors"
          >
            Create an account
            <span aria-hidden>→</span>
          </Link>
          <p className="mt-5">
            <Link to="/login" className="text-sm text-white underline underline-offset-2 hover:text-white/90">
              Already have an account? Log in
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
