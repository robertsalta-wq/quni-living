import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { isTurnstileSiteKeyConfigured } from '../lib/verifyTurnstile'
import { apiUrl } from '../lib/apiUrl'
import TurnstileCaptcha from '../components/TurnstileCaptcha'
import Seo from '../components/Seo'
import PageHeroBand from '../components/PageHeroBand'
import LegalFooter from '../components/LegalFooter'

const CONTACT_EMAIL = 'hello@quni.com.au'

const CONTACT_FAQ = [
  {
    id: 'listing-enquiry',
    question: 'How do I ask about a specific listing?',
    answer: (
      <>
        Sign in and open <strong>Messages</strong> on the property page to chat with the landlord before you book. The
        form here is for general Quni questions, not individual listings.
      </>
    ),
  },
  {
    id: 'landlord-managed',
    question: 'I’m a landlord — how does managed tenancy work?',
    answer: (
      <>
        See{' '}
        <Link to="/services/landlord-partnerships" className="font-medium text-[#FF6F61] hover:underline">
          landlord partnerships
        </Link>{' '}
        for how Listing and Managed differ, then choose <strong>Landlord Enquiry</strong> in the form if you still have
        questions.
      </>
    ),
  },
  {
    id: 'partnerships',
    question: 'Bulk housing or portfolio partnerships?',
    answer: (
      <>
        Use subject <strong>Partnership</strong> in the form, or visit{' '}
        <Link to="/services/landlord-partnerships" className="font-medium text-[#FF6F61] hover:underline">
          For landlords
        </Link>{' '}
        for an overview first.
      </>
    ),
  },
  {
    id: 'payments',
    question: 'Payments, deposits, or refunds?',
    answer: (
      <>
        See our{' '}
        <Link to="/refunds" className="font-medium text-[#FF6F61] hover:underline">
          refunds policy
        </Link>{' '}
        for timelines. For a booking already in progress, sign in and use support from your dashboard.
      </>
    ),
  },
] as const

function ContactDetails() {
  return (
    <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm">
      <p className="text-gray-700">
        Prefer email?{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-[#FF6F61] hover:underline">
          {CONTACT_EMAIL}
        </a>
        {' · '}
        We usually reply within <strong className="font-medium text-gray-900">1 business day</strong>.
      </p>
      <p className="mt-2 text-gray-600">
        For listing-specific questions, include your state, move-in dates, and a link to the property. Signed-in users can
        also open a support ticket from their dashboard.
      </p>
    </div>
  )
}

function LandlordPartnershipAd() {
  return (
    <div className="rounded-2xl border border-[#FF6F61]/25 bg-[#FF6F61]/5 p-6 md:p-7">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FF6F61]">For landlords</p>
      <h3 className="font-display mt-2 text-lg font-bold text-gray-900">Portfolio or many properties?</h3>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        If you own several rentals near campus — or want to place a block of rooms with a university — Quni can help you
        list individually or run a managed portfolio with structured leases, verified renter demand, and clearer
        placement support than a generic listing site.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        Explore how Listing and Managed tiers work, typical fees, and partnership options before you fill in the form.
        Choose <strong className="font-medium text-gray-800">Partnership</strong> or{' '}
        <strong className="font-medium text-gray-800">Landlord Enquiry</strong> above if you&apos;d like us to follow up.
      </p>
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
        <Link to="/services/landlord-partnerships" className="text-[#FF6F61] hover:underline">
          Explore landlord partnerships →
        </Link>
        <Link to="/pricing" className="text-gray-700 hover:text-[#FF6F61] hover:underline">
          View pricing
        </Link>
      </div>
    </div>
  )
}

function ContactFaqPanel({ openFaqId, onToggleFaq }: { openFaqId: string | null; onToggleFaq: (id: string) => void }) {
  return (
    <aside className="lg:sticky lg:top-24">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
        <h2 className="font-display text-base font-bold text-gray-900">Common questions</h2>
        <div className="mt-3 divide-y divide-gray-100 border-t border-gray-100">
          {CONTACT_FAQ.map((item) => {
            const open = openFaqId === item.id
            return (
              <div key={item.id} className="border-b border-gray-100">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-medium text-gray-900 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6F61]/40"
                  aria-expanded={open}
                  onClick={() => onToggleFaq(item.id)}
                >
                  <span className="min-w-0 pr-1">{item.question}</span>
                  <svg
                    className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                  </svg>
                </button>
                {open ? <div className="pb-3 text-sm leading-relaxed text-gray-600">{item.answer}</div> : null}
              </div>
            )
          })}
        </div>
      </div>
    </aside>
  )
}

