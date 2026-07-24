import type { RenterSituation } from './renterSituation'
import type { StudentProfileRow } from './studentOnboarding'
import type { RenterProfileExpandKey } from './renterProfilePaths'

export type RouteSectionGroup = 'student' | 'working' | 'visa' | 'general'

export function routeSectionGroup(situation: RenterSituation): RouteSectionGroup {
  switch (situation) {
    case 'student':
      return 'student'
    case 'working':
      return 'working'
    case 'working_holiday':
    case 'backpacker':
      return 'visa'
    case 'retired':
    case 'between_jobs':
      return 'general'
  }
}

export function routeSectionTitle(situation: RenterSituation): string {
  switch (situation) {
    case 'student':
      return 'Study & funding'
    case 'working':
      return 'Employment & income'
    case 'working_holiday':
    case 'backpacker':
      return 'Visa & funding'
    case 'retired':
      return 'Income — super or pension'
    case 'between_jobs':
      return 'Income — savings or support'
  }
}

export function routeSectionNumber(): string {
  return '03'
}

/** §01 Personal — design fields only (budget/living prefs are optional §06). */
export function isPersonalDetailsComplete(profile: StudentProfileRow): boolean {
  return Boolean(
    profile.first_name?.trim() &&
      profile.last_name?.trim() &&
      profile.phone?.trim() &&
      profile.gender?.trim(),
  )
}

export function personalDetailsSummary(profile: StudentProfileRow): string {
  const parts = [
    [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim(),
    profile.date_of_birth ? formatAuDate(profile.date_of_birth) : null,
    profile.phone?.trim(),
    profile.nationality?.trim(),
  ].filter(Boolean)
  return parts.join(' · ') || 'Add your personal details'
}

export function emergencySummary(profile: StudentProfileRow): string {
  const parts = [
    profile.emergency_contact_name?.trim(),
    profile.emergency_contact_relationship?.trim(),
    profile.emergency_contact_phone?.trim(),
  ].filter(Boolean)
  return parts.join(' · ') || 'Add an emergency contact'
}

/** First incomplete required section — mirrors landlordProfileDefaultExpandedSection. */
export function renterProfileDefaultExpandedSection(args: {
  situation: RenterSituation | null
  personalComplete: boolean
  verificationComplete: boolean
  routeComplete: boolean
  showGuarantor: boolean
  guarantorComplete: boolean
  emergencyComplete: boolean
}): RenterProfileExpandKey | null {
  const {
    situation,
    personalComplete,
    verificationComplete,
    routeComplete,
    showGuarantor,
    guarantorComplete,
    emergencyComplete,
  } = args
  if (!situation) return 'situation'
  if (!personalComplete) return 'personal'
  if (!verificationComplete) return 'verification'
  if (!routeComplete || (showGuarantor && !guarantorComplete)) return 'route'
  if (!emergencyComplete) return 'emergency'
  return null
}

function formatAuDate(iso: string): string {
  try {
    const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso.slice(0, 10)
  }
}
