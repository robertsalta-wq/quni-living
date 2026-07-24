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

/** Dashboards that already surface profile readiness — suppress the global resume nudge. */
export const ONBOARDING_RESUME_DASHBOARD_PREFIXES = [
  '/student-dashboard',
  '/landlord/dashboard',
  '/student-profile',
] as const

export function isOnboardingResumeExempt(pathname: string): boolean {
  return ONBOARDING_RESUME_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function isOnboardingResumeDashboardPath(pathname: string): boolean {
  return ONBOARDING_RESUME_DASHBOARD_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}
