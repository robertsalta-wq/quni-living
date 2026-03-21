import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import {
  fetchRoleAndProfile,
  getDashboardPath,
  needsOnboarding,
} from '../../lib/authProfile'

/**
 * OAuth redirect handler — PKCE `?code=` exchange.
 * Supabase Dashboard → Redirect URLs must include `${origin}/auth/callback`
 */
export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isSupabaseConfigured) {
      navigate('/login?error=config', { replace: true })
      return
    }

    let cancelled = false

    ;(async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')

      if (!code) {
        navigate('/login?error=auth_failed', { replace: true })
        return
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (cancelled) return

      if (error) {
        console.error(error)
        navigate('/login?error=auth_failed', { replace: true })
        return
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (cancelled) return

      if (userError || !user) {
        navigate('/login?error=auth_failed', { replace: true })
        return
      }

      const { role, profile } = await fetchRoleAndProfile(user)
      if (cancelled) return

      // Google OAuth: DB trigger may create a student row before role is chosen — require explicit role in metadata
      const metaRole = user.user_metadata?.role
      if (!metaRole || needsOnboarding(role, profile)) {
        navigate('/onboarding', { replace: true })
        return
      }

      navigate(getDashboardPath(role), { replace: true })
    })().catch((e) => {
      console.error(e)
      if (!cancelled) navigate('/login?error=auth_failed', { replace: true })
    })

    return () => {
      cancelled = true
    }
  }, [navigate])

  return (
    <div className="min-h-[40vh] flex items-center justify-center px-6">
      <p className="text-gray-600 text-sm">Signing you in…</p>
    </div>
  )
}
