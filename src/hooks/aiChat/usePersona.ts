import { useMemo } from 'react'
import { useAuthContext } from '../../context/AuthContext'
import type { PersonaKey } from '../../lib/aiChat/chatTypes'

type NameFields = {
  first_name?: string | null
  full_name?: string | null
}

function firstNameFromFullName(fullName: string | null | undefined): string {
  const t = (fullName ?? '').trim().replace(/\s+/g, ' ')
  if (!t) return ''
  const [first] = t.split(' ')
  return first?.trim() ?? ''
}

export function usePersona(): {
  personaKey: PersonaKey
  firstName: string | null
} {
  const { role, profile, user } = useAuthContext()

  return useMemo(() => {
    if (role === 'landlord') {
      const nf = profile as NameFields | null
      const first = (nf?.first_name?.trim() ?? '') || firstNameFromFullName(nf?.full_name)
      return { personaKey: 'landlord', firstName: first || null }
    }

    // Student role -> student_renter prompt.
    // Admins have no matching profile row in `fetchRoleAndProfile()`, so the
    // server persona will fall back to `visitor` (which requires Turnstile on the first message).
    if (role === 'student') {
      const nf = profile as NameFields | null
      const first = (nf?.first_name?.trim() ?? '') || firstNameFromFullName(nf?.full_name)
      // As a fallback, use auth metadata name/email prefix.
      const metaFirst =
        (typeof user?.user_metadata?.name === 'string' && user.user_metadata.name.trim().split(/\s+/)[0]) || ''
      return { personaKey: 'student_renter', firstName: first || metaFirst || null }
    }

    // Logged out (visitor).
    return { personaKey: 'visitor', firstName: null }
  }, [role, profile, user?.user_metadata?.name])
}

