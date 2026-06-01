import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { apiUrl } from '../../lib/apiUrl'
import { openStripeHostedUrl } from '../../lib/stripeConnectOpen'
import type { Database } from '../../lib/database.types'

type LandlordRow = Database['public']['Tables']['landlord_profiles']['Row']

type Props = {
  profile: LandlordRow
  onRefresh: () => Promise<void>
  /** For deep links from profile (“open dashboard payouts”). */
  anchorId?: string
}

export function LandlordStripePayoutsCard({ profile, onRefresh, anchorId = 'rent-payouts' }: Props) {
  const [connectLoading, setConnectLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [manageLoading, setManageLoading] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const autoSyncOnce = useRef(false)

  const stripePayoutsReady =
    profile.stripe_charges_enabled === true && profile.stripe_payouts_enabled === true
  const stripeNeedsOnboarding =
    Boolean(profile.stripe_connect_account_id) && !stripePayoutsReady

  const refreshFromStripe = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setConnectError(null)
    setSyncLoading(true)
    try {
      const { data: sessionData, error: sessErr } = await supabase.auth.getSession()
      if (sessErr) throw sessErr
      const accessToken = sessionData.session?.access_token
      if (!accessToken) {
        setConnectError('You need to be signed in.')
        return
      }
      const res = await fetch(apiUrl('/api/sync-stripe-connect-status'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const raw = await res.text()
      let body: { ok?: boolean; error?: string } = {}
      try {
        body = raw ? (JSON.parse(raw) as typeof body) : {}
      } catch {
        body = { error: raw.trim().slice(0, 280) || `Request failed (${res.status})` }
      }
      if (!res.ok) {
        setConnectError(body.error ?? `Request failed (${res.status})`)
        return
      }
      await onRefresh()
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : 'Could not refresh payout status.')
    } finally {
      setSyncLoading(false)
    }
  }, [onRefresh])

  useEffect(() => {
    if (!stripeNeedsOnboarding || autoSyncOnce.current) return
    autoSyncOnce.current = true
    void refreshFromStripe()
  }, [stripeNeedsOnboarding, refreshFromStripe])

  const startStripeConnect = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setConnectError(null)
    setConnectLoading(true)
    try {
      const { data: sessionData, error: sessErr } = await supabase.auth.getSession()
      if (sessErr) throw sessErr
      const accessToken = sessionData.session?.access_token
      if (!accessToken) {
        setConnectError('You need to be signed in.')
        return
      }
      const res = await fetch(apiUrl('/api/create-connect-account-link'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ returnContext: 'landlord_dashboard' }),
      })
      const raw = await res.text()
      let body: {
        url?: string
        error?: string
        hint?: string
        alreadyConnected?: boolean
      } = {}
      try {
        body = raw ? (JSON.parse(raw) as typeof body) : {}
      } catch {
        body = { error: raw.trim().slice(0, 280) || `Request failed (${res.status})` }
      }
      if (!res.ok) {
        const hint = body.hint ? ` ${body.hint}` : ''
        setConnectError((body.error ?? `Request failed (${res.status})`) + hint)
        return
      }
      if (body.alreadyConnected) {
        await onRefresh()
        return
      }
      if (body.url) {
        openStripeHostedUrl(body.url)
        return
      }
      setConnectError('No onboarding URL returned.')
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : 'Could not start Stripe setup.')
    } finally {
      setConnectLoading(false)
    }
  }, [onRefresh])

  const manageBankAccount = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setConnectError(null)
    setManageLoading(true)
    try {
      const { data: sessionData, error: sessErr } = await supabase.auth.getSession()
      if (sessErr) throw sessErr
      const accessToken = sessionData.session?.access_token
      if (!accessToken) {
        setConnectError('You need to be signed in.')
        return
      }

      const res = await fetch(apiUrl('/api/create-connect-account-link'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ returnContext: 'landlord_dashboard' }),
      })
      const raw = await res.text()
      let body: { url?: string; error?: string } = {}
      try {
        body = raw ? (JSON.parse(raw) as typeof body) : {}
      } catch {
        body = { error: raw.trim().slice(0, 280) || `Request failed (${res.status})` }
      }

      if (!res.ok) {
        throw new Error(body.error ?? `Request failed (${res.status})`)
      }

      if (body.url) {
        openStripeHostedUrl(body.url)
        return
      }

      setConnectError('No Stripe management URL returned.')
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : 'Could not open Stripe management.')
    } finally {
      setManageLoading(false)
    }
  }, [])

  if (stripePayoutsReady) {
    return (
      <div
        id={anchorId}
        className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 scroll-mt-24"
      >
        <p className="text-sm font-medium text-emerald-900">Rent payouts enabled</p>
        <button
          type="button"
          disabled={manageLoading || syncLoading}
          onClick={() => void manageBankAccount()}
          className="inline-flex items-center justify-center rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-50 shrink-0"
        >
          {manageLoading ? 'Opening Stripe…' : 'Manage bank account →'}
        </button>
      </div>
    )
  }

  return (
    <div
      id={anchorId}
      className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm mb-6 scroll-mt-24"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Rent payouts</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-xl">
            Connect Stripe to receive rent to your bank — a short Express onboarding flow; we never see your full bank
            details. You can publish listings first; connect before you accept paid bookings.
          </p>
          {connectError && (
            <p className="text-sm text-red-600 mt-2" role="alert">
              {connectError}
            </p>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-stretch sm:items-end gap-2">
          {stripeNeedsOnboarding ? (
            <>
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 sm:text-right">
                Stripe account linked. We show “connected” when Stripe reports charges and payouts enabled
                (usually right after you finish onboarding — we sync automatically once, or use Refresh).
              </p>
              <div className="flex flex-col sm:items-end gap-2">
                <button
                  type="button"
                  disabled={connectLoading || syncLoading}
                  onClick={() => void startStripeConnect()}
                  className="inline-flex items-center justify-center rounded-xl bg-[#FF6F61] text-white px-5 py-2.5 text-sm font-medium hover:bg-[#e85d52] shadow-sm disabled:opacity-50"
                >
                  {connectLoading ? 'Opening Stripe…' : 'Continue Stripe setup'}
                </button>
                <button
                  type="button"
                  disabled={manageLoading || connectLoading || syncLoading}
                  onClick={() => void manageBankAccount()}
                  className="inline-flex items-center justify-center rounded-xl bg-[#FF6F61] text-white px-5 py-2.5 text-sm font-medium hover:bg-[#e85d52] shadow-sm disabled:opacity-50"
                >
                  {manageLoading ? 'Opening Stripe…' : 'Manage bank account →'}
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              disabled={connectLoading}
              onClick={() => void startStripeConnect()}
              className="inline-flex items-center justify-center rounded-xl bg-[#FF6F61] text-white px-5 py-2.5 text-sm font-medium hover:bg-[#e85d52] shadow-sm disabled:opacity-50"
            >
              {connectLoading ? 'Opening Stripe…' : 'Connect bank account →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
