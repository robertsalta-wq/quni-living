const KEY = 'quni_selected_role'

export type QuniSignupRole = 'student' | 'landlord'

export function setQuniSelectedRole(role: QuniSignupRole): void {
  try {
    localStorage.setItem(KEY, role)
  } catch {
    /* ignore quota / private mode */
  }
}

/** Value chosen on the signup screen before OAuth or email signup. */
export function getQuniSelectedRole(): QuniSignupRole | null {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'student' || v === 'landlord') return v
    return null
  } catch {
    return null
  }
}

export function clearQuniSelectedRole(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
