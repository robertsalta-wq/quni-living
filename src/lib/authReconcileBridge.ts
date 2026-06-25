import type { AuthProfile, UserRole } from './authProfile'

export type AuthReconcilePayload = {
  userId: string
  role: UserRole
  profile: AuthProfile | null
}

type Listener = (payload: AuthReconcilePayload) => void

let listener: Listener | null = null

export function subscribeAuthReconcile(fn: Listener): () => void {
  listener = fn
  return () => {
    if (listener === fn) listener = null
  }
}

/** Auth callback publishes role/profile once reconciliation finishes. */
export function publishAuthReconcile(payload: AuthReconcilePayload): void {
  listener?.(payload)
}
