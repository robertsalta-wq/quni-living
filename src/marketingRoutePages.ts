import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { routeImports } from './lazyPages'

type Page = ComponentType<object>
type PageExport = Page | LazyExoticComponent<Page>

/**
 * Sync page modules during SSR/prerender; React.lazy on the client so `/` does not
 * download PropertyDetail / Listings / SEO / marketing pages on the critical path.
 *
 * `import.meta.env.SSR` is statically replaced, so the client build tree-shakes the
 * eager branch and never pulls those modules into the homepage entry graph.
 */
async function ssrPage(loader: () => Promise<{ default: Page }>): Promise<Page> {
  return (await loader()).default
}

function clientPage(loader: () => Promise<{ default: Page }>): LazyExoticComponent<Page> {
  return lazy(loader)
}

export const Guides: PageExport = import.meta.env.SSR
  ? await ssrPage(() => import('./pages/Guides'))
  : clientPage(() => import('./pages/Guides'))

export const GuideArticlePage: PageExport = import.meta.env.SSR
  ? await ssrPage(() => import('./pages/guides/GuideArticlePage'))
  : clientPage(() => import('./pages/guides/GuideArticlePage'))

export const ForUniversities: PageExport = import.meta.env.SSR
  ? await ssrPage(() => import('./pages/ForUniversities'))
  : clientPage(() => import('./pages/ForUniversities'))

export const Listings: PageExport = import.meta.env.SSR
  ? await ssrPage(routeImports.listings)
  : clientPage(routeImports.listings)

export const Pricing: PageExport = import.meta.env.SSR
  ? await ssrPage(routeImports.pricing)
  : clientPage(routeImports.pricing)

export const Faq: PageExport = import.meta.env.SSR
  ? await ssrPage(routeImports.faq)
  : clientPage(routeImports.faq)

export const HowItWorks: PageExport = import.meta.env.SSR
  ? await ssrPage(routeImports.howItWorks)
  : clientPage(routeImports.howItWorks)

export const Verification: PageExport = import.meta.env.SSR
  ? await ssrPage(routeImports.verification)
  : clientPage(routeImports.verification)

export const Contact: PageExport = import.meta.env.SSR
  ? await ssrPage(routeImports.contact)
  : clientPage(routeImports.contact)

export const LandlordPartnerships: PageExport = import.meta.env.SSR
  ? await ssrPage(routeImports.serviceLandlordPartnerships)
  : clientPage(routeImports.serviceLandlordPartnerships)

export const LandlordAIFeaturePage: PageExport = import.meta.env.SSR
  ? await ssrPage(routeImports.landlordAIFeaturePage)
  : clientPage(routeImports.landlordAIFeaturePage)

export const ListYourRoomE: PageExport = import.meta.env.SSR
  ? await ssrPage(routeImports.listYourRoomE)
  : clientPage(routeImports.listYourRoomE)

export const QldHouseRulesPage: PageExport = import.meta.env.SSR
  ? await ssrPage(routeImports.qldHouseRulesPage)
  : clientPage(routeImports.qldHouseRulesPage)

export const ForLandlords: PageExport = import.meta.env.SSR
  ? await ssrPage(() => import('./pages/ForLandlords'))
  : clientPage(() => import('./pages/ForLandlords'))

export const CampusAccommodation: PageExport = import.meta.env.SSR
  ? await ssrPage(routeImports.campusAccommodation)
  : clientPage(routeImports.campusAccommodation)

export const UniversityAccommodation: PageExport = import.meta.env.SSR
  ? await ssrPage(routeImports.universityAccommodation)
  : clientPage(routeImports.universityAccommodation)

export const PropertyDetail: PageExport = import.meta.env.SSR
  ? await ssrPage(routeImports.propertyDetail)
  : clientPage(routeImports.propertyDetail)

export const AuthCallback: PageExport = import.meta.env.SSR
  ? await ssrPage(routeImports.authCallback)
  : clientPage(routeImports.authCallback)
