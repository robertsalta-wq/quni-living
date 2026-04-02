const KEY = 'quni_accommodation_verification_route'

/** Chosen on signup for tenant-side accounts; written to student_profiles at account creation. */
export type QuniAccommodationVerificationRoute = 'student' | 'non_student'

export function setQuniAccommodationVerificationRoute(route: QuniAccommodationVerificationRoute): void {
  try {
    localStorage.setItem(KEY, route)
  } catch {
    /* ignore */
  }
}

export function getQuniAccommodationVerificationRoute(): QuniAccommodationVerificationRoute | null {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'student' || v === 'non_student') return v
    return null
  } catch {
    return null
  }
}

export function clearQuniAccommodationVerificationRoute(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
