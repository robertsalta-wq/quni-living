import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  clearProfileHydrateInflight,
  deleteProfileHydrateInflight,
  fetchRoleAndProfileDeduped,
  type AuthProfile,
  type UserRole,
} from '../lib/authProfile'
import { clearOnboardingDismissed } from '../lib/onboardingChecklist'
import { authUserEmail } from '../lib/adminEmails'
import { isStaleOrInvalidJwtUserError } from '../lib/authErrors'
import { clearAuthSnapshot, readAuthSnapshot, writeAuthSnapshot } from '../lib/authSnapshotCache'
import { isAuthCallbackRoute } from '../lib/authCallbackRoute'
import { subscribeAuthReconcile } from '../lib/authReconcileBridge'
import { syncSentryUser } from '../lib/sentry'

export type AuthState = {
  user: User | null
  session: Session | null
  profile: AuthProfile | null
  role: UserRole
  /** True during first session bootstrap, or while resolving role/profile after sign-in. */
  loading: boolean
  /** Set on SIGNED_IN; cleared after one-shot post-auth onboarding redirect or exempt path. */
  awaitingSignInOnboardingRedirect: boolean
  clearAwaitingSignInOnboardingRedirect: () => void
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

function isSilentAuthEvent(event: string): boolean {
  return event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION'
}

/**
 * Auth state + Supabase subscription. Intended to be called once inside `AuthProvider`.
 */
export function useProvideAuth(): AuthState {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [role, setRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [awaitingSignInOnboardingRedirect, setAwaitingSignInOnboardingRedirect] = useState(false)
  const bootstrapDoneRef = useRef(false)
  const hydrateGenRef = useRef(0)

  const clearAwaitingSignInOnboardingRedirect = useCallback(() => {
    setAwaitingSignInOnboardingRedirect(false)
  }, [])

  const hydrateFromUser = useCallback(async (u: User | null) => {
    if (!u) {
      clearProfileHydrateInflight()
      setUser(null)
      setProfile(null)
      setRole(null)
      clearAuthSnapshot()
      syncSentryUser(null)
      return
    }
    // Session user from storage/JWT can omit `email`. Refresh via getUser() only when needed.
    let resolved = u
    if (!authUserEmail(u)) {
      const { data, error } = await supabase.auth.getUser()
      if (error && isStaleOrInvalidJwtUserError(error.message)) {
        deleteProfileHydrateInflight(u.id)
        clearOnboardingDismissed()
        clearAuthSnapshot()
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
        setProfile(null)
        setRole(null)
        syncSentryUser(null)
        return
      }
      resolved = data.user ?? u
    }
    setUser(resolved)
    syncSentryUser(resolved)
    const { role: r, profile: p } = await fetchRoleAndProfileDeduped(resolved)
    setRole(r)
    setProfile(p)
    writeAuthSnapshot({ userId: resolved.id, role: r, profile: p })
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured) return
    const {
      data: { session: s },
    } = await supabase.auth.getSession()
    await hydrateFromUser(s?.user ?? null)
  }, [hydrateFromUser])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return
    }

    const unsubscribeReconcile = subscribeAuthReconcile(({ userId, role: r, profile: p }) => {
      setRole(r)
      setProfile(p)
      writeAuthSnapshot({ userId, role: r, profile: p })
      bootstrapDoneRef.current = true
      setLoading(false)
    })

    let cancelled = false

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (cancelled) return
      const sessionUser = s?.user ?? null
      setSession(s ?? null)
      setUser(sessionUser)

      if (isAuthCallbackRoute()) {
        setLoading(Boolean(sessionUser))
        return
      }

      const cached = readAuthSnapshot(sessionUser?.id)
      if (cached) {
        // Paint header from snapshot but keep loading=true until hydrate settles so
        // listing pages do not fetch in parallel with redundant profile hydrates.
        setRole(cached.role)
        setProfile(cached.profile)
      }

      hydrateFromUser(sessionUser).finally(() => {
        if (!cancelled) {
          bootstrapDoneRef.current = true
          setLoading(false)
        }
      })
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'SIGNED_IN') {
        setAwaitingSignInOnboardingRedirect(true)
      }
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
        setAwaitingSignInOnboardingRedirect(false)
      }
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setRole(null)
        clearAuthSnapshot()
        syncSentryUser(null)
        return
      }
      setUser(s?.user ?? null)

      if (isAuthCallbackRoute()) {
        if (s?.user) setLoading(true)
        return
      }

      // Silent events: refresh profile without remounting protected routes (onboarding wizard, etc.).
      if (isSilentAuthEvent(event)) {
        void hydrateFromUser(s?.user ?? null)
        return
      }
      // Sign-in / password recovery: gate protected routes until role/profile resolve.
      const runId = ++hydrateGenRef.current
      setLoading(true)
      void hydrateFromUser(s?.user ?? null).finally(() => {
        if (runId === hydrateGenRef.current) {
          bootstrapDoneRef.current = true
          setLoading(false)
        }
      })
    })

    return () => {
      cancelled = true
      unsubscribeReconcile()
      subscription.unsubscribe()
    }
  }, [hydrateFromUser])

  const signOut = useCallback(async () => {
    // Leave protected routes (e.g. /booking/*) before clearing the session; otherwise
    // ProtectedRoute can redirect to student signup before a caller's navigate('/') runs.
    navigate('/', { replace: true })
    clearOnboardingDismissed()
    clearAuthSnapshot()
    clearProfileHydrateInflight()
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
    setRole(null)
  }, [navigate])

  return {
    user,
    session,
    profile,
    role,
    loading,
    awaitingSignInOnboardingRedirect,
    clearAwaitingSignInOnboardingRedirect,
    signOut,
    refreshProfile,
  }
}
