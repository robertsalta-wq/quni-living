import { useCallback, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  fetchRoleAndProfile,
  type AuthProfile,
  type UserRole,
} from '../lib/authProfile'
import { clearOnboardingDismissed } from '../lib/onboardingChecklist'

export type AuthState = {
  user: User | null
  session: Session | null
  profile: AuthProfile | null
  role: UserRole
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

/**
 * Auth state + Supabase subscription. Intended to be called once inside `AuthProvider`.
 */
export function useProvideAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [role, setRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  const hydrateFromUser = useCallback(async (u: User | null) => {
    if (!u) {
      setUser(null)
      setProfile(null)
      setRole(null)
      return
    }
    // Session user from storage/JWT can omit `email`. Replace context `user` with getUser() result so
    // isAdminUser(user), Header, and onboarding checks see the same email Supabase verified.
    const { data } = await supabase.auth.getUser()
    const resolved = data.user ?? u
    setUser(resolved)
    const { role: r, profile: p } = await fetchRoleAndProfile(resolved)
    setRole(r)
    setProfile(p)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured) return
    const {
      data: { user: u },
    } = await supabase.auth.getUser()
    await hydrateFromUser(u)
  }, [hydrateFromUser])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return
    }

    let cancelled = false

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (cancelled) return
      setSession(s ?? null)
      setUser(s?.user ?? null)
      hydrateFromUser(s?.user ?? null).finally(() => {
        if (!cancelled) setLoading(false)
      })
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      setLoading(true)
      hydrateFromUser(s?.user ?? null).finally(() => setLoading(false))
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [hydrateFromUser])

  const signOut = useCallback(async () => {
    clearOnboardingDismissed()
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
    setRole(null)
  }, [])

  return {
    user,
    session,
    profile,
    role,
    loading,
    signOut,
    refreshProfile,
  }
}
