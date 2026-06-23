import { useMemo } from 'react'
import { useAuthContext } from '../context/AuthContext'
import type { Database } from '../lib/database.types'
import { isRenterRole } from '../lib/authProfile'
import { isNonStudentAccommodationRoute } from '../lib/studentOnboarding'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

export type RenterSearchPersona = 'guest' | 'student' | 'professional'

export const RENTER_SEARCH_LOCATION_PLACEHOLDER: Record<RenterSearchPersona, string> = {
  guest: 'Suburb or university…',
  student: 'Suburb or university…',
  professional: 'Suburb or area near work…',
}

export const RENTER_SEARCH_LISTINGS_PLACEHOLDER: Record<RenterSearchPersona, string> = {
  guest: 'Suburb or keyword…',
  student: 'Suburb or keyword…',
  professional: 'Suburb or area…',
}

export function renterSearchPersonaFromRoute(
  role: string | null,
  accommodationVerificationRoute: string | null | undefined,
): RenterSearchPersona {
  if (!isRenterRole(role)) return 'guest'
  if (isNonStudentAccommodationRoute(accommodationVerificationRoute)) return 'professional'
  return 'student'
}

/**
 * R1 search persona: guests and students see university/campus filters; logged-in
 * `non_student` accommodation route does not.
 */
export function useRenterSearchPersona() {
  const { role, profile, loading } = useAuthContext()

  const accommodationRoute = useMemo(() => {
    if (!isRenterRole(role) || !profile || !('accommodation_verification_route' in profile)) {
      return null
    }
    return (profile as StudentRow).accommodation_verification_route
  }, [role, profile])

  const persona = useMemo(
    () => renterSearchPersonaFromRoute(role, accommodationRoute),
    [role, accommodationRoute],
  )

  const isProfessionalRenter = persona === 'professional'
  const showUniversityCampusFilters = !isProfessionalRenter

  return {
    persona,
    isProfessionalRenter,
    showUniversityCampusFilters,
    locationPlaceholder: RENTER_SEARCH_LOCATION_PLACEHOLDER[persona],
    listingsSearchPlaceholder: RENTER_SEARCH_LISTINGS_PLACEHOLDER[persona],
    loading,
  }
}
