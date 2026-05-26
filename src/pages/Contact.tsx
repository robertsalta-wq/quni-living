import { useState, type FormEvent } from 'react'
import { isTurnstileSiteKeyConfigured } from '../lib/verifyTurnstile'
import { apiUrl } from '../lib/apiUrl'
import TurnstileCaptcha from '../components/TurnstileCaptcha'
import Seo from '../components/Seo'
import PageHeroBand from '../components/PageHeroBand'
import LegalFooter from '../components/LegalFooter'

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
        description="Contact Quni Living for student accommodation enquiries, landlord listings, or partnerships. Serving Australian universities nationwide."
        canonicalPath="/contact"
      />
      <PageHeroBand
        title="Get in Touch"
        subtitle="We'd love to hear from you — whether you're a student looking for accommodation or a landlord wanting to list your property."
      />

      <div className="max-w-site mx-auto px-6 py-12 md:py-16 w-full">
        <div className="max-w-xl mx-auto">
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

          <section className="mt-14 border-t border-gray-200 pt-8" aria-labelledby="contact-legal-heading">
            <h2 id="contact-legal-heading" className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Legal
            </h2>
            <LegalFooter className="text-gray-600" />
          </section>
        </div>
      </div>
    </div>
  )
}
