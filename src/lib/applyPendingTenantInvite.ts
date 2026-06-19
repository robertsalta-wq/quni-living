import { getQuniTenantInviteBookingRedirect } from './quniTenantInvite'
import { peekPostAuthRedirect, setPostAuthRedirect } from './postAuthRedirect'
import { inviteTokenFromBookingRedirect } from './tenantInviteFunnel'

/**
 * After auth session is established, ensure a stored invite deep-link wins when no other return path was set.
 * Also upgrades a bare booking redirect (from listing detail) to include the invite token when persisted.
 */
export function applyPendingTenantInvitePostAuthRedirect(): void {
  const inviteDest = getQuniTenantInviteBookingRedirect()
  if (!inviteDest) return

  const stored = peekPostAuthRedirect()
  if (!stored) {
    setPostAuthRedirect(inviteDest)
    return
  }

  if (!inviteTokenFromBookingRedirect(stored) && inviteTokenFromBookingRedirect(inviteDest)) {
    const base = (p: string) => p.split('?')[0] ?? p
    if (base(stored) === base(inviteDest)) setPostAuthRedirect(inviteDest)
  }
}
