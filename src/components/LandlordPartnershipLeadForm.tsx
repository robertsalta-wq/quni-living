import { useState, type FormEvent } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { getEmailJsLandlordLeadConfig, sendLandlordLeadEmail } from '../lib/landlordLeadEmail'
import { isTurnstileSiteKeyConfigured, verifyTurnstileToken } from '../lib/verifyTurnstile'
import TurnstileCaptcha from './TurnstileCaptcha'

const PROPERTY_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2-3', label: '2–3' },
  { value: '4-10', label: '4–10' },
  { value: '10+', label: '10+' },
] as const

type FieldKey = 'name' | 'email' | 'phone' | 'suburb' | 'property_count' | 'captcha'

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF6F61] focus:border-[#FF6F61]'

const labelClass = 'block text-sm font-medium text-white/95 mb-1.5'

export default function LandlordPartnershipLeadForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [suburb, setSuburb] = useState('')
  const [propertyCount, setPropertyCount] = useState<string>(PROPERTY_OPTIONS[0].value)
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)

  function validate(): boolean {
    const e: Partial<Record<FieldKey, string>> = {}
    const n = name.trim()
    const em = email.trim()
    const ph = phone.trim()
    const sub = suburb.trim()

    if (!n) e.name = 'Please enter your full name.'
    if (!em) e.email = 'Please enter your email address.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) e.email = 'Please enter a valid email address.'
    if (!ph) e.phone = 'Please enter your phone number.'
    if (!sub) e.suburb = 'Please enter the suburb of your property.'
    if (!propertyCount) e.property_count = 'Please select how many properties you have.'

    if (isTurnstileSiteKeyConfigured() && !captchaToken) {
      e.captcha = 'Please complete the verification.'
    }

    setFieldErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    setFormError(null)
    if (!validate()) return

    if (!isSupabaseConfigured) {
      setFormError('This form is temporarily unavailable.')
      return
    }

    const emailCfg = getEmailJsLandlordLeadConfig()
    if (!emailCfg.ok) {
      setFormError(emailCfg.reason)
      return
    }

    if (!isTurnstileSiteKeyConfigured()) {
      setFormError(
        'Captcha is not configured. The site admin must add VITE_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY.',
      )
      return
    }

    const captcha = await verifyTurnstileToken(captchaToken)
    if (!captcha.ok) {
      setFieldErrors((prev) => ({ ...prev, captcha: captcha.message }))
      setCaptchaToken(null)
      setCaptchaResetKey((k) => k + 1)
      return
    }

    const row = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      suburb: suburb.trim(),
      property_count: propertyCount,
      message: message.trim() || null,
    }

    setSubmitting(true)
    try {
      const { error: insErr } = await supabase.from('landlord_leads').insert(row)
      if (insErr) throw insErr

      try {
        await sendLandlordLeadEmail(emailCfg, {
          name: row.name,
          email: row.email,
          phone: row.phone,
          suburb: row.suburb,
          propertyCount: row.property_count,
          message: row.message ?? '',
        })
      } catch (emailErr) {
        console.error('Landlord lead email failed', emailErr)
      }

      setSuccess(true)
      setName('')
      setEmail('')
      setPhone('')
      setSuburb('')
      setPropertyCount(PROPERTY_OPTIONS[0].value)
      setMessage('')
      setCaptchaToken(null)
      setCaptchaResetKey((k) => k + 1)
      setFieldErrors({})
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setFormError(msg)
      setCaptchaToken(null)
      setCaptchaResetKey((k) => k + 1)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <p className="text-center text-base font-medium text-white" role="status">
        Thanks! We&apos;ll be in touch within 1 business day.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto space-y-4 sm:space-y-5">
      {formError && (
        <p className="text-sm font-medium text-white text-center" role="alert">
          {formError}
        </p>
      )}

      <div>
        <label htmlFor="ll-name" className={labelClass}>
          Full name
        </label>
        <input
          id="ll-name"
          name="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (fieldErrors.name) setFieldErrors((f) => ({ ...f, name: undefined }))
          }}
          className={inputClass}
        />
        {fieldErrors.name && <p className="mt-1.5 text-sm text-white">{fieldErrors.name}</p>}
      </div>

      <div>
        <label htmlFor="ll-email" className={labelClass}>
          Email address
        </label>
        <input
          id="ll-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }))
          }}
          className={inputClass}
        />
        {fieldErrors.email && <p className="mt-1.5 text-sm text-white">{fieldErrors.email}</p>}
      </div>

      <div>
        <label htmlFor="ll-phone" className={labelClass}>
          Phone number
        </label>
        <input
          id="ll-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value)
            if (fieldErrors.phone) setFieldErrors((f) => ({ ...f, phone: undefined }))
          }}
          className={inputClass}
        />
        {fieldErrors.phone && <p className="mt-1.5 text-sm text-white">{fieldErrors.phone}</p>}
      </div>

      <div>
        <label htmlFor="ll-suburb" className={labelClass}>
          Suburb of property
        </label>
        <input
          id="ll-suburb"
          name="suburb"
          type="text"
          autoComplete="address-level2"
          value={suburb}
          onChange={(e) => {
            setSuburb(e.target.value)
            if (fieldErrors.suburb) setFieldErrors((f) => ({ ...f, suburb: undefined }))
          }}
          className={inputClass}
        />
        {fieldErrors.suburb && <p className="mt-1.5 text-sm text-white">{fieldErrors.suburb}</p>}
      </div>

      <div>
        <label htmlFor="ll-count" className={labelClass}>
          Number of properties
        </label>
        <select
          id="ll-count"
          name="property_count"
          value={propertyCount}
          onChange={(e) => {
            setPropertyCount(e.target.value)
            if (fieldErrors.property_count) setFieldErrors((f) => ({ ...f, property_count: undefined }))
          }}
          className={`${inputClass} cursor-pointer`}
        >
          {PROPERTY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {fieldErrors.property_count && (
          <p className="mt-1.5 text-sm text-white">{fieldErrors.property_count}</p>
        )}
      </div>

      <div>
        <label htmlFor="ll-message" className={labelClass}>
          Message / anything else <span className="font-normal text-white/75">(optional)</span>
        </label>
        <textarea
          id="ll-message"
          name="message"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${inputClass} resize-y min-h-[100px]`}
        />
      </div>

      <div className="flex flex-col items-stretch gap-2">
        <TurnstileCaptcha
          resetKey={captchaResetKey}
          disabled={submitting}
          labelClassName="text-xs font-semibold text-white/95 mb-2"
          onTokenChange={(t) => {
            setCaptchaToken(t)
            if (fieldErrors.captcha) setFieldErrors((f) => ({ ...f, captcha: undefined }))
          }}
        />
        {fieldErrors.captcha && <p className="text-sm text-white">{fieldErrors.captcha}</p>}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#FF6F61] shadow-md hover:bg-white/95 disabled:opacity-60 transition-colors"
      >
        {submitting ? 'Sending…' : 'Get in touch'}
      </button>
    </form>
  )
}
