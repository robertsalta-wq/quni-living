import { useAdminRedesignFlag } from '../../components/admin/useAdminRedesignFlag'
import AdminOverview from './AdminOverview'
import LivingConsole from './LivingConsole'

/**
 * Index route for `/admin`.
 *
 * Renders the new Living Console when the redesign flag is on, falls back to
 * the legacy AdminOverview otherwise. PR 7 will delete this file along with
 * `useAdminRedesignFlag` and AdminOverview.
 */
export default function LivingConsoleGate() {
  const redesignEnabled = useAdminRedesignFlag()
  return redesignEnabled ? <LivingConsole /> : <AdminOverview />
}
