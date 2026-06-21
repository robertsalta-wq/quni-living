import { isOnboardingResumeExempt } from '../lib/onboardingResume'

/** @deprecated Use `isOnboardingResumeExempt` from `../lib/onboardingResume`. */
export function isPostAuthOnboardingGuardExempt(pathname: string): boolean {
  return isOnboardingResumeExempt(pathname)
}
