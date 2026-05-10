import { useAdminRedesignFlag } from '../../components/admin/useAdminRedesignFlag'
import AdminPricing from './AdminPricing'
import PricingPage from './PricingPage'

/**
 * `/admin/pricing` index gate.
 *
 * Renders the new {@link PricingPage} (eyebrow + tabs + live preview + diff
 * change log) when `?redesign=1` is enabled, otherwise falls back to the
 * legacy {@link AdminPricing} screen. The data layer is shared — both
 * variants call into `lib/adminPricingSupabase` against the same
 * `pricing_config`, `volume_discount_tiers`, and `pricing_change_log` tables.
 */
export default function PricingGate() {
  const redesignEnabled = useAdminRedesignFlag()
  return redesignEnabled ? <PricingPage /> : <AdminPricing />
}
