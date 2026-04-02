import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { isAdminUser } from '../../lib/adminEmails'
import {
  fetchRoleAndProfile,
  getPostLoginRedirectDestination,
  needsOnboarding,
} from '../../lib/authProfile'
import { consumePostAuthRedirect } from '../../lib/postAuthRedirect'
import { applyPendingAccommodationRouteToStudentProfile } from '../../lib/applyPendingAccommodationRoute'
/**
 * OAuth redirect handler — PKCE `?code=` exchange.
 * Supabase Dashboard → Redirect URLs must include `${origin}/auth/callback`
 */
export default function AuthCallback() {
  const navigate = useNavigate()

  function isPkceVerifierMissingErrorMessage(message: string | null | undefined): boolean {
    if (!message) return false
    const m = message.toLowerCase()
    return m.includes('pkce') && m.includes('code verifier') && m.includes('not found')
  }

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

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (cancelled) return

      // Exchange can report an error even when a session is already valid (e.g. double submit).
      // Only send users to login when there is genuinely no session.
      if (!session) {
        if (sessionErr) {
          console.error(sessionErr)
          if (isPkceVerifierMissingErrorMessage(sessionErr.message)) {
            navigate('/login?error=pkce_verifier_missing', { replace: true })
            return
          }
          navigate(
            `/login?error=auth_failed&detail=${encodeURIComponent(sessionErr.message)}`,
            { replace: true },
          )
          return
        }
        navigate(
          '/login?error=missing_code&detail=' +
            encodeURIComponent(
              'No session after sign-in. Check Supabase Redirect URLs include this page (e.g. https://your-app.vercel.app/auth/callback).',
            ),
          { replace: true },
        )
        return
      }

      if (sessionErr) {
        console.warn('Auth callback: exchange reported error but session exists; continuing', sessionErr)
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

      await applyPendingAccommodationRouteToStudentProfile(user.id, user.created_at)

      const { role, profile } = await fetchRoleAndProfile(user)
      if (cancelled) return

      if (role === 'admin' || isAdminUser(user)) {
        navigate('/admin', { replace: true })
        return
      }

      if (!role) {
        navigate('/onboarding', { replace: true })
        return
      }
      if (needsOnboarding(role, profile)) {
        navigate(role === 'student' ? '/onboarding/student' : '/onboarding/landlord', { replace: true })
        return
      }

      const returnTo = consumePostAuthRedirect()
      navigate(returnTo ?? getPostLoginRedirectDestination(user, role, profile), { replace: true })
    })().catch((e) => {
      console.error(e)
      if (!cancelled) {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        if (isPkceVerifierMissingErrorMessage(msg)) {
          navigate('/login?error=pkce_verifier_missing', { replace: true })
          return
        }
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
