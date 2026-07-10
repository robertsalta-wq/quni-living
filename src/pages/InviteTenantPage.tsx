import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Seo from '../components/Seo'
import PageRouteFallback from '../components/PageRouteFallback'
import { PropertyCard } from '../components/PropertyCard'
import { useAuthContext } from '../context/AuthContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { setQuniTenantInviteContext } from '../lib/quniTenantInvite'
import { setPostAuthRedirect } from '../lib/postAuthRedirect'
import { absoluteUrl } from '../lib/site'
import { PROPERTY_CARD_LIST_SELECT } from '../lib/propertyCardSelect'
import TenantInviteOfferBanner from '../components/tenantInvite/TenantInviteOfferBanner'
import RenterPlatformTrustPanel from '../components/RenterPlatformTrustPanel'
import { tenantInviteOfferFromRpcRow, previewInviteBondAud } from '../lib/pricing/tenantInviteOffer'
import {
  formatListingBondDisplayLabel,
  listingCoupleOccupancyWeeklyRentAud,
} from './PropertyDetail'
import type { Property } from '../lib/listings'

type ResolvedInvite = {
  property_id: string
  property_slug: string | null
  student_only: boolean
  invite_status: string
  invited_email: string | null
  invited_name: string | null
  offered_weekly_rent: number | null
  offer_reason: string | null
  offered_bond_weeks: number | null
}

function inviteErrorMessage(status: string): string {
  switch (status) {
    case 'expired':
      return 'This invite link has expired. Ask your landlord to send a new one.'
    case 'revoked':
      return 'This invite is no longer active. Ask your landlord to send a new link.'
    case 'accepted':
      return 'This invite has already been used. If you still need to book, open the listing on Quni or ask your landlord for a new invite.'
    case 'invalid':
    default:
      return 'This invite link is not valid. Check the URL or ask your landlord to send a fresh link.'
  }
}

