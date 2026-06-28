import type { Database } from './database.types'
import { landlordDashboardProfilePath } from './landlordDashboardProfilePaths'
import { landlordProfileHostIdentityVerified } from './landlordBookingConfirmGate'
import { landlordNonDiscriminationAccepted } from './nonDiscriminationPolicy'

export type LandlordProfileRow = Database['public']['Tables']['landlord_profiles']['Row']

export type LandlordPublishSectionKey = 'personal' | 'address' | 'about' | 'agreements'

const PUBLISH_SECTION_ORDER: LandlordPublishSectionKey[] = ['personal', 'address', 'about', 'agreements']

export const LANDLORD_PUBLISH_SECTION_LABELS: Record<LandlordPublishSectionKey, string> = {
  personal: 'Personal details',
  address: 'Address',
  about: 'About you',
  agreements: 'Agreements',
}

export function landlordTypeRequiresCompanyDetails(landlordType: string | null | undefined): boolean {
  const t = landlordType?.trim()
  return t === 'company' || t === 'trust'
}

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
  if (!p.first_name?.trim() || !p.last_name?.trim() || !p.phone?.trim() || !p.landlord_type?.trim()) {
    return false
  }
  if (landlordTypeRequiresCompanyDetails(p.landlord_type)) {
    return Boolean(p.company_name?.trim() && p.abn?.trim())
  }
  return true
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

