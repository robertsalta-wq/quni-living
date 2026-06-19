import type { AuthProfile, UserRole } from './authProfile'

const STORAGE_KEY = 'quni-auth-snapshot:v1'

export type AuthSnapshot = {
  userId: string
  role: UserRole
  profile: AuthProfile | null
}

function canUseStorage(): boolean {
  return typeof sessionStorage !== 'undefined'
}

export function readAuthSnapshot(userId: string | undefined): AuthSnapshot | null {
  if (!userId || !canUseStorage()) return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthSnapshot
    if (parsed.userId !== userId) return null
    if (parsed.role !== 'student' && parsed.role !== 'landlord' && parsed.role !== 'admin' && parsed.role !== null) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writeAuthSnapshot(snapshot: AuthSnapshot): void {
  if (!canUseStorage()) return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // Quota or private browsing — ignore.
  }
}

export function clearAuthSnapshot(): void {
  if (!canUseStorage()) return
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
