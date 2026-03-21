import { useState, type FormEvent } from 'react'
import { getEmailJsContactConfig, sendContactEmail } from '../lib/contactEmail'
import { isTurnstileSiteKeyConfigured, verifyTurnstileToken } from '../lib/verifyTurnstile'
import TurnstileCaptcha from '../components/TurnstileCaptcha'

const SUBJECT_OPTIONS = [
  { value: 'general', label: 'General Enquiry' },
  { value: 'student', label: 'Student Enquiry' },
  { value: 'landlord', label: 'Landlord Enquiry' },
  { value: 'partnership', label: 'Partnership' },
] as const

function IconLocation({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10z" />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  )
}

function IconEnvelope({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function IconPhone({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M22 16.92v2a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h2a2 2 0 0 1 2 1.72c.12.9.33 1.78.63 2.63a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.45-1.2a2 2 0 0 1 2.11-.45c.85.3 1.73.51 2.63.63A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

const iconWrap = 'w-10 h-10 shrink-0 text-[#FF6F61]'

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

    const cfg = getEmailJsContactConfig()
    if (!cfg.ok) {
      setError(cfg.reason)
      return
    }

    if (!isTurnstileSiteKeyConfigured()) {
      setError(
        'Captcha is not configured. The site admin must add VITE_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY.',
      )
      return
    }

    const captcha = await verifyTurnstileToken(captchaToken)
    if (!captcha.ok) {
      setError(captcha.message)
      setCaptchaToken(null)
      setCaptchaResetKey((k) => k + 1)
      return
    }

    setSubmitting(true)
    try {
      await sendContactEmail(cfg, {
        senderName: n,
        senderEmail: em,
        subject: subjectLabel,
        message: msg,
      })
      setSent(true)
      setName('')
      setEmail('')
      setMessage('')
      setSubjectKey('general')
      setCaptchaToken(null)
      setCaptchaResetKey((k) => k + 1)
    } catch (err: unknown) {
      let detail = 'Something went wrong. Please try again.'
      if (err && typeof err === 'object' && 'text' in err && typeof (err as { text: string }).text === 'string') {
        detail = (err as { text: string }).text
      }
      setError(detail)
      setCaptchaToken(null)
      setCaptchaResetKey((k) => k + 1)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50">
      <section className="bg-[#FF6F61] text-white">
        <div className="max-w-site mx-auto px-6 py-14 md:py-20 text-center">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">Get in Touch</h1>
          <p className="mt-4 text-base sm:text-lg text-white max-w-3xl mx-auto leading-relaxed">
            We&apos;d love to hear from you — whether you&apos;re a student looking for accommodation or a landlord
            wanting to list your property.
          </p>
        </div>
      </section>

      <div className="max-w-site mx-auto px-6 py-12 md:py-16 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          <div>
            <h2 className="font-display text-lg font-bold text-gray-900 mb-6">Contact details</h2>
            <ul className="space-y-6 text-gray-700">
              <li className="flex gap-4 items-start">
                <span className={`${iconWrap} flex items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm`}>
                  <IconLocation className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5">Location</p>
                  <p className="text-sm leading-relaxed">Macquarie Park &amp; Ryde Precincts, Sydney NSW</p>
                </div>
              </li>
              <li className="flex gap-4 items-start">
                <span className={`${iconWrap} flex items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm`}>
                  <IconEnvelope className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5">Email</p>
                  <a href="mailto:hello@quni.com.au" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                    hello@quni.com.au
                  </a>
                </div>
              </li>
              <li className="flex gap-4 items-start">
                <span className={`${iconWrap} flex items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm`}>
                  <IconPhone className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5">Phone</p>
                  <p className="text-sm text-gray-500">Coming soon</p>
                </div>
              </li>
              <li className="flex gap-4 items-start">
                <span className={`${iconWrap} flex items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm`}>
                  <IconClock className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5">Hours</p>
                  <p className="text-sm leading-relaxed">Monday – Friday, 9am – 5pm AEST</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
            <h2 className="font-display text-lg font-bold text-gray-900 mb-6">Send a message</h2>
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
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
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
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
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
                    className="w-full py-2 pl-3 pr-8 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
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
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-y min-h-[120px]"
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
        </div>
      </div>
    </div>
  )
}
