import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import type { Property } from '../lib/listings'
import type { Database } from '../lib/database.types'
import { isTurnstileSiteKeyConfigured, verifyTurnstileToken } from '../lib/verifyTurnstile'
import TurnstileCaptcha from '../components/TurnstileCaptcha'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

function displayNameFromStudent(p: StudentRow | null, email: string | undefined): string {
  if (!p) return email?.split('@')[0]?.trim() ?? ''
  const fn = p.first_name?.trim() ?? ''
  const ln = p.last_name?.trim() ?? ''
  if (fn || ln) return [fn, ln].filter(Boolean).join(' ')
  return p.full_name?.trim() || email?.split('@')[0]?.trim() || ''
}

function weeksBetweenInclusive(start: string, end: string): number {
  const a = new Date(start + 'T12:00:00')
  const b = new Date(end + 'T12:00:00')
  const ms = b.getTime() - a.getTime()
  if (ms < 0) return 0
  return Math.max(1, Math.ceil(ms / (7 * 24 * 60 * 60 * 1000)))
}

export default function Booking() {
  const [searchParams] = useSearchParams()
  const slug = searchParams.get('slug')?.trim() ?? ''
  const { user, profile, role } = useAuthContext()

  const [property, setProperty] = useState<Property | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingProperty, setLoadingProperty] = useState(Boolean(slug && isSupabaseConfigured))

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [moveIn, setMoveIn] = useState('')
  const [moveOut, setMoveOut] = useState('')
  const [occupants, setOccupants] = useState('1')
  const [message, setMessage] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)

  const prefillDoneRef = useRef(false)
  const studentProfile = role === 'student' && profile ? (profile as StudentRow) : null

  const loadProperty = useCallback(async () => {
    if (!slug || !isSupabaseConfigured) {
      setProperty(null)
      setLoadError(null)
      setLoadingProperty(false)
      return
    }
    setLoadingProperty(true)
    setLoadError(null)
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(
          `
            *,
            landlord_profiles ( id, full_name, avatar_url, verified ),
            universities ( id, name, slug ),
            campuses ( id, name )
          `,
        )
        .eq('slug', slug)
        .eq('status', 'active')
        .maybeSingle()

      if (error) throw error
      setProperty(data ? (data as Property) : null)
      if (!data) setLoadError('This listing is not available for booking.')
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Could not load listing.')
      setProperty(null)
    } finally {
      setLoadingProperty(false)
    }
  }, [slug])

  useEffect(() => {
    void loadProperty()
  }, [loadProperty])

  useEffect(() => {
    if (!studentProfile || !user || prefillDoneRef.current) return
    prefillDoneRef.current = true
    setName(displayNameFromStudent(studentProfile, user.email ?? undefined))
    setEmail(studentProfile.email?.trim() || user.email || '')
    setPhone(studentProfile.phone?.trim() || '')
  }, [studentProfile, user])

  const rent = property ? Number(property.rent_per_week) : 0
  const bond = property?.bond != null ? Number(property.bond) : null

  const staySummary = useMemo(() => {
    if (!moveIn || !moveOut || !property || rent <= 0) return null
    if (moveOut <= moveIn) return null
    const weeks = weeksBetweenInclusive(moveIn, moveOut)
    const rentTotal = weeks * rent
    return { weeks, rentTotal }
  }, [moveIn, moveOut, property, rent])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    if (!isSupabaseConfigured) {
      setSubmitError('Supabase is not configured.')
      return
    }
    if (!studentProfile) {
      setSubmitError('Only student accounts can request a booking.')
      return
    }
    if (!property?.id) {
      setSubmitError('Invalid listing.')
      return
    }
    if (!property.landlord_id) {
      setSubmitError('This listing has no host on file — bookings are not available.')
      return
    }

    if (!name.trim() || !email.trim()) {
      setSubmitError('Please enter your name and email.')
      return
    }
    if (!moveIn) {
      setSubmitError('Please choose a move-in date.')
      return
    }
    if (moveOut && moveOut <= moveIn) {
      setSubmitError('Move-out must be after move-in.')
      return
    }
    const occ = parseInt(occupants, 10)
    if (!Number.isFinite(occ) || occ < 1 || occ > 20) {
      setSubmitError('Number of occupants must be between 1 and 20.')
      return
    }
    if (!acceptTerms) {
      setSubmitError('Please confirm you agree to the booking terms.')
      return
    }

    if (!isTurnstileSiteKeyConfigured()) {
      setSubmitError(
        'Captcha is not configured. The site admin must add VITE_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY.',
      )
      return
    }

    const captcha = await verifyTurnstileToken(captchaToken)
    if (!captcha.ok) {
      setSubmitError(captcha.message)
      setCaptchaToken(null)
      setCaptchaResetKey((k) => k + 1)
      return
    }

    const notesParts = [`Occupants: ${occ}`]
    if (message.trim()) notesParts.push('', message.trim())
    const notes = notesParts.join('\n')

    setSubmitting(true)
    try {
      const { error } = await supabase.from('bookings').insert({
        property_id: property.id,
        student_id: studentProfile.id,
        landlord_id: property.landlord_id,
        start_date: moveIn,
        end_date: moveOut.trim() || null,
        weekly_rent: rent,
        status: 'pending',
        notes,
      })
      if (error) throw error
      setSuccess(true)
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Could not submit booking.')
      setCaptchaToken(null)
      setCaptchaResetKey((k) => k + 1)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12 text-center text-gray-600 text-sm">
        Configure Supabase in <code className="bg-gray-100 px-1 rounded">.env.local</code>.
      </div>
    )
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Request sent</h1>
        <p className="text-gray-600 text-sm mt-3">
          The landlord will review your booking. You can track status under{' '}
          <strong className="text-gray-800">Profile → Bookings</strong>.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/student-profile"
            className="inline-flex justify-center rounded-xl bg-gray-900 text-white px-5 py-3 text-sm font-semibold hover:bg-gray-800"
          >
            View my bookings
          </Link>
          <Link
            to="/listings"
            className="inline-flex justify-center rounded-xl border border-gray-200 text-gray-800 px-5 py-3 text-sm font-medium hover:bg-gray-50"
          >
            Browse more listings
          </Link>
        </div>
      </div>
    )
  }

  if (!slug) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900">Book a property</h1>
        <p className="text-gray-600 text-sm mt-2">Open a listing and choose &quot;Request to book&quot; to start.</p>
        <Link to="/listings" className="inline-block mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-800">
          Browse listings
        </Link>
      </div>
    )
  }

  if (role !== 'student' || !studentProfile) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900">Student bookings</h1>
        <p className="text-gray-600 text-sm mt-2">
          Booking requests are for student accounts. Sign in with a student profile or complete onboarding as a student.
        </p>
        <Link to="/listings" className="inline-block mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-800">
          Back to listings
        </Link>
      </div>
    )
  }

  if (loadingProperty) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (loadError || !property) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900">Book this property</h1>
        <p className="text-red-600 text-sm mt-4">{loadError ?? 'Listing not found.'}</p>
        <Link to="/listings" className="inline-block mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-800">
          Browse listings
        </Link>
      </div>
    )
  }

  const inputClass =
    'w-full rounded-lg border border-gray-900/20 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white'
  const labelClass = 'block text-sm font-semibold text-gray-900 mb-1'

  const mainPhoto = (property.images ?? []).find((src) => Boolean(src?.trim())) ?? null

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 pb-16">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 sm:items-start">
        <div className="shrink-0 w-full sm:w-40 aspect-[4/3] sm:aspect-[4/3] sm:max-h-36 rounded-xl overflow-hidden border border-gray-100 bg-gray-100 shadow-sm">
          {mainPhoto ? (
            <img src={mainPhoto} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full min-h-[8rem] sm:min-h-0 flex items-center justify-center text-gray-300">
              <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Book this property</h1>
          <p className="text-base font-semibold text-gray-900 mt-2">{property.title}</p>
          {property.suburb && <p className="text-sm text-gray-500 mt-0.5">{property.suburb}</p>}
        </div>
      </div>

      {!property.landlord_id && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This listing doesn&apos;t have a linked host, so booking requests can&apos;t be sent yet.
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-gray-100 bg-gray-50/80 p-5 space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Summary</h2>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Weekly rent</span>
          <span className="font-semibold text-gray-900">
            ${rent.toLocaleString(undefined, { maximumFractionDigits: 0 })} /wk
          </span>
        </div>
        {bond != null && bond > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Bond (from listing)</span>
            <span className="font-semibold text-gray-900">${bond.toLocaleString()}</span>
          </div>
        )}
        {staySummary && (
          <div className="pt-2 border-t border-gray-200/80">
            <p className="text-xs text-gray-500">
              Indicative rent for ~{staySummary.weeks} week{staySummary.weeks !== 1 ? 's' : ''}:{' '}
              <span className="font-medium text-gray-800">
                ${staySummary.rentTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              . Final amount is agreed with the landlord.
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="bk-name" className={labelClass}>
            Your name
          </label>
          <input
            id="bk-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label htmlFor="bk-email" className={labelClass}>
            Your email
          </label>
          <input
            id="bk-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label htmlFor="bk-phone" className={labelClass}>
            Your phone
          </label>
          <input
            id="bk-phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            placeholder="Optional"
          />
        </div>
        <div>
          <label htmlFor="bk-occ" className={labelClass}>
            Number of occupants
          </label>
          <input
            id="bk-occ"
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            value={occupants}
            onChange={(e) => setOccupants(e.target.value)}
            className={`${inputClass} max-w-[8rem]`}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="bk-in" className={labelClass}>
              Move-in date
            </label>
            <input
              id="bk-in"
              type="date"
              value={moveIn}
              onChange={(e) => setMoveIn(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="bk-out" className={labelClass}>
              Move-out date
            </label>
            <input
              id="bk-out"
              type="date"
              value={moveOut}
              onChange={(e) => setMoveOut(e.target.value)}
              className={inputClass}
            />
            <p className="text-xs text-gray-500 mt-1">Optional if you&apos;re flexible on length.</p>
          </div>
        </div>
        <div>
          <label htmlFor="bk-msg" className={labelClass}>
            Message to the host
          </label>
          <textarea
            id="bk-msg"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Introduce yourself, study plans, or any questions about the place."
            className={`${inputClass} resize-y min-h-[6rem]`}
          />
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4">
          <input
            id="bk-terms"
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-900/30 text-indigo-600 focus:ring-indigo-400"
          />
          <label htmlFor="bk-terms" className="text-sm text-gray-700 leading-snug">
            I understand this is a <strong className="text-gray-900">booking request</strong>, not a confirmed lease.
            The landlord may accept, decline, or ask for more details. Information I provide may be shared with the
            host.
          </label>
        </div>

        <TurnstileCaptcha
          resetKey={captchaResetKey}
          onTokenChange={setCaptchaToken}
          disabled={submitting}
        />

        {submitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{submitError}</div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || !property.landlord_id}
            className="flex-1 rounded-xl bg-gray-900 text-white py-3 text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? 'Sending…' : 'Confirm booking'}
          </button>
          <Link
            to={`/properties/${slug}`}
            className="flex-1 text-center rounded-xl border border-gray-200 text-gray-800 py-3 text-sm font-medium hover:bg-gray-50"
          >
            Back to listing
          </Link>
        </div>
      </form>
    </div>
  )
}