const SUBJECT_OPTIONS = [
  { value: 'general', label: 'General Enquiry' },
  { value: 'student', label: 'Student Enquiry' },
  { value: 'landlord', label: 'Landlord Enquiry' },
  { value: 'partnership', label: 'Partnership' },
] as const

export default function Contact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subjectKey, setSubjectKey] = useState<(typeof SUBJECT_OPTIONS)[number]['value']>('general')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const [openFaqId, setOpenFaqId] = useState<string | null>(CONTACT_FAQ[0].id)

  const subjectLabel = SUBJECT_OPTIONS.find((o) => o.value === subjectKey)?.label ?? 'General Enquiry'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const n = name.trim()
    const em = email.trim()
    const msg = message.trim()

    if (!n || !em || !msg) {
      setError('Please fill in name, email, and message.')
      return
    }

    if (!isTurnstileSiteKeyConfigured()) {
      setError('This form is not available right now. Please email hello@quni.com.au directly.')
      return
    }

    if (!captchaToken?.trim()) {
      setError('Please complete the verification step.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(apiUrl('/api/contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: n,
          email: em,
          subject: subjectLabel,
          message: msg,
          turnstileToken: captchaToken,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setError(typeof data.error === 'string' && data.error ? data.error : 'Something went wrong. Please try again.')
        setCaptchaToken(null)
        setCaptchaResetKey((k) => k + 1)
        return
      }
      setSent(true)
      setName('')
      setEmail('')
      setMessage('')
      setSubjectKey('general')
      setCaptchaToken(null)
      setCaptchaResetKey((k) => k + 1)
    } catch {
      setError('Something went wrong. Please try again.')
      setCaptchaToken(null)
      setCaptchaResetKey((k) => k + 1)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50">
      <Seo
        title="Contact"
        description="Contact Quni Living for accommodation enquiries, landlord listings, or partnerships. Serving Australian universities and professional renters nationwide."
        canonicalPath="/contact"
      />
      <PageHeroBand
        title="Get in Touch"
        subtitle="We'd love to hear from you — whether you're a student looking for accommodation or a landlord wanting to list your property."
      />

      <div className="max-w-site mx-auto px-6 py-12 md:py-16 w-full">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12 items-start">
          <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
            <h2 className="font-display text-lg font-bold text-gray-900">Send a message</h2>
            <ContactDetails />
            {sent ? (
              <p className="text-sm text-green-800 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                Thanks! We&apos;ll be back to you within 1 business day
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="contact-name" className="block text-xs font-medium text-gray-700 mb-1">
                    Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-xs font-medium text-gray-700 mb-1">
                    Email <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label htmlFor="contact-subject" className="block text-xs font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <select
                    id="contact-subject"
                    value={subjectKey}
                    onChange={(e) => setSubjectKey(e.target.value as (typeof SUBJECT_OPTIONS)[number]['value'])}
                    className="w-full bg-white py-2 pl-3 pr-8 text-sm text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                  >
                    {SUBJECT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="contact-message" className="block text-xs font-medium text-gray-700 mb-1">
                    Message <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-y min-h-[120px]"
                  />
                </div>

                <TurnstileCaptcha
                  resetKey={captchaResetKey}
                  onTokenChange={setCaptchaToken}
                  disabled={submitting}
                />

                {error && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-[#FF6F61] text-white px-6 py-2.5 text-sm font-medium hover:opacity-95 transition-opacity disabled:opacity-60"
                >
                  {submitting ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            )}
          </div>

          <LandlordPartnershipAd />
          </div>

          <div className="lg:col-span-4">
            <ContactFaqPanel
              openFaqId={openFaqId}
              onToggleFaq={(id) => setOpenFaqId((current) => (current === id ? null : id))}
            />
          </div>
        </div>

        <section className="mt-14 border-t border-gray-200 pt-8" aria-labelledby="contact-legal-heading">
          <h2 id="contact-legal-heading" className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Legal
          </h2>
          <LegalFooter className="text-gray-600" />
        </section>
      </div>
    </div>
  )
}