export function landlordPayoutDetailsComplete(
  payout:
    | { account_name?: string | null; bsb?: string | null; account_number?: string | null }
    | null
    | undefined,
): boolean {
  return Boolean(
    payout?.account_name?.trim() && payout?.bsb?.trim() && payout?.account_number?.trim(),
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

/** First publish-gap action for dashboard CTAs. */
export function landlordPublishFirstIncompleteAction(
  profile: LandlordProfileRow | null | undefined,
): { label: string; href: string } | null {
  const { publish } = computeLandlordReadiness(profile)
  if (publish.complete) return null

  for (const key of publish.missing) {
    switch (key) {
      case 'agreements':
        if (!profile?.terms_accepted_at) {
          return {
            label: 'Accept terms of service →',
            href: landlordDashboardProfilePath('agreements'),
          }
        }
        if (!profile?.landlord_terms_accepted_at) {
          return {
            label: 'Accept landlord service agreement →',
            href: landlordDashboardProfilePath('agreements'),
          }
        }
        if (!landlordNonDiscriminationAccepted(profile)) {
          return {
            label: 'Accept non-discrimination policy →',
            href: landlordDashboardProfilePath('agreements'),
          }
        }
        break
      case 'personal':
        if (!profile?.landlord_type?.trim()) {
          return { label: 'Select landlord type →', href: landlordDashboardProfilePath('personal') }
        }
        if (!profile?.first_name?.trim() || !profile?.last_name?.trim()) {
          return { label: 'Add your name →', href: landlordDashboardProfilePath('personal') }
        }
        if (!profile?.phone?.trim()) {
          return { label: 'Add your phone →', href: landlordDashboardProfilePath('personal') }
        }
        if (
          landlordTypeRequiresCompanyDetails(profile.landlord_type) &&
          (!profile.company_name?.trim() || !profile.abn?.trim())
        ) {
          return { label: 'Add company details →', href: landlordDashboardProfilePath('personal') }
        }
        break
      case 'address':
        return { label: 'Complete your address →', href: landlordDashboardProfilePath('address') }
      case 'about':
        return { label: 'Add a bio →', href: landlordDashboardProfilePath('about') }
    }
  }

  return null
}

export type LandlordReadinessDriverContent = {
  eyebrow: string
  title: string
  fraction: string
  fractionLabel: string
  steps: { label: string; state: 'done' | 'active' | 'todo' }[]
  progress: number
  tone?: 'default' | 'positive'
  lineText: string
  lineShowLock: boolean
}

function acceptProgress(readiness: LandlordReadiness, acceptTier: 'listing' | 'managed') {
  const total = acceptTier === 'managed' ? 1 : 2
  let done = readiness.accept.identityVerified ? 1 : 0
  if (acceptTier !== 'managed' && readiness.accept.savedCard) done += 1
  return { done, total, progress: total > 0 ? done / total : 0 }
}

/** Prop data for ProfileReadinessDriver (line rendered by the page). */
export function buildLandlordReadinessDriverContent(
  readiness: LandlordReadiness,
  opts?: LandlordReadinessOpts,
): LandlordReadinessDriverContent {
  const acceptTier = opts?.acceptTier ?? 'listing'
  const { publish, phase } = readiness

  if (phase === 'complete') {
    return {
      eyebrow: 'Step 2 of 2 · Accept bookings',
      title: "You're fully set up",
      fraction: acceptTier === 'managed' ? '1 / 1' : '2 / 2',
      fractionLabel: 'ready to accept bookings',
      steps: [
        { label: 'Publish a listing', state: 'done' },
        { label: 'Accept bookings', state: 'done' },
      ],
      progress: 1,
      tone: 'positive',
      lineText: 'Listing and accepting bookings.',
      lineShowLock: false,
    }
  }

  if (phase === 'accepting') {
    const ap = acceptProgress(readiness, acceptTier)
    return {
      eyebrow: 'Step 2 of 2 · Accept bookings',
      title: 'You can list now',
      fraction: `${ap.done} / ${ap.total}`,
      fractionLabel: 'to accept bookings',
      steps: [
        { label: 'Publish a listing', state: 'done' },
        { label: 'Accept bookings', state: 'active' },
      ],
      progress: ap.progress,
      tone: 'positive',
      lineText:
        'Finish Payouts & identity to accept bookings and generate tenancy agreements (RTA)',
      lineShowLock: false,
    }
  }

  const pct = Math.round((publish.doneCount / publish.totalCount) * 100)
  const missingLabels = publish.missing.map((k) => LANDLORD_PUBLISH_SECTION_LABELS[k])
  const lineText =
    missingLabels.length > 0
      ? `Finish ${missingLabels.join(', ')} to publish a listing`
      : 'Finish your profile to publish a listing'

  return {
    eyebrow: 'Step 1 of 2 · Publish a listing',
    title: `${pct}% ready to list`,
    fraction: `${publish.doneCount} / ${publish.totalCount}`,
    fractionLabel: 'sections to publish a listing',
    steps: [
      { label: 'Publish a listing', state: 'active' },
      { label: 'Accept bookings', state: 'todo' },
    ],
    progress: publish.doneCount / publish.totalCount,
    tone: 'default',
    lineText,
    lineShowLock: true,
  }
}

export function landlordProfileDefaultExpandedSection(
  readiness: LandlordReadiness,
  opts?: { payoutDetailsComplete?: boolean },
): LandlordPublishSectionKey | 'payouts' | 'payeeDetails' {
  if (!readiness.publish.complete) {
    return readiness.publish.missing[0] ?? 'personal'
  }
  if (!readiness.accept.complete) return 'payouts'
  if (opts?.payoutDetailsComplete === false) return 'payeeDetails'
  return 'personal'
}

export function landlordProfileStatCardCopy(readiness: LandlordReadiness): {
  line: string
  showPublishProgress: boolean
  publishPct: number
} {
  const { publish, accept } = readiness

  if (!publish.complete) {
    const publishPct = Math.round((publish.doneCount / publish.totalCount) * 100)
    return {
      line: `Step 1 of 2 · ${publishPct}% · Finish to publish →`,
      showPublishProgress: true,
      publishPct,
    }
  }

  if (!accept.complete) {
    return {
      line: 'Step 2 of 2 · Listing-ready · Finish setup to accept bookings →',
      showPublishProgress: false,
      publishPct: 100,
    }
  }

  return {
    line: 'Done · Fully set up · Listing & bookings enabled',
    showPublishProgress: false,
    publishPct: 100,
  }
}

export function landlordDashboardHeading(profile: LandlordProfileRow | null | undefined): string {
  if (
    profile &&
    landlordTypeRequiresCompanyDetails(profile.landlord_type) &&
    profile.company_name?.trim()
  ) {
    return `Dashboard · ${profile.company_name.trim()}`
  }
  return 'Dashboard'
}
