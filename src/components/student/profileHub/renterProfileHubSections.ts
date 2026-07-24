import type { ListingHubSectionStatus } from '../../../lib/listingEditHubHealth'
import type { Database } from '../../../lib/database.types'
import type { RenterSituation } from '../../../lib/renterSituation'
import {
  emergencySummary,
  isPersonalDetailsComplete,
  personalDetailsSummary,
  routeSectionTitle,
} from '../../../lib/renterProfileSection'
import { isRouteSectionComplete } from '../../../lib/renterRouteSection'
import { isStep2Saved } from '../../../lib/studentOnboarding'
import { RENTER_SITUATION_OPTIONS } from '../../../lib/renterSituation'
import type { ProfileSectionIconKind } from '../profile/profileSectionIcons'
import type { RenterProfileExpandKey } from '../../../lib/renterProfilePaths'

export type StudentProfileRow = Database['public']['Tables']['student_profiles']['Row']

export const RENTER_PROFILE_HUB_SECTION_IDS = [
  'situation',
  'personal',
  'verification',
  'route',
  'emergency',
  'about',
  'prefs',
] as const satisfies readonly RenterProfileExpandKey[]

export type RenterProfileHubSectionId = (typeof RENTER_PROFILE_HUB_SECTION_IDS)[number]

export function isRenterProfileHubSectionId(
  value: string | null | undefined,
): value is RenterProfileHubSectionId {
  return Boolean(value && (RENTER_PROFILE_HUB_SECTION_IDS as readonly string[]).includes(value))
}

export function renterProfileHubTitle(
  id: RenterProfileHubSectionId,
  situation: RenterSituation | null,
): string {
  switch (id) {
    case 'situation':
      return 'Your situation'
    case 'personal':
      return 'Personal details'
    case 'verification':
      return 'Verification'
    case 'route':
      return situation ? routeSectionTitle(situation) : 'Your route details'
    case 'emergency':
      return 'Emergency contact'
    case 'about':
      return 'About you'
    case 'prefs':
      return 'Living preferences'
  }
}

export function renterProfileHubIcon(
  id: RenterProfileHubSectionId,
  situation: RenterSituation | null,
): ProfileSectionIconKind {
  switch (id) {
    case 'situation':
      return 'situation'
    case 'personal':
      return 'user'
    case 'verification':
      return 'verify'
    case 'route':
      if (situation === 'student') return 'study'
      if (situation === 'working') return 'work'
      return 'verify'
    case 'emergency':
      return 'emergency'
    case 'about':
      return 'bio'
    case 'prefs':
      return 'prefs'
  }
}

export type RenterHubCompleteness = {
  situation: RenterSituation | null
  personalComplete: boolean
  verificationComplete: boolean
  routeComplete: boolean
  showGuarantor: boolean
  guarantorComplete: boolean
  emergencyComplete: boolean
  aboutHasContent: boolean
  prefsHasContent: boolean
}

export function renterProfileHubSectionStatus(
  id: RenterProfileHubSectionId,
  c: RenterHubCompleteness,
): ListingHubSectionStatus {
  switch (id) {
    case 'situation':
      return c.situation ? 'complete' : 'attention'
    case 'personal':
      return c.personalComplete ? 'complete' : 'attention'
    case 'verification':
      return c.verificationComplete ? 'complete' : 'attention'
    case 'route':
      if (!c.situation) return 'notstarted'
      return c.routeComplete && (!c.showGuarantor || c.guarantorComplete) ? 'complete' : 'attention'
    case 'emergency':
      return c.emergencyComplete ? 'complete' : 'attention'
    case 'about':
      return c.aboutHasContent ? 'complete' : 'notstarted'
    case 'prefs':
      return c.prefsHasContent ? 'complete' : 'notstarted'
  }
}

export function renterProfileHubSubtitleLines(
  id: RenterProfileHubSectionId,
  profile: StudentProfileRow,
  c: RenterHubCompleteness,
  verificationSummaryText?: string,
): string[] {
  switch (id) {
    case 'situation': {
      if (!c.situation) return ['Choose your situation']
      const label = RENTER_SITUATION_OPTIONS.find((o) => o.value === c.situation)?.label ?? c.situation
      return [`${label} · ${routeSectionTitle(c.situation)}`]
    }
    case 'personal':
      return [c.personalComplete ? personalDetailsSummary(profile) : 'Add your personal details']
    case 'verification':
      if (!c.situation) return ['Choose your situation first']
      return [
        verificationSummaryText ||
          (c.verificationComplete ? 'Documents on file' : 'Add photo ID and supporting document'),
      ]
    case 'route':
      if (!c.situation) return ['Choose your situation first']
      if (c.routeComplete && (!c.showGuarantor || c.guarantorComplete)) {
        return ['Route details complete']
      }
      return [`Finish ${routeSectionTitle(c.situation).toLowerCase()}`]
    case 'emergency':
      return [c.emergencyComplete ? emergencySummary(profile) : 'Add an emergency contact']
    case 'about':
      return [c.aboutHasContent ? 'A short intro and languages' : 'Optional — intro for landlords']
    case 'prefs':
      return [
        c.prefsHasContent
          ? 'Budget, room type, move-in and lifestyle'
          : 'Optional — budget, room type, move-in',
      ]
  }
}

/** Build completeness flags used by hub rows (caller supplies verification). */
export function buildRenterHubCompleteness(args: {
  profile: StudentProfileRow
  situation: RenterSituation | null
  verificationComplete: boolean
  showGuarantor: boolean
  guarantorComplete: boolean
}): RenterHubCompleteness {
  const { profile, situation, verificationComplete, showGuarantor, guarantorComplete } = args
  return {
    situation,
    personalComplete: isPersonalDetailsComplete(profile),
    verificationComplete,
    routeComplete: situation ? isRouteSectionComplete(situation, profile) : false,
    showGuarantor,
    guarantorComplete,
    emergencyComplete: isStep2Saved(profile),
    aboutHasContent: Boolean(
      profile.bio?.trim() || (profile.languages_spoken && profile.languages_spoken.length > 0),
    ),
    prefsHasContent: Boolean(
      profile.room_type_preference ||
        profile.budget_min_per_week != null ||
        profile.occupancy_type ||
        profile.preferred_move_in_date,
    ),
  }
}
