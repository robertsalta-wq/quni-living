/**
 * App entry for university email checks.
 * The list lives in supabase/functions/_shared/uniEmailDomains.ts so send-uni-otp uses the same module.
 */
export {
  BASE_DOMAINS,
  UNI_DOMAIN_REQUEST_EMAIL,
  isAllowedUniEmailDomain,
  isFreeEmailProvider,
  isValidUniEmailForVerification,
  parseEmailDomain,
  uniEmailDomainErrorMessage,
  uniEmailRejection,
  uniEmailUnrecognisedDomainMessage,
} from '../../supabase/functions/_shared/uniEmailDomains.ts'

export type { UniEmailRejection, UniEmailRejectionReason } from '../../supabase/functions/_shared/uniEmailDomains.ts'
