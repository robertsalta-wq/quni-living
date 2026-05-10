import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'
import { Icon } from './Icon'
import {
  ADMIN_HOME_ITEM,
  ADMIN_NAV_ZONES,
  adminZoneOfPath,
  type AdminZoneId,
} from './nav'

const SIDEBAR_WIDTH = 224

/**
 * Zone-grouped admin sidebar.
 *
 * - Always-visible "The Living Console" home item above the six zones.
 * - Only one zone expanded at a time; the expanded zone is derived from the
 *   current path so the right group opens on every navigation.
 * - Clicking a collapsed zone header opens it AND navigates to its first
 *   sub-item (HANDOFF.md §1).
 * - Sub-items are disabled when `comingSoon` is set (Tenancies in PR 1).
 */
export function AdminSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuthContext()
  const activeZone = adminZoneOfPath(location.pathname)
  const [openZone, setOpenZone] = useState<AdminZoneId | null>(activeZone)

  useEffect(() => {
    if (activeZone) setOpenZone(activeZone)
  }, [activeZone])

  const isHome = location.pathname === '/admin' || location.pathname === '/admin/'

  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    (user?.user_metadata?.name as string | undefined)?.trim() ||
    user?.email?.split('@')[0] ||
    'Admin'

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'A'

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  function handleZoneHeaderClick(zoneId: AdminZoneId) {
    if (openZone === zoneId) {
      setOpenZone(null)
      return
    }
    setOpenZone(zoneId)
    const zone = ADMIN_NAV_ZONES.find((z) => z.id === zoneId)
    const first = zone?.items.find((item) => !item.comingSoon) ?? zone?.items[0]
    if (first && !first.comingSoon) {
      navigate(first.to)
    }
  }

  return (
    <aside
      className="fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-admin-cream-border bg-admin-cream font-admin-sans"
      style={{ width: SIDEBAR_WIDTH }}
    >
      <div className="border-b border-admin-cream-border px-[18px] pt-5 pb-3.5">
        <Link to="/admin" className="flex items-baseline gap-2">
          <span className="font-admin-display text-[26px] font-bold leading-none tracking-tight text-admin-ink">
            Quni
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-ink-4">
            Admin
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-1.5 pt-2.5">
        <Link
          to={ADMIN_HOME_ITEM.to}
          className={
            isHome
              ? 'flex items-center gap-2.5 rounded-admin-md bg-admin-coral-tint-15 px-2.5 py-2 text-[13px] font-semibold text-admin-coral-active transition-colors'
              : 'flex items-center gap-2.5 rounded-admin-md px-2.5 py-2 text-[13px] font-semibold text-admin-ink-2 transition-colors hover:bg-admin-coral-tint'
          }
        >
          <Icon
            name={ADMIN_HOME_ITEM.icon}
            size={15}
            className={isHome ? 'text-admin-coral-active' : 'text-admin-ink-3'}
          />
          <span>{ADMIN_HOME_ITEM.label}</span>
        </Link>

        <div className="mx-1 my-2 border-t border-admin-cream-border" />

        {ADMIN_NAV_ZONES.map((zone) => {
          const isOpen = openZone === zone.id
          const containsActive = zone.id === activeZone
          return (
            <div key={zone.id} className="mb-1">
              <button
                type="button"
                onClick={() => handleZoneHeaderClick(zone.id)}
                className={
                  'flex w-full items-center gap-1.5 rounded-admin-md px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors hover:bg-admin-coral-tint ' +
                  (containsActive ? 'text-admin-ink-2' : 'text-admin-ink-5')
                }
              >
                <Icon
                  name="chevron-down"
                  size={11}
                  className={
                    'transition-transform ' +
                    (isOpen ? 'rotate-0' : '-rotate-90') +
                    ' ' +
                    (containsActive ? 'text-admin-ink-3' : 'text-admin-ink-5')
                  }
                />
                <Icon
                  name={zone.icon}
                  size={12}
                  className={containsActive ? 'text-admin-ink-3' : 'text-admin-ink-5'}
                />
                <span>{zone.label}</span>
              </button>

              {isOpen ? (
                <div className="mt-0.5 space-y-0.5">
                  {zone.items.map((item) => {
                    const isItemActive =
                      location.pathname === item.to ||
                      location.pathname.startsWith(item.to + '/')
                    if (item.comingSoon) {
                      return (
                        <span
                          key={item.id}
                          aria-disabled="true"
                          title="Coming soon"
                          className="flex items-center gap-2.5 rounded-admin-md py-1.5 pl-[26px] pr-2 text-[13px] font-medium text-admin-ink-5 opacity-70"
                        >
                          <Icon name={item.icon} size={14} className="text-admin-ink-5" />
                          <span>{item.label}</span>
                          <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.04em] text-admin-ink-5">
                            Soon
                          </span>
                        </span>
                      )
                    }
                    return (
                      <Link
                        key={item.id}
                        to={item.to}
                        className={
                          isItemActive
                            ? 'flex items-center gap-2.5 rounded-admin-md bg-admin-coral-tint-15 py-1.5 pl-[26px] pr-2 text-[13px] font-semibold text-admin-coral-active transition-colors'
                            : 'flex items-center gap-2.5 rounded-admin-md py-1.5 pl-[26px] pr-2 text-[13px] font-medium text-admin-ink-3 transition-colors hover:bg-admin-coral-tint'
                        }
                      >
                        <Icon
                          name={item.icon}
                          size={14}
                          className={isItemActive ? 'text-admin-coral-active' : 'text-admin-ink-4'}
                        />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </nav>

      <div className="border-t border-admin-cream-border bg-white/40 p-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-[30px] w-[30px] place-items-center rounded-full bg-admin-navy text-[12px] font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-admin-ink">{displayName}</p>
            <p className="truncate text-[11px] text-admin-ink-4">{user?.email ?? ''}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            title="Sign out"
            className="rounded-md p-1 text-admin-ink-4 transition-colors hover:bg-admin-coral-tint hover:text-admin-coral-active"
          >
            <Icon name="log-out" size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}

export const ADMIN_SIDEBAR_WIDTH = SIDEBAR_WIDTH
