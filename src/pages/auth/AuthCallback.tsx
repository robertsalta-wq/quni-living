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
      const oauthErr = params.get('error')
      const oauthDesc = params.get('error_description')
      if (oauthErr) {
        const msg = oauthDesc?.replace(/\+/g, ' ') ?? oauthErr
        navigate(
          `/login?error=oauth&detail=${encodeURIComponent(msg)}`,
          { replace: true },
        )
        return
      }

      const code = params.get('code')

      // Prefer explicit exchange; if `code` missing, session may already exist (e.g. retry).
      let sessionErr = null as { message: string } | null
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        sessionErr = error
      }
      if (cancelled) return

      if (sessionErr) {
        console.error(sessionErr)
        navigate(
          `/login?error=auth_failed&detail=${encodeURIComponent(sessionErr.message)}`,
          { replace: true },
        )
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (cancelled) return

      if (!session) {
        navigate(
          '/login?error=missing_code&detail=' +
            encodeURIComponent(
              'No session after sign-in. Check Supabase Redirect URLs include this page (e.g. https://your-app.vercel.app/auth/callback).',
            ),
          { replace: true },
        )
        return
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (cancelled) return

      if (userError || !user) {
        navigate(
          `/login?error=auth_failed&detail=${encodeURIComponent(userError?.message ?? 'No user after session')}`,
          { replace: true },
        )
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
      if (!cancelled) {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        navigate(`/login?error=auth_failed&detail=${encodeURIComponent(msg)}`, { replace: true })
      }
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
