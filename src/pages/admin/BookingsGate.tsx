import { useAdminRedesignFlag } from '../../components/admin/useAdminRedesignFlag'
import AdminBookings from './AdminBookings'
import BookingsPage from './BookingsPage'

/**
 * `/admin/bookings` index gate.
 *
 * Renders the new {@link BookingsPage} (table + toolbar + drawer) when the
 * `?redesign=1` flag is enabled, otherwise falls back to the legacy
 * {@link AdminBookings} screen. This mirrors `LivingConsoleGate` so each
 * redesigned route can be reviewed independently and the legacy screen stays
 * intact until the full redesign ships.
 */
export default function BookingsGate() {
  const redesignEnabled = useAdminRedesignFlag()
  return redesignEnabled ? <BookingsPage /> : <AdminBookings />
}
