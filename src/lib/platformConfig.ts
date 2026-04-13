/**
 * Re-exports canonical implementation from `api/lib/platformConfig.ts` so the app
 * and Vercel serverless share one module; API routes must not value-import from `src/lib/`
 * (file tracing omits those paths — see generate-lease.ts vs generate-residential-tenancy).
 */
export type { PlatformConfigRow, BankDetailsForRta } from '../../api/lib/platformConfig.js'
export {
  PLATFORM_CONFIG_KEYS,
  fetchPlatformConfigRows,
  fetchPlatformConfigValueMap,
  fetchBankDetailsForRta,
  buildRtaRentPaymentMethodLine,
} from '../../api/lib/platformConfig.js'
