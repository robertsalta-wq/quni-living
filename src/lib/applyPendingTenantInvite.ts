import { getQuniTenantInviteBookingRedirect } from './quniTenantInvite'
import { peekPostAuthRedirect, setPostAuthRedirect } from './postAuthRedirect'

/**
 * After auth session is established, ensure a stored invite deep-link wins when no other return path was set.
 */
export function applyPendingTenantInvitePostAuthRedirect(): void {
  if (peekPostAuthRedirect()) return
  const dest = getQuniTenantInviteBookingRedirect()
  if (dest) setPostAuthRedirect(dest)
}
