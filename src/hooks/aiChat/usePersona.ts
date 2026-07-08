import { useMemo } from 'react'
import { useAuthContext } from '../../context/AuthContext'
import { isRenterRole } from '../../lib/authProfile'
import type { PersonaKey } from '../../lib/aiChat/chatTypes'
import { landlordDisplayName, studentDisplayName } from '../../lib/nameResolution'

export function usePersona(): {
  personaKey: PersonaKey
  firstName: string | null
} {
  const { role, profile, user } = useAuthContext()

  return useMemo(() => {
    if (role === 'landlord') {
      const display = landlordDisplayName((profile as Record<string, unknown> | null) ?? {}, '')
      const first = display.trim().split(/\s+/)[0] || ''
      return { personaKey: 'landlord', firstName: first || null }
    }

    // Student role -> student_renter prompt.
    // Admins have no matching profile row in `fetchRoleAndProfile()`, so the
    // server persona will fall back to `visitor` (which requires Turnstile on the first message).
    if (isRenterRole(role)) {
      const display = studentDisplayName((profile as Record<string, unknown> | null) ?? {}, '')
      const first = display.trim().split(/\s+/)[0] || ''
      // As a fallback, use auth metadata name/email prefix.
      const metaFirst =
        (typeof user?.user_metadata?.name === 'string' && user.user_metadata.name.trim().split(/\s+/)[0]) || ''
      return { personaKey: 'student_renter', firstName: first || metaFirst || null }
    }

    // Logged out (visitor).
    return { personaKey: 'visitor', firstName: null }
  }, [role, profile, user?.user_metadata?.name])
}
