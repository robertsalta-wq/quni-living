import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import SiteBrandLockup from '../components/SiteBrandLockup'

type FeatureRowProps = {
  number: string
  tag: string
  title: string
  description: string
  points: string[]
  reverse?: boolean
  children: React.ReactNode
}

function FeatureRow({ number, tag, title, description, points, reverse = false, children }: FeatureRowProps) {
  return (
    <div
      className={`grid grid-cols-1 gap-8 lg:gap-14 items-center ${reverse ? 'lg:grid-cols-[1.05fr_0.95fr]' : 'lg:grid-cols-[0.95fr_1.05fr]'} ai-reveal`}
    >
      <div className={reverse ? 'lg:order-2' : ''}>
        <p className="text-xs uppercase tracking-[0.2em] text-[#E8583A]/80">
          {number} · {tag}
        </p>
        <h3 className="mt-3 text-3xl md:text-4xl leading-tight text-stone-100 font-serif">{title}</h3>
        <p className="mt-4 text-stone-300/85 text-base md:text-lg leading-relaxed">{description}</p>
        <ul className="mt-6 space-y-2 text-sm md:text-base text-stone-300/80">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-2">
              <span className="mt-1 text-[#E8583A]" aria-hidden>
                •
              </span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className={reverse ? 'lg:order-1' : ''}>
        <div className="ai-feature-card">{children}</div>
      </div>
    </div>
  )
}

