import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

type Props = {
  profile: StudentRow
  onRefresh: () => Promise<void>
}

export function StudentStripePaymentsCard({ profile, onRefresh }: Props) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setupParam = searchParams.get('stripe_setup')
  useEffect(() => {
    if (setupParam !== 'success' && setupParam !== 'cancel') return
    void onRefresh().then(() => {
      setSearchParams({}, { replace: true })
    })
  }, [setupParam, onRefresh, setSearchParams])

  const startSetup = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setError(null)
    setLoading(true)
    try {
      const { data: sessionData, error: sessErr } = await supabase.auth.getSession()
      if (sessErr) throw sessErr
      const accessToken = sessionData.session?.access_token
      if (!accessToken) {
        setError('You need to be signed in.')
        return
      }
      const res = await fetch('/api/student-stripe-payment-setup', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })
      const raw = await res.text()
      let body: { url?: string; error?: string } = {}
      try {
        body = raw ? (JSON.parse(raw) as typeof body) : {}
      } catch {
        body = { error: raw.trim().slice(0, 280) || `Request failed (${res.status})` }
      }
      if (!res.ok) {
        setError(body.error ?? `Request failed (${res.status})`)
        return
      }
      if (body.url) {
        // Open Stripe hosted URL in a new tab (do not reuse this window).
        const a = document.createElement('a')
        a.href = body.url
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        a.click()
        return
      }
      setError('No checkout URL returned.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start billing setup.')
    } finally {
      setLoading(false)
    }
  }, [])

  const hasCustomer = Boolean(profile.stripe_customer_id?.trim())

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm mb-8 scroll-mt-24">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Rent billing</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-xl">
            Save a card securely with Stripe for when you pay rent through Quni. You can update it anytime;
            we don&apos;t store card numbers on our servers.
          </p>
          {hasCustomer && (
            <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 mt-2 inline-block">
              Stripe billing profile saved — add or replace your card below when you&apos;re ready.
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600 mt-2" role="alert">
              {error}
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void startSetup()}
          className="shrink-0 inline-flex items-center justify-center rounded-xl bg-indigo-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-indigo-700 shadow-sm disabled:opacity-50"
        >
          {loading ? 'Opening Stripe…' : hasCustomer ? 'Add or update card' : 'Save a card for rent'}
        </button>
      </div>
    </div>
  )
}
