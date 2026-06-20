/** Persist email + step across tab switch / remount for custom OTP flows (not auth secrets). */

export type VerificationOtpKind = 'uni' | 'work'

function storageKey(kind: VerificationOtpKind, userId: string): string {
  return `quni:${kind}OtpPending:v1:${userId}`
}

export function readVerificationOtpPendingEmail(
  kind: VerificationOtpKind,
  userId: string,
): string | null {
  try {
    const raw = sessionStorage.getItem(storageKey(kind, userId))
    if (!raw) return null
    const o = JSON.parse(raw) as { email?: unknown }
    if (!o || typeof o.email !== 'string') return null
    const e = o.email.trim().toLowerCase()
    return e || null
  } catch {
    return null
  }
}

export function writeVerificationOtpPending(
  kind: VerificationOtpKind,
  userId: string,
  emailNorm: string,
): void {
  try {
    sessionStorage.setItem(storageKey(kind, userId), JSON.stringify({ email: emailNorm }))
  } catch {
    /* quota / private mode */
  }
}

export function clearVerificationOtpPending(kind: VerificationOtpKind, userId: string): void {
  try {
    sessionStorage.removeItem(storageKey(kind, userId))
  } catch {
    /* ignore */
  }
}