export default function LandlordAIFeaturePage() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('.ai-reveal'))
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const el = entry.target as HTMLElement
          el.classList.add('is-visible')
          observer.unobserve(el)
        })
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.15 },
    )

    nodes.forEach((el, idx) => {
      el.style.transitionDelay = `${Math.min(idx * 70, 360)}ms`
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div className="w-full min-h-screen bg-[#0F0D0B] text-stone-100">
      <style>{`
        .ai-reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 700ms ease, transform 700ms ease;
        }
        .ai-reveal.is-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .ai-marquee {
          animation: ai-marquee 28s linear infinite;
        }
        .ai-feature-card {
          border-top: 3px solid transparent;
          border-image: linear-gradient(90deg, #E8583A, #f08f79, #E8583A) 1;
          background: #16120f;
          border-radius: 1rem;
          border-left: 1px solid rgba(232, 88, 58, 0.25);
          border-right: 1px solid rgba(232, 88, 58, 0.25);
          border-bottom: 1px solid rgba(232, 88, 58, 0.25);
          padding: 1.25rem;
          box-shadow: 0 18px 40px -18px rgba(0, 0, 0, 0.8);
          animation: ai-float 4s ease-in-out infinite;
        }
        @keyframes ai-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes ai-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ai-reveal, .ai-marquee, .ai-feature-card { animation: none !important; transition: none !important; }
        }
      `}</style>

      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0F0D0B]/75 backdrop-blur-md">
        <div className="max-w-site mx-auto w-full px-3 py-4 sm:px-6 flex items-center justify-between gap-3">
          <SiteBrandLockup logoWordmarkColor="#B65FCF" />
          <Link
            to="/landlord/onboarding"
            className="inline-flex items-center rounded-xl bg-[#E8583A] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition"
          >
            List your property →
          </Link>
        </div>
      </header>

      <section className="pt-10 sm:pt-12 pb-16">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8 text-center">
          <div className="ai-reveal inline-flex items-center gap-2 rounded-full border border-[#E8583A]/35 bg-[#1b1512] px-4 py-1.5 text-xs uppercase tracking-[0.16em] text-stone-200">
            <span className="h-2 w-2 rounded-full bg-[#E8583A] animate-pulse" /> Now live across Australia
          </div>
          <h1 className="ai-reveal mt-7 text-5xl md:text-7xl leading-[1.04] tracking-tight font-serif text-stone-100">
            The smartest way to
            <span className="block italic text-[#E8583A]">rent to students.</span>
          </h1>
          <p className="ai-reveal mt-6 max-w-3xl mx-auto text-base md:text-xl text-stone-300/90 leading-relaxed">
            Quni Living is the only student accommodation platform with built-in AI - from writing your listing to
            pricing it perfectly and replying to enquiries instantly.
          </p>
          <div className="ai-reveal mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              to="/landlord/onboarding"
              className="inline-flex items-center justify-center rounded-xl bg-[#E8583A] px-6 py-3 text-sm font-semibold text-white hover:brightness-110 transition"
            >
              List your property free →
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-transparent px-6 py-3 text-sm font-semibold text-stone-100 hover:bg-white/5 transition"
            >
              See how it works
            </a>
          </div>
          <p className="ai-reveal mt-8 text-sm md:text-base text-stone-400">41 Universities · 122 Campuses · AI Powered</p>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#171310] py-3 overflow-hidden">
        <div className="whitespace-nowrap ai-marquee text-xs md:text-sm uppercase tracking-[0.25em] text-stone-400">
          AI Listing Writer · Smart Pricing Engine · Instant Enquiry Replies · 41 Universities · Stripe Payments ·
          Student Verified · AI Listing Writer · Smart Pricing Engine · Instant Enquiry Replies · 41 Universities ·
          Stripe Payments · Student Verified ·
        </div>
      </section>

      <section id="features" className="bg-[#171310] py-20">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          <div className="ai-reveal">
            <p className="text-xs uppercase tracking-[0.2em] text-[#E8583A]/80">The old way</p>
            <h2 className="mt-3 text-3xl md:text-5xl leading-tight text-stone-100 font-serif">
              Every other platform leaves you to figure it out alone.
            </h2>
            <p className="mt-5 text-stone-300/85 text-base md:text-lg leading-relaxed">
              Most platforms give you a blank form, no pricing intelligence, and no help replying fast. Landlords are
              left guessing while students keep scrolling. Good properties lose attention before they get a fair shot.
            </p>
          </div>
          <div className="space-y-4">
            {[
              ['✍️', 'Blank listing form, no help', 'Most landlords write two lines, students scroll past, bookings lost before contact.'],
              ['💸', 'No idea what to charge', 'Too high students ignore you, too low you lose hundreds per week.'],
              ['📬', 'Enquiries go cold fast', 'Students message five landlords, first to reply wins, slow responses cost tenants.'],
            ].map(([icon, title, desc], i) => (
              <article key={title} className="ai-reveal rounded-2xl border border-white/10 bg-[#120f0d] p-5">
                <p className="text-xl">{icon}</p>
                <h3 className="mt-2 text-lg font-semibold text-stone-100">{title}</h3>
                <p className="mt-2 text-sm text-stone-400 leading-relaxed">{desc}</p>
                <span className="sr-only">{i + 1}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8 space-y-16">
          <FeatureRow
            number="01"
            tag="AI Listing Writer"
            title="A polished listing in one click."
            description="Fill in basics, AI writes a warm compelling description. Or paste a rough draft and hit Improve."
            points={[
              'Australian English tone',
              'Generates from form fields',
              'Improve mode polishes existing copy',
              'Fully editable before publishing',
            ]}
          >
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-stone-300">Room type: Private room</div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-stone-300">Suburb: Kensington</div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-stone-300">
                Amenities: Furnished, Wi-Fi, Near campus
              </div>
              <div className="rounded-lg border border-[#E8583A]/30 bg-[#2a1713] p-3 text-stone-200">
                Bright and fully furnished private room in a quiet student-friendly home...
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg bg-[#E8583A] px-3 py-2 text-xs font-semibold text-white">Write with AI ✦</button>
                <button className="rounded-lg border border-[#E8583A]/60 px-3 py-2 text-xs font-semibold text-[#E8583A]">
                  Improve mine
                </button>
              </div>
            </div>
          </FeatureRow>

          <FeatureRow
            number="02"
            tag="Smart Pricing Engine"
            title="Know exactly what your property is worth."
            description="AI searches Flatmates.com.au, benchmarks against Scape and Iglu as the premium ceiling, returns a data-backed rent range with plain-English reasoning."
            points={[
              'Live Flatmates.com.au data',
              'Scape/Iglu premium benchmarks',
              'Range with reasoning',
              'One click to apply price',
            ]}
            reverse
          >
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-400">Suggested weekly rent range</p>
              <p className="text-4xl md:text-5xl font-serif text-stone-100">$280 — $320 /week</p>
              <div className="border-l-4 border-[#E8583A] bg-black/20 p-3 text-sm text-stone-300">
                Similar private rooms in Kensington are listing between $280-$320. Scape and Iglu sit higher, making
                $300 competitive and realistic.
              </div>
              <p className="text-xs text-stone-500">Sources: Flatmates.com.au · Scape · Iglu</p>
              <button className="w-full rounded-lg bg-[#E8583A] px-4 py-2.5 text-sm font-semibold text-white">
                Use $300/week →
              </button>
            </div>
          </FeatureRow>

          <FeatureRow
            number="03"
            tag="AI Enquiry Assistant"
            title="Never leave a student waiting."
            description="One click drafts a warm professional reply using the student's message and property details. Edit, personalise, send. First landlord to reply wins the tenant."
            points={[
              'Reads student message and property details',
              'Drafts reply in seconds',
              'Fully editable',
              'Student receives email instantly',
            ]}
          >
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="font-medium text-stone-100">Emily Chen · emily@email.com</p>
                <p className="mt-1 text-stone-300">Hi, is this room still available from next month?</p>
                <button className="mt-3 rounded-lg border border-[#E8583A]/60 px-3 py-1.5 text-xs font-semibold text-[#E8583A]">
                  Draft a reply with AI
                </button>
              </div>
              <div className="rounded-lg border border-[#E8583A]/30 bg-[#2a1713] p-3 text-stone-200">
                Hi Emily, thanks for your enquiry and yes, the room is currently available from next month...
              </div>
              <span className="inline-flex rounded-full bg-emerald-900/35 border border-emerald-600/50 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                ✓ Replied
              </span>
            </div>
          </FeatureRow>
        </div>
      </section>

      <section className="bg-[#171310] py-20">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-5">
            <article className="ai-reveal rounded-2xl border border-white/15 bg-[#120f0d] p-6">
              <h3 className="text-xl font-serif text-stone-100">Other platforms:</h3>
              <ul className="mt-4 space-y-2 text-sm text-stone-300/85">
                {[
                  'Blank form, write it yourself',
                  'Guess your own rent price',
                  'Reply manually to every enquiry',
                  'No market data or benchmarks',
                  'Students scroll past bad listings',
                  'Platform takes your money, gives nothing back',
                ].map((item) => (
                  <li key={item}>✕ {item}</li>
                ))}
              </ul>
            </article>
            <article className="ai-reveal rounded-2xl border border-[#E8583A]/70 bg-[#1a120f] p-6">
              <h3 className="text-xl font-serif text-[#E8583A]">Quni Living:</h3>
              <ul className="mt-4 space-y-2 text-sm text-stone-200/90">
                {[
                  'AI writes a polished listing instantly',
                  'Real market pricing data, live',
                  'One-click AI drafted replies',
                  'Flatmates + Scape/Iglu benchmarks',
                  'Listings that actually convert',
                  'AI tools working for you 24/7',
                ].map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-[#171310] py-20">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-5">
            {[
              [
                'Marcus T., Kensington NSW',
                'I had my listing live in 10 minutes. The AI wrote a better description than I ever could have. Booked within a week.',
              ],
              [
                'Sarah K., Carlton VIC',
                "The pricing tool paid for itself immediately. I was undercharging by $60 a week. That's $3,000 a year I was giving away.",
              ],
              [
                'David L., Fortitude Valley QLD',
                'I used to dread writing replies. Now I click one button and it’s done. I replied to six enquiries in two minutes.',
              ],
            ].map(([name, quote]) => (
              <article key={name} className="ai-reveal rounded-2xl border border-white/10 bg-[#120f0d] p-6">
                <p className="text-sm leading-relaxed text-stone-200/95">“{quote}”</p>
                <p className="mt-4 text-xs uppercase tracking-[0.16em] text-stone-400">{name}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center ai-reveal">
          <h2 className="text-4xl md:text-6xl font-serif leading-tight text-stone-100">
            Your property.
            <span className="block italic text-[#E8583A]">Your AI advantage.</span>
          </h2>
          <p className="mt-6 text-base md:text-lg text-stone-300/85 leading-relaxed">
            List for free. Let AI do the heavy lifting. Find your next student tenant faster than ever.
          </p>
          <Link
            to="/landlord/onboarding"
            className="mt-8 inline-flex items-center rounded-xl bg-[#E8583A] px-8 py-3.5 text-base font-semibold text-white hover:brightness-110 transition"
          >
            List your property free →
          </Link>
          <p className="mt-4 text-sm text-stone-500">No subscription. No lock-in. Just results.</p>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
          <span className="text-[#E8583A] text-xl font-semibold">Quni</span>
          <p className="text-stone-500">© 2026 Quni Living · hello@quni.com.au · Sydney, Australia</p>
        </div>
      </footer>
    </div>
  )
}
