import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { apiUrl } from '../../lib/apiUrl'
import { openStripeHostedUrl } from '../../lib/stripeConnectOpen'
import { startLandlordStripeConnect } from '../../lib/startLandlordStripeConnect'
import { resetLandlordStripeConnect } from '../../lib/resetLandlordStripeConnect'
import { stripeConnectLandlordTypeHint } from '../../lib/stripeConnectLandlordTypeHint'
import { Link } from 'react-router-dom'
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
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const autoSyncOnce = useRef(false)

  const landlordTypeHint = stripeConnectLandlordTypeHint(profile.landlord_type)

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
      const result = await startLandlordStripeConnect('landlord_dashboard')
      if (!result.ok) {
        setConnectError(result.error)
        return
      }
      if (result.alreadyConnected) {
        await onRefresh()
      }
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

  const resetStripeSetup = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setConnectError(null)
    setResetLoading(true)
    try {
      const result = await resetLandlordStripeConnect()
      if (!result.ok) {
        setConnectError(result.error)
        return
      }
      setResetConfirmOpen(false)
      autoSyncOnce.current = false
      if (result.stripeDeleteWarning) {
        setConnectError(result.stripeDeleteWarning)
      }
      await onRefresh()
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : 'Could not reset Stripe setup.')
    } finally {
      setResetLoading(false)
    }
  }, [onRefresh])

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

  const payoutActions = stripeNeedsOnboarding ? (
    <>
      <button
        type="button"
        disabled={connectLoading || syncLoading}
        onClick={() => void startStripeConnect()}
        className="inline-flex items-center justify-center rounded-xl bg-[#FF6F61] text-white px-5 py-2.5 text-sm font-medium hover:bg-[#e85d52] shadow-sm disabled:opacity-50 whitespace-nowrap"
      >
        {connectLoading ? 'Opening Stripe…' : 'Continue Stripe setup'}
      </button>
      <button
        type="button"
        disabled={manageLoading || connectLoading || syncLoading}
        onClick={() => void manageBankAccount()}
        className="inline-flex items-center justify-center rounded-xl border border-[#FF6F61]/40 bg-white text-[#FF6F61] px-5 py-2.5 text-sm font-medium hover:bg-[#FFF5F4] shadow-sm disabled:opacity-50 whitespace-nowrap"
      >
        {manageLoading ? 'Opening Stripe…' : 'Manage bank account →'}
      </button>
      <button
        type="button"
        disabled={syncLoading || connectLoading || manageLoading}
        onClick={() => void refreshFromStripe()}
        className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
      >
        {syncLoading ? 'Refreshing…' : 'Refresh status'}
      </button>
    </>
  ) : (
    <button
      type="button"
      disabled={connectLoading}
      onClick={() => void startStripeConnect()}
      className="inline-flex items-center justify-center rounded-xl bg-[#FF6F61] text-white px-5 py-2.5 text-sm font-medium hover:bg-[#e85d52] shadow-sm disabled:opacity-50 whitespace-nowrap"
    >
      {connectLoading ? 'Opening Stripe…' : 'Connect bank account →'}
    </button>
  )

  return (
    <div
      id={anchorId}
      className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm mb-6 scroll-mt-24"
    >
      {stripeNeedsOnboarding && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 leading-relaxed">
          Stripe account linked. We show “connected” when Stripe reports charges and payouts enabled (usually right
          after you finish onboarding — we sync automatically once, or use Refresh status).
        </p>
      )}
      {landlordTypeHint && (
        <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4 leading-relaxed">
          {landlordTypeHint}{' '}
          <Link to="/landlord/profile" className="font-semibold text-[#FF6F61] underline underline-offset-2">
            Update profile type
          </Link>
        </p>
      )}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-gray-900">Rent payouts</h2>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Connect Stripe to receive rent to your bank — a short Express onboarding flow; we never see your full bank
            details. You can publish listings first; connect before you accept paid bookings.
          </p>
          {connectError && (
            <p className="text-sm text-red-600 mt-2" role="alert">
              {connectError}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 shrink-0 lg:max-w-none">{payoutActions}</div>
      </div>
      {stripeNeedsOnboarding && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          {!resetConfirmOpen ? (
            <p className="text-sm text-gray-600 leading-relaxed">
              Chose the wrong option in Stripe (e.g. Company instead of Individual)?{' '}
              <button
                type="button"
                onClick={() => setResetConfirmOpen(true)}
                className="font-semibold text-[#FF6F61] underline underline-offset-2"
              >
                Start Stripe setup over
              </button>
            </p>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 space-y-3">
              <p className="text-sm text-gray-800 leading-relaxed">
                This clears your in-progress Stripe link so you can connect again. Use this if Stripe is asking for the
                wrong details (ABN vs personal ID). Your listings are not affected.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={resetLoading}
                  onClick={() => void resetStripeSetup()}
                  className="inline-flex items-center justify-center rounded-lg bg-[#FF6F61] text-white px-4 py-2 text-sm font-semibold hover:bg-[#e85d52] disabled:opacity-50"
                >
                  {resetLoading ? 'Resetting…' : 'Yes, start over'}
                </button>
                <button
                  type="button"
                  disabled={resetLoading}
                  onClick={() => setResetConfirmOpen(false)}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
