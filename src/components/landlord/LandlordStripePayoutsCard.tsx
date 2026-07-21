import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { apiUrl } from '../../lib/apiUrl'
import { openStripeHostedUrl } from '../../lib/stripeConnectOpen'
import { startLandlordStripeConnect } from '../../lib/startLandlordStripeConnect'
import { resetLandlordStripeConnect } from '../../lib/resetLandlordStripeConnect'
import { stripeConnectLandlordTypeHint } from '../../lib/stripeConnectLandlordTypeHint'
import type { StripeConnectRequirementsSummary } from '../../lib/stripeConnectRequirements'
import { landlordDashboardProfilePath } from '../../lib/landlordDashboardProfilePaths'
import { Link } from 'react-router-dom'
import type { Database } from '../../lib/database.types'

type LandlordRow = Database['public']['Tables']['landlord_profiles']['Row']

type Props = {
  profile: LandlordRow
  onRefresh: () => Promise<void>
  /** For deep links from profile (“open dashboard payouts”). */
  anchorId?: string
  /**
   * `full` — existing dashboard card (mobile + legacy).
   * `status` — compact enabled / not-set-up card for desktop overview.
   */
  presentation?: 'full' | 'status'
}

export function LandlordStripePayoutsCard({
  profile,
  onRefresh,
  anchorId = 'rent-payouts',
  presentation = 'full',
}: Props) {
  const [connectLoading, setConnectLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [manageLoading, setManageLoading] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [requirementsSummary, setRequirementsSummary] = useState<StripeConnectRequirementsSummary | null>(null)
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
      let body: {
        ok?: boolean
        error?: string
        requirementsSummary?: StripeConnectRequirementsSummary
      } = {}
      try {
        body = raw ? (JSON.parse(raw) as typeof body) : {}
      } catch {
        body = { error: raw.trim().slice(0, 280) || `Request failed (${res.status})` }
      }
      if (!res.ok) {
        setConnectError(body.error ?? `Request failed (${res.status})`)
        return
      }
      setRequirementsSummary(body.requirementsSummary ?? null)
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
      setRequirementsSummary(null)
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

  if (presentation === 'status') {
    if (stripePayoutsReady) {
      return (
        <div
          id={anchorId}
          className="flex w-full flex-col justify-center rounded-[var(--radius-lg)] border border-[rgba(29,158,117,0.30)] bg-[var(--quni-success-bg)] px-[18px] py-4 shadow-[var(--shadow-1)] transition-[transform,box-shadow] duration-200 ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-2)] scroll-mt-24"
        >
          <div className="mb-1.5 flex items-center gap-2.5">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--quni-success-strong)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
              aria-hidden
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <path d="m9 11 3 3L22 4" />
            </svg>
            <p className="m-0 text-sm font-bold text-[var(--quni-success-strong)]">Rent payouts enabled</p>
          </div>
          <p className="m-0 mb-2.5 text-[12.5px] leading-normal text-[var(--quni-success-strong)]">
            Connected & verified — paid out within 2 business days.
          </p>
          <button
            type="button"
            disabled={manageLoading || syncLoading}
            onClick={() => void manageBankAccount()}
            className="w-fit text-[13px] font-semibold text-[var(--quni-success-strong)] transition-colors hover:text-[var(--quni-coral-active)] disabled:opacity-50"
          >
            {manageLoading ? 'Opening Stripe…' : 'Manage bank account →'}
          </button>
          {connectError ? (
            <p className="mt-2 text-sm text-[var(--quni-danger)]" role="alert">
              {connectError}
            </p>
          ) : null}
        </div>
      )
    }

    return (
      <div
        id={anchorId}
        className="flex w-full flex-col justify-center rounded-[var(--radius-lg)] border border-[rgba(255,111,97,0.40)] bg-[rgba(255,111,97,0.06)] px-[18px] py-4 shadow-[var(--shadow-1)] transition-[transform,box-shadow] duration-200 ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-2)] scroll-mt-24"
      >
        <div className="mb-1.5 flex items-center gap-2.5">
          <span className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#FBEBE9] text-[#B4322A]">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            </svg>
          </span>
          <p className="m-0 text-sm font-bold text-[var(--quni-ink)]">Rent payouts not set up</p>
        </div>
        <p className="m-0 mb-2.5 text-[12.5px] leading-normal text-[var(--quni-ink-4)]">
          Connect a bank account so rent can be paid out to you.
        </p>
        <button
          type="button"
          disabled={connectLoading || syncLoading || manageLoading}
          onClick={() => void (stripeNeedsOnboarding ? manageBankAccount() : startStripeConnect())}
          className="w-fit text-[13px] font-semibold text-[var(--quni-coral)] transition-colors hover:text-[var(--quni-coral-active)] disabled:opacity-50"
        >
          {connectLoading || manageLoading ? 'Opening Stripe…' : 'Set up payouts →'}
        </button>
        {connectError ? (
          <p className="mt-2 text-sm text-[var(--quni-danger)]" role="alert">
            {connectError}
          </p>
        ) : null}
      </div>
    )
  }

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
        className="inline-flex items-center justify-center rounded-xl bg-[var(--quni-coral)] text-white px-5 py-2.5 text-sm font-medium hover:bg-[var(--quni-coral-hover)] shadow-sm disabled:opacity-50 whitespace-nowrap"
      >
        {connectLoading ? 'Opening Stripe…' : 'Continue Stripe setup'}
      </button>
      <button
        type="button"
        disabled={manageLoading || connectLoading || syncLoading}
        onClick={() => void manageBankAccount()}
        className="inline-flex items-center justify-center rounded-xl border border-admin-coral/40 bg-white text-[var(--quni-coral)] px-5 py-2.5 text-sm font-medium hover:bg-[#FFF5F4] shadow-sm disabled:opacity-50 whitespace-nowrap"
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
      className="inline-flex items-center justify-center rounded-xl bg-[var(--quni-coral)] text-white px-5 py-2.5 text-sm font-medium hover:bg-[var(--quni-coral-hover)] shadow-sm disabled:opacity-50 whitespace-nowrap"
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
          Stripe account linked. Finish every section in Stripe (business info, personal ID, bank) before you can
          submit. We sync status automatically once, or use Refresh status.
        </p>
      )}
      {stripeNeedsOnboarding && requirementsSummary && requirementsSummary.pendingCount > 0 && (
        <div className="text-xs text-gray-800 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 mb-4 leading-relaxed space-y-2">
          <p className="font-semibold text-sky-950">Stripe still needs you to complete:</p>
          <ul className="list-disc pl-4 space-y-1">
            {requirementsSummary.items.map((item) => (
              <li key={`${item.kind}:${item.label}:${item.detail ?? ''}`}>
                <span className="font-medium">{item.label}</span>
                {item.detail ? ` - ${item.detail}` : null}
              </li>
            ))}
          </ul>
          {requirementsSummary.hasErrors && (
            <p>
              If <span className="font-medium">Personal details</span> shows Invalid in Stripe, tap{' '}
              <span className="font-medium">Edit</span> there, check your legal name matches your photo ID, and complete
              ID verification again.
            </p>
          )}
        </div>
      )}
      {landlordTypeHint && (
        <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4 leading-relaxed">
          {landlordTypeHint}{' '}
          <Link to={landlordDashboardProfilePath('personal')} className="font-semibold text-[var(--quni-coral)] underline underline-offset-2">
            Update profile type
          </Link>
        </p>
      )}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-gray-900">Rent payouts</h2>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Connect Stripe to receive rent to your bank - a short Express onboarding flow; we never see your full bank
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
                className="font-semibold text-[var(--quni-coral)] underline underline-offset-2"
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
                  className="inline-flex items-center justify-center rounded-lg bg-[var(--quni-coral)] text-white px-4 py-2 text-sm font-semibold hover:bg-[var(--quni-coral-hover)] disabled:opacity-50"
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
