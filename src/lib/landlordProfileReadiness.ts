import type { Database } from './database.types'
import { landlordProfileHostIdentityVerified } from './landlordBookingConfirmGate'
import { landlordNonDiscriminationAccepted } from './nonDiscriminationPolicy'

export type LandlordProfileRow = Database['public']['Tables']['landlord_profiles']['Row']

export type LandlordPublishSectionKey = 'personal' | 'address' | 'about' | 'agreements'

const PUBLISH_SECTION_ORDER: LandlordPublishSectionKey[] = ['personal', 'address', 'about', 'agreements']

export type LandlordReadinessOpts = {
  /** Drives identity predicate tier (listing admin override). Default `listing`. */
  acceptTier?: 'listing' | 'managed'
}

export type LandlordPublishReadiness = {
  sections: Record<LandlordPublishSectionKey, boolean>
  complete: boolean
  doneCount: number
  totalCount: 4
  missing: LandlordPublishSectionKey[]
}

export type LandlordAcceptReadiness = {
  identityVerified: boolean
  /** Listing billing customer id present — authoritative default PM check stays at confirm time. */
  savedCard: boolean
  complete: boolean
}

export type LandlordReadinessPhase = 'publishing' | 'accepting' | 'complete'

export type LandlordReadiness = {
  publish: LandlordPublishReadiness
  accept: LandlordAcceptReadiness
  phase: LandlordReadinessPhase
}

export function isLandlordPersonalSectionComplete(p: LandlordProfileRow | null | undefined): boolean {
  if (!p) return false
  return Boolean(p.first_name?.trim() && p.last_name?.trim() && p.phone?.trim())
}

export function isLandlordAddressSectionComplete(p: LandlordProfileRow | null | undefined): boolean {
  if (!p) return false
  if (!p.address?.trim() || !p.suburb?.trim() || !p.postcode?.trim() || !p.state?.trim()) {
    return false
  }
  const state = p.state.trim().toUpperCase()
  if (state !== 'NSW' && !p.residence_location?.trim()) {
    return false
  }
  return true
}

/** Bio required for publish; profile photo is optional and excluded. */
export function isLandlordAboutSectionComplete(p: LandlordProfileRow | null | undefined): boolean {
  if (!p) return false
  return Boolean(p.bio?.trim())
}

export function isLandlordAgreementsSectionComplete(p: LandlordProfileRow | null | undefined): boolean {
  if (!p) return false
  return Boolean(
    p.terms_accepted_at && p.landlord_terms_accepted_at && landlordNonDiscriminationAccepted(p),
  )
}

export function isLandlordPublishComplete(p: LandlordProfileRow | null | undefined): boolean {
  return computeLandlordReadiness(p).publish.complete
}

export function computeLandlordReadiness(
  profile: LandlordProfileRow | null | undefined,
  opts?: LandlordReadinessOpts,
): LandlordReadiness {
  const acceptTier = opts?.acceptTier ?? 'listing'

  const sections: Record<LandlordPublishSectionKey, boolean> = {
    personal: isLandlordPersonalSectionComplete(profile),
    address: isLandlordAddressSectionComplete(profile),
    about: isLandlordAboutSectionComplete(profile),
    agreements: isLandlordAgreementsSectionComplete(profile),
  }

  const missing = PUBLISH_SECTION_ORDER.filter((key) => !sections[key])
  const doneCount = PUBLISH_SECTION_ORDER.length - missing.length
  const complete = missing.length === 0

  const identityVerified = landlordProfileHostIdentityVerified(profile, acceptTier)
  const savedCard = Boolean(profile?.stripe_customer_id?.trim())
  const acceptComplete =
    acceptTier === 'managed' ? identityVerified : identityVerified && savedCard

  let phase: LandlordReadinessPhase = 'publishing'
  if (complete && identityVerified) {
    phase = 'complete'
  } else if (complete) {
    phase = 'accepting'
  }

  return {
    publish: {
      sections,
      complete,
      doneCount,
      totalCount: 4,
      missing,
    },
    accept: {
      identityVerified,
      savedCard,
      complete: acceptComplete,
    },
    phase,
  }
}

/** First publish-gap action for dashboard CTAs (existing profile URLs until stage c/d). */
export function landlordPublishFirstIncompleteAction(
  profile: LandlordProfileRow | null | undefined,
): { label: string; href: string } | null {
  const { publish } = computeLandlordReadiness(profile)
  if (publish.complete) return null

  for (const key of publish.missing) {
    switch (key) {
      case 'agreements':
        if (!profile?.terms_accepted_at) {
          return { label: 'Accept terms of service →', href: '/landlord-profile#account-agreements' }
        }
        if (!profile?.landlord_terms_accepted_at) {
          return {
            label: 'Accept landlord service agreement →',
            href: '/landlord-profile#account-agreements',
          }
        }
        if (!landlordNonDiscriminationAccepted(profile)) {
          return {
            label: 'Accept non-discrimination policy →',
            href: '/landlord-profile#account-agreements',
          }
        }
        break
      case 'personal':
        if (!profile?.first_name?.trim() || !profile?.last_name?.trim()) {
          return { label: 'Add your name →', href: '/landlord/profile' }
        }
        if (!profile?.phone?.trim()) {
          return { label: 'Add your phone →', href: '/landlord/profile' }
        }
        break
      case 'address':
        return { label: 'Complete your address →', href: '/landlord/profile' }
      case 'about':
        return { label: 'Add a bio →', href: '/landlord/profile' }
    }
  }

  return null
}

export function landlordProfileStatCardCopy(readiness: LandlordReadiness): {
  headline: string
  showPublishProgress: boolean
  publishPct: number
} {
  const { publish, accept } = readiness

  if (!publish.complete) {
    const publishPct = Math.round((publish.doneCount / publish.totalCount) * 100)
    return {
      headline: `${publishPct}% · Finish to publish a listing`,
      showPublishProgress: true,
      publishPct,
    }
  }

  if (!accept.identityVerified) {
    return {
      headline: 'Listing-ready · Finish setup to accept bookings',
      showPublishProgress: false,
      publishPct: 100,
    }
  }

  return {
    headline: 'Fully set up',
    showPublishProgress: false,
    publishPct: 100,
  }
}