export default function InviteTenantPage() {
  const { token: tokenParam } = useParams<{ token: string }>()
  const token = tokenParam?.trim() ?? ''
  const navigate = useNavigate()
  const { user, role, loading: authLoading } = useAuthContext()
  const [resolved, setResolved] = useState<ResolvedInvite | null>(null)
  const [property, setProperty] = useState<Property | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [resolving, setResolving] = useState(true)

  const bookingPath = resolved
    ? `/booking/${resolved.property_id}?invite=${encodeURIComponent(token)}`
    : null

  useEffect(() => {
    if (!token || !isSupabaseConfigured) {
      setResolveError(inviteErrorMessage('invalid'))
      setResolving(false)
      return
    }

    let cancelled = false
    ;(async () => {
      setResolving(true)
      setResolveError(null)
      try {
        const { data, error } = await supabase.rpc('resolve_tenant_invite', { p_token: token })
        if (cancelled) return
        if (error) {
          setResolveError('We could not load this invite. Please try again in a moment.')
          return
        }
        const row = Array.isArray(data) ? (data[0] as ResolvedInvite | undefined) : (data as ResolvedInvite | null)
        if (!row?.property_id || row.invite_status !== 'pending') {
          setResolveError(inviteErrorMessage(row?.invite_status ?? 'invalid'))
          return
        }
        setResolved(row)

        const { data: prop, error: propErr } = await supabase
          .from('properties')
          .select(PROPERTY_CARD_LIST_SELECT)
          .eq('id', row.property_id)
          .maybeSingle()
        if (!cancelled && !propErr && prop) {
          setProperty(prop as Property)
        }
      } catch {
        if (!cancelled) setResolveError('We could not load this invite. Please try again in a moment.')
      } finally {
        if (!cancelled) setResolving(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (!resolved || !bookingPath || authLoading || resolving) return

    setQuniTenantInviteContext(token, resolved.property_id, {
      propertyTitle: property?.title ?? null,
      studentOnly: resolved.student_only,
      invitedName: resolved.invited_name,
      offeredWeeklyRentAud: tenantInviteOfferFromRpcRow(resolved).offeredWeeklyRentAud,
      offerReason: tenantInviteOfferFromRpcRow(resolved).offerReason,
    })
    setPostAuthRedirect(bookingPath)

    if (user && role !== 'landlord') {
      navigate(bookingPath, { replace: true })
    }
  }, [resolved, bookingPath, user, role, authLoading, resolving, token, navigate, property?.title])

  const continueToSignup = useCallback(() => {
    if (!resolved || !bookingPath) return

    setQuniTenantInviteContext(token, resolved.property_id, {
      propertyTitle: property?.title ?? null,
      studentOnly: resolved.student_only,
      invitedName: resolved.invited_name,
      offeredWeeklyRentAud: tenantInviteOfferFromRpcRow(resolved).offeredWeeklyRentAud,
      offerReason: tenantInviteOfferFromRpcRow(resolved).offerReason,
    })
    setPostAuthRedirect(bookingPath)

    const params = new URLSearchParams()
    params.set('redirect', bookingPath)
    if (resolved.invited_email?.trim()) params.set('invited_email', resolved.invited_email.trim())
    if (resolved.invited_name?.trim()) params.set('invited_name', resolved.invited_name.trim())
    if (property?.title?.trim()) params.set('invite_property', property.title.trim())
    if (resolved.student_only) params.set('invite_student_only', '1')
    navigate(`/signup?${params.toString()}`)
  }, [resolved, bookingPath, token, property?.title, navigate])

  const loginHref = bookingPath
    ? `/login?redirect=${encodeURIComponent(bookingPath)}`
    : '/login'

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center text-gray-600 text-sm">
        This site is not configured for invites yet.
      </div>
    )
  }

  if (resolving) {
    return (
      <>
        <Seo title="Invitation" noindex description="Tenant invite on Quni Living." />
        <PageRouteFallback />
      </>
    )
  }

  if (resolveError || !resolved) {
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center">
        <Seo title="Invite unavailable" noindex description="Tenant invite on Quni Living." />
        <h1 className="text-xl font-semibold text-gray-900 mb-3">Invite unavailable</h1>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          {resolveError ?? inviteErrorMessage('invalid')}
        </p>
        <Link to="/listings" className="text-sm font-medium text-[#FF6F61] hover:underline">
          Browse listings
        </Link>
      </div>
    )
  }

  if (user && role === 'landlord') {
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center">
        <Seo title="Tenant invite" noindex description="Tenant invite on Quni Living." />
        <h1 className="text-xl font-semibold text-gray-900 mb-3">Share this link with your tenant</h1>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          You are signed in as a landlord. This invite is for renters completing the standard verification and
          booking flow.
        </p>
        <p className="text-xs text-gray-500 break-all mb-6">{absoluteUrl(`/invite/${token}`)}</p>
        <Link to="/landlord/dashboard" className="text-sm font-medium text-[#FF6F61] hover:underline">
          Back to dashboard
        </Link>
      </div>
    )
  }

  if (user) {
    return (
      <>
        <Seo title="Invitation" noindex description="Tenant invite on Quni Living." />
        <PageRouteFallback />
      </>
    )
  }

  const greeting = resolved.invited_name?.trim()
    ? `Hi ${resolved.invited_name.trim().split(/\s+/)[0]},`
    : null
  const inviteOffer = tenantInviteOfferFromRpcRow(resolved)
  const listingRent = property?.rent_per_week != null ? Number(property.rent_per_week) : 0
  const bondPropertyForDisplay =
    property && inviteOffer.offeredBondWeeks != null
      ? { ...property, bond_weeks: inviteOffer.offeredBondWeeks }
      : property
  const listingBondDisplayLabel =
    bondPropertyForDisplay && listingRent > 0
      ? formatListingBondDisplayLabel(
          bondPropertyForDisplay,
          listingRent,
          listingCoupleOccupancyWeeklyRentAud(bondPropertyForDisplay),
        )
      : null
  const inviteBondAud =
    property && listingRent > 0
      ? previewInviteBondAud(property, resolved, listingRent)
      : null

  return (
    <div className="max-w-sm lg:max-w-5xl mx-auto px-6 lg:px-8 py-12 sm:py-16">
      <Seo title="You're invited to book" noindex description="Landlord tenant invite on Quni Living." />

      <div className="lg:grid lg:grid-cols-2 lg:gap-x-14 lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Landlord invitation</p>
          <h1 className="mt-2 text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
            {greeting ? `${greeting} you're invited to book` : "You're invited to book on Quni"}
          </h1>
          <p className="mt-2 text-sm lg:text-base text-gray-600 leading-relaxed">
            Your landlord uses Quni to handle applications and tenancy paperwork for this room. Review the listing below
            first — you can see how verification works before sharing ID documents.
          </p>
        </div>

        <div className="mt-6 lg:mt-0 lg:col-start-2 lg:row-start-1 lg:row-span-6">
          {property ? (
            <PropertyCard property={property} staticDisplay />
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
              Loading listing details…
            </div>
          )}
          {resolved.property_slug && (
            <Link
              to={`/properties/${resolved.property_slug}`}
              className="mt-3 inline-block text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              View full listing details →
            </Link>
          )}
        </div>

        <div className="mt-6 lg:mt-8 lg:col-start-1">
          {resolved.student_only && (
            <p className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-gray-700">
              This room is for students only — you&apos;ll need to verify as a student when you sign up.
            </p>
          )}

          {inviteOffer.hasOffer || inviteOffer.hasBondOffer ? (
            <div className={resolved.student_only ? 'mt-4' : ''}>
              <TenantInviteOfferBanner
                offeredWeeklyRentAud={inviteOffer.offeredWeeklyRentAud}
                bondAmountAud={inviteBondAud}
                offerReason={inviteOffer.offerReason}
              />
            </div>
          ) : property && listingRent > 0 ? (
            <div
              className={`rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-gray-800${resolved.student_only ? ' mt-4' : ''}`}
            >
              {listingBondDisplayLabel != null ? (
                <p>
                  Bond for this listing:{' '}
                  <span className="font-semibold tabular-nums">{listingBondDisplayLabel}</span>
                </p>
              ) : (
                <p>No bond is required for this listing.</p>
              )}
            </div>
          ) : null}

          <ol className="mt-6 space-y-2 text-sm text-gray-600 list-decimal list-inside">
            <li>Create a renter account (student or non-student)</li>
            <li>Confirm your email and complete verification</li>
            <li>Submit your booking request for this room</li>
          </ol>

          <div className="mt-8">
            <RenterPlatformTrustPanel />
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={continueToSignup}
              className="w-full rounded-xl bg-[#FF6F61] text-white py-3 text-sm font-semibold hover:bg-[#e85d52] shadow-sm"
            >
              Create account to continue
            </button>
            <Link
              to={loginHref}
              className="w-full text-center rounded-xl border border-gray-300 bg-white text-gray-800 py-3 text-sm font-semibold hover:bg-gray-50"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
