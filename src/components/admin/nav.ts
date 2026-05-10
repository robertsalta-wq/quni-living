import type { IconName } from './Icon'

/**
 * Admin sidebar IA — "The Living Console" redesign.
 *
 * Six zone groups + a permanent "The Living Console" home item above them.
 * Sub-items map to the EXISTING flat `/admin/*` routes during PR 1–5 of the
 * rollout; PR 6 will swap routes to nested `/admin/<zone>/<sub>` paths and
 * land redirects from the old flat URLs.
 *
 * Keep in sync with `docs/admin-redesign/HANDOFF.md` §1 (routes table) and
 * §5 (replace/keep/retire).
 */

export type AdminZoneId = 'marketplace' | 'tenancies' | 'supply' | 'money' | 'trust' | 'platform'

export interface AdminNavSubItem {
  id: string
  label: string
  icon: IconName
  /** Current flat URL (PR 1–5). Will become the zone-nested URL in PR 6. */
  to: string
  /**
   * True when the page doesn't exist yet (Tenancies sub-items per Decision B2
   * — Active tenancies will compute from confirmed bookings in a later PR;
   * Condition reports stays a stub until a `condition_reports` table exists).
   */
  comingSoon?: boolean
}

export interface AdminNavZone {
  id: AdminZoneId
  label: string
  icon: IconName
  items: AdminNavSubItem[]
}

export const ADMIN_HOME_ITEM = {
  id: 'home' as const,
  label: 'The Living Console',
  icon: 'layout-dashboard' as const satisfies IconName,
  to: '/admin',
}

export const ADMIN_NAV_ZONES: readonly AdminNavZone[] = [
  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: 'home',
    items: [
      { id: 'bookings', label: 'Bookings', icon: 'calendar-check', to: '/admin/bookings' },
      { id: 'tier-events', label: 'Tier events', icon: 'trending-up', to: '/admin/service-tier-events' },
      { id: 'enquiries', label: 'Enquiries', icon: 'message-square', to: '/admin/enquiries' },
      { id: 'properties', label: 'Properties', icon: 'home', to: '/admin/properties' },
      // Decision H1: students live under Marketplace.
      { id: 'students', label: 'Students', icon: 'graduation-cap', to: '/admin/students' },
    ],
  },
  {
    id: 'tenancies',
    label: 'Tenancies',
    icon: 'calendar-check',
    items: [
      // Decision B2: page lands in a later PR (computed from confirmed bookings).
      { id: 'active-tenancies', label: 'Active tenancies', icon: 'calendar-check', to: '/admin/tenancies/active', comingSoon: true },
      { id: 'condition-reports', label: 'Condition reports', icon: 'file-text', to: '/admin/tenancies/condition-reports', comingSoon: true },
    ],
  },
  {
    id: 'supply',
    label: 'Supply',
    icon: 'building-2',
    items: [
      { id: 'landlords', label: 'Landlords', icon: 'users', to: '/admin/landlords' },
      { id: 'leads', label: 'Landlord leads', icon: 'user-plus', to: '/admin/landlord-leads' },
    ],
  },
  {
    id: 'money',
    label: 'Money',
    icon: 'dollar-sign',
    items: [
      { id: 'payments', label: 'Payments', icon: 'credit-card', to: '/admin/payments' },
      { id: 'pricing', label: 'Pricing', icon: 'tags', to: '/admin/pricing' },
    ],
  },
  {
    id: 'trust',
    label: 'Trust & compliance',
    icon: 'shield-check',
    items: [
      { id: 'trust-checklist', label: 'Trust checklist', icon: 'shield-check', to: '/admin/trust-checklist' },
      { id: 'state-workflows', label: 'State workflows', icon: 'workflow', to: '/admin/state-workflows' },
      { id: 'documents', label: 'Documents', icon: 'file-text', to: '/admin/documents' },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    icon: 'package',
    items: [
      { id: 'apps', label: 'Apps', icon: 'app-window', to: '/admin/apps' },
      { id: 'domains', label: 'Domains', icon: 'globe', to: '/admin/domains' },
      { id: 'kb', label: 'Knowledge base', icon: 'book-open', to: '/admin/knowledge-base' },
      { id: 'qase', label: 'Support (Qase)', icon: 'life-buoy', to: '/admin/qase' },
      { id: 'business-settings', label: 'Business settings', icon: 'sliders', to: '/admin/settings' },
    ],
  },
]

/** Derive the zone that owns a given pathname, or null for the home / unknown routes. */
export function adminZoneOfPath(pathname: string): AdminZoneId | null {
  for (const zone of ADMIN_NAV_ZONES) {
    for (const item of zone.items) {
      // Prefix match so /admin/qase/settings resolves to the qase item's zone.
      if (pathname === item.to || pathname.startsWith(item.to + '/')) {
        return zone.id
      }
    }
  }
  return null
}

/** Find the sub-item that owns a given pathname, or null. */
export function adminItemOfPath(pathname: string): AdminNavSubItem | null {
  for (const zone of ADMIN_NAV_ZONES) {
    for (const item of zone.items) {
      if (pathname === item.to || pathname.startsWith(item.to + '/')) {
        return item
      }
    }
  }
  return null
}

export interface AdminBreadcrumb {
  zone: string
  page: string
}

/** Build the top-bar breadcrumb from the current path. */
export function adminBreadcrumb(pathname: string): AdminBreadcrumb {
  if (pathname === '/admin' || pathname === '/admin/') {
    return { zone: 'Admin', page: ADMIN_HOME_ITEM.label }
  }
  const item = adminItemOfPath(pathname)
  const zoneId = adminZoneOfPath(pathname)
  const zone = ADMIN_NAV_ZONES.find((z) => z.id === zoneId)
  if (item && zone) return { zone: zone.label, page: item.label }
  return { zone: 'Admin', page: 'Page' }
}
