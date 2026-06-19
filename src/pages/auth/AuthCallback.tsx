import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import {
  fetchRoleAndProfile,
  getPostLoginRedirectDestination,
  needsOnboarding,
} from '../../lib/authProfile'
import { consumePostAuthRedirect } from '../../lib/postAuthRedirect'
import { applyPendingAccommodationRouteToStudentProfile } from '../../lib/applyPendingAccommodationRoute'
import { applyPendingSignupRole } from '../../lib/applyPendingSignupRole'
import { ensureAuthUserProfileRow } from '../../lib/ensureAuthUserProfileRow'
import { isStaleOrInvalidJwtUserError } from '../../lib/authErrors'
import { userNeedsEmailAddressVerification } from '../../lib/authEmailVerification'
import {
  parseSignupTokenHashFromSearch,
  stripSensitiveAuthCallbackQueryParams,
} from '../../lib/authCallbackParams'

/**
 * Auth redirect handler (email confirm, magic link, OAuth).
 *
 * Completion order (Outlook-safe signup uses step 1):
 * 1. `?token_hash=&type=signup` → verifyOtp (client-side; mail scanners do not run JS)
 * 2. `?code=` → exchangeCodeForSession (PKCE when verifier exists in this browser)
 * 3. `#access_token=` → implicit flow via detectSessionInUrl on getSession()
 *
 * Deploy the handler before switching the hosted email template to token_hash links.
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

    async function finishWithSession(sessionUser: User) {
      await ensureAuthUserProfileRow(sessionUser)
      await applyPendingAccommodationRouteToStudentProfile(
        sessionUser.id,
        sessionUser.created_at,
        sessionUser.user_metadata?.accommodation_verification_route,
      )
      await applyPendingSignupRole(sessionUser)

      const { role, profile } = await fetchRoleAndProfile(sessionUser)
      if (cancelled) return

      if (userNeedsEmailAddressVerification(sessionUser)) {
        const onboardingPath =
          role === 'student'
            ? '/onboarding/student'
            : role === 'landlord'
              ? '/onboarding/landlord'
              : '/onboarding'
        navigate('/verify-email', {
          replace: true,
          state: { from: { pathname: onboardingPath } },
        })
        return
      }

      if (role === 'admin') {
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
      navigate(returnTo ?? getPostLoginRedirectDestination(sessionUser, role, profile), { replace: true })
    }

    ;(async () => {
      const params = new URLSearchParams(window.location.search)
      const oauthErr = params.get('error')
      const oauthDesc = params.get('error_description')
      const code = params.get('code')
      const tokenParams = parseSignupTokenHashFromSearch(window.location.search)

      let tokenHashErr: { message: string } | null = null
      let sessionErr: { message: string } | null = null

      if (tokenParams) {
        // Drop any unrelated session so a failed verify cannot continue as another user.
        await supabase.auth.signOut()
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenParams.token_hash,
          type: 'signup',
        })
        if (error) {
          tokenHashErr = error
        } else {
          stripSensitiveAuthCallbackQueryParams()
        }
      }

      if (cancelled) return

      if (!tokenHashErr && code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        sessionErr = error
      }

      if (cancelled) return

      await supabase.auth.getSession()
      if (cancelled) return

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (cancelled) return

      if (session) {
        if (tokenHashErr) {
          await supabase.auth.signOut()
          navigate(
            `/login?error=oauth&detail=${encodeURIComponent(
              tokenHashErr.message ||
                'That confirmation link could not be used. Request a new confirmation email and open only the newest link.',
            )}`,
            { replace: true },
          )
          return
        }

        if (oauthErr || sessionErr) {
          console.warn('Auth callback: continuing with session despite URL error and/or exchange error', {
            oauthErr,
            oauthDesc,
            sessionErr,
          })
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()
        if (cancelled) return

        if (userError && isStaleOrInvalidJwtUserError(userError.message)) {
          await supabase.auth.signOut()
          navigate('/login?error=invalid_session', { replace: true })
          return
        }

        if (userError || !user) {
          navigate(
            `/login?error=auth_failed&detail=${encodeURIComponent(userError?.message ?? 'No user after session')}`,
            { replace: true },
          )
          return
        }

        await finishWithSession(user)
        return
      }

      if (tokenHashErr) {
        navigate(
          `/login?error=oauth&detail=${encodeURIComponent(
            tokenHashErr.message ||
              'That confirmation link could not be used. Request a new confirmation email and open only the newest link.',
          )}`,
          { replace: true },
        )
        return
      }

      if (oauthErr) {
        const msg = oauthDesc?.replace(/\+/g, ' ') ?? oauthErr
        navigate(`/login?error=oauth&detail=${encodeURIComponent(msg)}`, { replace: true })
        return
      }

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
            'No session after sign-in. If you opened a confirmation link, it may have expired — use “Resend confirmation email” on the log-in page and open only the newest link.',
          ),
        { replace: true },
      )
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
