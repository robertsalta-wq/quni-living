/** Guest “save then sign in” sessionStorage helpers — no supabase import. */

export const PENDING_SAVE_PROPERTY_KEY = 'quni_save_property_id'

export function peekPendingSavePropertyId(): string | null {
  try {
    return sessionStorage.getItem(PENDING_SAVE_PROPERTY_KEY)
  } catch {
    return null
  }
}

export function setPendingSavePropertyId(propertyId: string): void {
  try {
    sessionStorage.setItem(PENDING_SAVE_PROPERTY_KEY, propertyId)
  } catch {
    /* ignore */
  }
}

export function clearPendingSavePropertyId(): void {
  try {
    sessionStorage.removeItem(PENDING_SAVE_PROPERTY_KEY)
  } catch {
    /* ignore */
  }
}
