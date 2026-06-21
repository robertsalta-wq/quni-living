/** Paths where incomplete users browse freely (no post-auth trap, no resume banner). */
export const ONBOARDING_RESUME_EXEMPT_PREFIXES = [
  '/onboarding',
  '/auth/callback',
  '/verify-email',
  '/login',
  '/signup',
  '/reset-password',
  '/forgot-password',
  '/admin',
] as const

export function isOnboardingResumeExempt(pathname: string): boolean {
  return ONBOARDING_RESUME_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}
