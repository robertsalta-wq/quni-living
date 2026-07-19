import { isLandlordStripePayoutsComplete } from './onboardingChecklist'
import {
  computeLandlordReadiness,
  type LandlordProfileRow,
} from './landlordProfileReadiness'

export type LandlordOverviewFunnelStepId = 'account' | 'payouts' | 'listing' | 'live'

export type LandlordOverviewFunnelStepState = 'done' | 'current' | 'todo'

export type LandlordOverviewFunnelStep = {
  id: LandlordOverviewFunnelStepId
  label: string
  state: LandlordOverviewFunnelStepState
}

export type LandlordOverviewFunnel = {
  /** Slim green confirmation — listing is live. */
  profileComplete: boolean
  /** "Step 1 of 2" / "Step 2 of 2" for the in-progress header. */
  stepOfTwoLabel: string
  steps: LandlordOverviewFunnelStep[]
  payoutsEnabled: boolean
}

const FUNNEL_LABELS: Record<LandlordOverviewFunnelStepId, string> = {
  account: 'Account',
  payouts: 'Payouts',
  listing: 'Listing',
  live: 'Live',
}

/**
 * Desktop overview profile funnel: Account → Payouts → Listing → Live.
 * Mirrors the bookings progress visual language (done / current / pending).
 */
export function landlordOverviewFunnel(
  profile: LandlordProfileRow | null | undefined,
  activeListings: number,
): LandlordOverviewFunnel {
  const readiness = computeLandlordReadiness(profile)
  const accountDone = readiness.publish.complete
  const payoutsEnabled = isLandlordStripePayoutsComplete(profile)
  const listingDone = activeListings > 0
  const liveDone = listingDone && readiness.accept.identityVerified

  const doneFlags = [accountDone, payoutsEnabled, listingDone, liveDone]
  const ids: LandlordOverviewFunnelStepId[] = ['account', 'payouts', 'listing', 'live']
  const firstIncomplete = doneFlags.findIndex((d) => !d)
  const profileComplete = liveDone || (listingDone && accountDone && payoutsEnabled)

  const steps: LandlordOverviewFunnelStep[] = ids.map((id, i) => {
    if (profileComplete || doneFlags[i]) {
      return { id, label: FUNNEL_LABELS[id], state: 'done' }
    }
    if (i === firstIncomplete) {
      return { id, label: FUNNEL_LABELS[id], state: 'current' }
    }
    return { id, label: FUNNEL_LABELS[id], state: 'todo' }
  })

  const stepOfTwoLabel = accountDone ? 'Step 2 of 2' : 'Step 1 of 2'

  return {
    profileComplete,
    stepOfTwoLabel,
    steps,
    payoutsEnabled,
  }
}
