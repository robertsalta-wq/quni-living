import type { LandlordDashboardProfileSectionKey } from '../../../lib/landlordDashboardProfilePaths'
import type { ListingHubSectionStatus } from '../../../lib/listingEditHubHealth'
import type { Database } from '../../../lib/database.types'
import { formatLanguagesSpoken, normalizeLanguagesSpoken } from '../../../lib/languagesSpoken'
import {
  computeLandlordReadiness,
  isLandlordAboutSectionComplete,
  isLandlordAddressSectionComplete,
  isLandlordAgreementsSectionComplete,
  isLandlordPersonalSectionComplete,
  landlordTypeRequiresCompanyDetails,
} from '../../../lib/landlordProfileReadiness'
import { formatStripeCardOnFile, type LandlordListingBillingSnapshot } from '../../../lib/landlordListingBilling'

export type LandlordProfileRow = Database['public']['Tables']['landlord_profiles']['Row']

export const LANDLORD_PROFILE_HUB_SECTION_IDS = [
  'personal',
  'address',
  'about',
  'agreements',
  'payouts',
  'insurance',
  'languages',
] as const satisfies readonly LandlordDashboardProfileSectionKey[]

export type LandlordProfileHubSectionId = (typeof LANDLORD_PROFILE_HUB_SECTION_IDS)[number]

export const LANDLORD_PROFILE_HUB_SECTION_TITLES: Record<LandlordProfileHubSectionId, string> = {
  personal: 'Personal details',
  address: 'Address',
  about: 'About you',
  agreements: 'Agreements',
  payouts: 'Payouts & identity',
  insurance: 'Insurance',
  languages: 'Languages spoken',
}

export function isLandlordProfileHubSectionId(value: string | null | undefined): value is LandlordProfileHubSectionId {
  return Boolean(value && (LANDLORD_PROFILE_HUB_SECTION_IDS as readonly string[]).includes(value))
}

const LANDLORD_TYPE_LABELS: Record<string, string> = {
  individual: 'Individual',
  company: 'Company',
  trust: 'Trust',
}

function landlordTypeLabel(value: string | null | undefined): string {
  const v = value?.trim()
  if (!v) return ''
  return LANDLORD_TYPE_LABELS[v] ?? v
}

/** Hub subtitle lines — actual values. Multi-line only when several values exist. */
export function profileHubSubtitleLines(
  id: LandlordProfileHubSectionId,
  profile: LandlordProfileRow,
  opts: { email: string | null; listingBilling: LandlordListingBillingSnapshot | null },
): string[] {
  switch (id) {
    case 'personal': {
      const name =
        [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() ||
        profile.full_name?.trim() ||
        ''
      const phone = profile.phone?.trim() ?? ''
      const email = opts.email?.trim() || profile.email?.trim() || ''
      const type = landlordTypeLabel(profile.landlord_type)
      const abn = profile.abn?.trim()
      const company = profile.company_name?.trim()
      const lines = [name, phone, email].filter(Boolean)
      if (type) {
        const biz = [type, company, abn ? `ABN ${abn}` : ''].filter(Boolean).join(' · ')
        if (biz) lines.push(biz)
      }
      return lines.length > 0 ? lines : ['Add your details']
    }
    case 'address': {
      const line = [profile.address?.trim(), profile.suburb?.trim(), [profile.state?.trim(), profile.postcode?.trim()].filter(Boolean).join(' ')]
        .filter(Boolean)
        .join(', ')
      return [line || 'Add your address']
    }
    case 'about': {
      const bio = profile.bio?.trim()
      if (bio) return [bio]
      if (profile.avatar_url?.trim()) return ['Photo added — add a short bio']
      return ['Add a photo and short bio']
    }
    case 'agreements': {
      if (isLandlordAgreementsSectionComplete(profile)) {
        return ['Terms, Privacy, Landlord Service Agreement & Non-discrimination accepted']
      }
      return ['Accept required agreements']
    }
    case 'payouts': {
      const readiness = computeLandlordReadiness(profile)
      const cardLabel =
        opts.listingBilling?.hasPaymentMethod && opts.listingBilling.card
          ? formatStripeCardOnFile(opts.listingBilling.card)
          : null
      if (readiness.accept.identityVerified && cardLabel) {
        return [`Enabled · ${cardLabel}`]
      }
      if (readiness.accept.identityVerified) {
        return ['Stripe Connect · Identity verified']
      }
      return ['Connect Stripe to get paid']
    }
    case 'insurance': {
      if (profile.has_landlord_insurance) return ['Landlord cover confirmed']
      if (profile.insurance_acknowledged_at) return ['Noted — no cover confirmed']
      return ['Optional — confirm if you hold cover']
    }
    case 'languages': {
      const codes = normalizeLanguagesSpoken(profile.languages_spoken)
      if (codes.length === 0) return ['Optional — languages you can help in']
      return [formatLanguagesSpoken(codes)]
    }
  }
}

export function profileHubSectionStatus(
  id: LandlordProfileHubSectionId,
  profile: LandlordProfileRow,
): ListingHubSectionStatus {
  const readiness = computeLandlordReadiness(profile)
  switch (id) {
    case 'personal':
      return isLandlordPersonalSectionComplete(profile) ? 'complete' : 'attention'
    case 'address':
      return isLandlordAddressSectionComplete(profile) ? 'complete' : 'attention'
    case 'about':
      return isLandlordAboutSectionComplete(profile) ? 'complete' : 'attention'
    case 'agreements':
      return isLandlordAgreementsSectionComplete(profile) ? 'complete' : 'attention'
    case 'payouts':
      return readiness.accept.complete ? 'complete' : 'attention'
    case 'insurance':
      return profile.insurance_acknowledged_at || profile.has_landlord_insurance ? 'complete' : 'notstarted'
    case 'languages':
      return normalizeLanguagesSpoken(profile.languages_spoken).length > 0 ? 'complete' : 'notstarted'
  }
}

export function profileHubPersonalNeedsBiz(landlordType: string | null | undefined): boolean {
  return landlordTypeRequiresCompanyDetails(landlordType)
}
