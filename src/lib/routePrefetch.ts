import { routeImports } from '../lazyPages'

type RouteImporter = () => Promise<unknown>

/** First path segment → admin child page chunk (under `/admin/*`). */
const ADMIN_SEGMENT_IMPORTERS: Record<string, RouteImporter> = {
  '': routeImports.livingConsole,
  _kitchen: routeImports.adminKitchen,
  bookings: routeImports.bookingsPage,
  'service-tier-events': routeImports.adminServiceTierEvents,
  enquiries: routeImports.adminEnquiries,
  'landlord-leads': routeImports.adminLandlordLeads,
  properties: routeImports.adminProperties,
  students: routeImports.adminStudents,
  landlords: routeImports.adminLandlords,
  apps: routeImports.adminApps,
  payments: routeImports.adminPayments,
  settings: routeImports.adminSettings,
  team: routeImports.adminTeam,
  pricing: routeImports.pricingPage,
  'knowledge-base': routeImports.knowledgeBase,
  documents: routeImports.documentsPage,
  'agreement-previews': routeImports.agreementPreviewsPage,
  domains: routeImports.domainsPage,
  'trust-checklist': routeImports.trustChecklist,
  'state-workflows': routeImports.adminStateWorkflows,
  qase: routeImports.qaseTicketList,
}

const EXACT_PATH_IMPORTERS: Record<string, RouteImporter[]> = {
  '/': [routeImports.home],
  '/listings': [routeImports.listings],
  '/login': [routeImports.login],
  '/rent-near-campus': [routeImports.rentNearCampus],
  '/international': [routeImports.internationalStudents],
  '/student-accommodation': [routeImports.studentAccommodationIndex],
  '/terms': [routeImports.terms],
  '/privacy': [routeImports.privacy],
  '/non-discrimination': [routeImports.nonDiscrimination],
  '/landlord-service-agreement': [routeImports.landlordServiceAgreement],
  '/about': [routeImports.about],
  '/how-it-works': [routeImports.howItWorks],
  '/refunds': [routeImports.refunds],
  '/pricing': [routeImports.pricing],
  '/contact': [routeImports.contact],
  '/faq': [routeImports.faq],
  '/verification': [routeImports.verification],
  '/services': [routeImports.services],
  '/services/student-accommodation': [routeImports.serviceStudentAccommodation],
  '/services/property-management': [routeImports.servicePropertyManagement],
  '/services/landlord-partnerships': [routeImports.serviceLandlordPartnerships],
  '/services/fully-furnished': [routeImports.serviceFullyFurnished],
  '/landlords/ai': [routeImports.landlordAIFeaturePage],
  '/auth/callback': [routeImports.authCallback],
  '/forgot-password': [routeImports.forgotPassword],
  '/reset-password': [routeImports.resetPassword],
  '/verify-email': [routeImports.verifyEmail],
  '/signup': [routeImports.signup],
  '/student-signup': [routeImports.studentSignup],
  '/landlord-signup': [routeImports.landlordSignup],
  '/messages': [routeImports.messagesPage],
  '/onboarding': [routeImports.onboarding],
  '/onboarding/student': [routeImports.studentOnboarding],
  '/onboarding/landlord': [routeImports.landlordDashboard],
  '/student-dashboard': [routeImports.studentDashboard],
  '/student-profile': [routeImports.studentProfile],
  '/student/profile': [routeImports.studentProfile],
  '/landlord/dashboard': [routeImports.landlordDashboard],
  '/landlord-profile': [routeImports.landlordDashboard],
  '/landlord/profile': [routeImports.landlordDashboard],
  '/landlord/property/new': [
    routeImports.landlordListingEditEntry,
    routeImports.landlordListingEditHubPage,
    routeImports.landlordPropertyFormPage,
  ],
  '/sample-agreements': [routeImports.sampleAgreementsPage],
}

function normalizePathname(pathname: string): string {
  const base = pathname.split('?')[0]?.split('#')[0] ?? '/'
  if (base.length > 1 && base.endsWith('/')) return base.slice(0, -1)
  return base
}

function prefetch(importers: RouteImporter[]): void {
  for (const load of importers) {
    void load()
  }
}

/**
 * Start downloading lazy route chunks immediately (e.g. before auth gates mount children).
 * Safe to call multiple times; dynamic import() is deduped by the module loader.
 */
export function prefetchRouteChunks(pathname: string): void {
  const path = normalizePathname(pathname)

  if (path.startsWith('/admin')) {
    const importers: RouteImporter[] = [routeImports.adminLayout]
    const rest = path.slice('/admin'.length).replace(/^\//, '')
    const [segment, second] = rest.split('/')
    if (!segment) {
      importers.push(routeImports.livingConsole)
    } else if (segment === 'qase') {
      importers.push(second === 'settings' ? routeImports.qaseSettings : routeImports.qaseTicketList)
      if (second && second !== 'settings') importers.push(routeImports.qaseTicketDetail)
    } else {
      const child = ADMIN_SEGMENT_IMPORTERS[segment]
      if (child) importers.push(child)
    }
    prefetch(importers)
    return
  }

  if (path.startsWith('/listings/') || path.startsWith('/properties/')) {
    prefetch([routeImports.propertyDetail])
    return
  }

  if (path.startsWith('/student-accommodation/')) {
    const parts = path.slice('/student-accommodation/'.length).split('/')
    if (parts.length >= 2) prefetch([routeImports.campusAccommodation])
    else prefetch([routeImports.universityAccommodation])
    return
  }

  if (path.startsWith('/invite/')) {
    prefetch([routeImports.inviteTenantPage])
    return
  }

  if (path.startsWith('/messages/')) {
    prefetch([routeImports.messagesPage])
    return
  }

  if (path.startsWith('/landlord/property/edit/') || path.startsWith('/landlord/property/new')) {
    prefetch([
      routeImports.landlordListingEditEntry,
      routeImports.landlordListingEditHubPage,
      routeImports.landlordPropertyFormPage,
    ])
    return
  }

  if (path.startsWith('/landlord/bookings/') && path.endsWith('/review')) {
    prefetch([routeImports.landlordBookingReviewPage])
    return
  }

  if (path.startsWith('/booking/')) {
    prefetch([routeImports.booking])
    return
  }

  const exact = EXACT_PATH_IMPORTERS[path]
  if (exact) {
    prefetch(exact)
  }
}

/** Warm every bottom-nav destination for landlord/renter mobile chrome. */
export function prefetchDashboardMobileTabChunks(role: 'landlord' | 'renter'): void {
  if (role === 'landlord') {
    prefetchRouteChunks('/landlord/dashboard')
    prefetchRouteChunks('/messages')
    return
  }
  prefetchRouteChunks('/student-dashboard')
  prefetchRouteChunks('/messages')
  prefetchRouteChunks('/student-profile')
}
