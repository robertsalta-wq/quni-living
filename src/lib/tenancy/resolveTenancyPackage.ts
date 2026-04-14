/**
 * Single source of truth: maps listing attributes → tenancy document package (tier, generator, bond rules).
 * Do not duplicate routing logic outside this module.
 */

export type TenancyTier = 'T1' | 'T2' | 'T3'

export type SupportedJurisdictionState = 'NSW' | 'VIC'

export type RagState = 'NSW' | 'VIC' | null

export interface TenancyPackageInput {
  /** Australian state code (e.g. properties.state) */
  state: string
  /** properties.property_type */
  property_type: string
  /** properties.is_registered_rooming_house */
  is_registered_rooming_house: boolean
}

export interface BondRules {
  schemeApplies: boolean
  authority: string | null
  authorityUrl: string | null
  maxBondMonths: number | null
  lodgementDays: number | null
  receiptDays: number | null
}

export interface TenancyPackageStoragePaths {
  draft: string
  signed: string
}

export interface TenancyPackageResult {
  tier: TenancyTier
  supported: boolean
  generator: string | null
  pdfKind: string | null
  bondRules: BondRules
  signingPackageName: string | null
  storagePaths: TenancyPackageStoragePaths | null
  ragState: RagState
  unsupportedReason: string | null
}

const NSW_FAIR_TRADING = 'NSW Fair Trading'
const RTBA = 'RTBA'

const URL_NSW_RENTING = 'https://www.nsw.gov.au/housing-and-construction/renting'
const URL_RTBA = 'https://www.rtba.vic.gov.au/'

const T3_DEFERRED_REASON =
  'Rooming/boarding house (T3) tenancy agreements are not available on the platform yet.'

function bondRulesNone(): BondRules {
  return {
    schemeApplies: false,
    authority: null,
    authorityUrl: null,
    maxBondMonths: null,
    lodgementDays: null,
    receiptDays: null,
  }
}

function bondRulesNswStatutory(): BondRules {
  return {
    schemeApplies: true,
    authority: NSW_FAIR_TRADING,
    authorityUrl: URL_NSW_RENTING,
    maxBondMonths: 1,
    lodgementDays: 10,
    receiptDays: 15,
  }
}

function bondRulesVicStatutory(): BondRules {
  return {
    schemeApplies: true,
    authority: RTBA,
    authorityUrl: URL_RTBA,
    maxBondMonths: 1,
    lodgementDays: 10,
    receiptDays: 15,
  }
}

function nswFt6600Paths(): TenancyPackageStoragePaths {
  return {
    draft: 'nsw_residential_tenancy_agreement_draft.pdf',
    signed: 'nsw_residential_tenancy_agreement_signed.pdf',
  }
}

function vicForm1Paths(): TenancyPackageStoragePaths {
  return {
    draft: 'vic_residential_rental_agreement_draft.pdf',
    signed: 'vic_residential_rental_agreement_signed.pdf',
  }
}

function unsupportedBase(
  tier: TenancyTier,
  reason: string,
  ragState: RagState,
): TenancyPackageResult {
  return {
    tier,
    supported: false,
    generator: null,
    pdfKind: null,
    bondRules: bondRulesNone(),
    signingPackageName: null,
    storagePaths: null,
    ragState,
    unsupportedReason: reason,
  }
}

/**
 * Truth table (property_type × rooming house × state) → package metadata.
 */
export function resolveTenancyPackage(input: TenancyPackageInput): TenancyPackageResult {
  const stateRaw = typeof input.state === 'string' ? input.state.trim().toUpperCase() : ''
  const propertyType = typeof input.property_type === 'string' ? input.property_type.trim() : ''
  const isRooming = Boolean(input.is_registered_rooming_house)

  if (stateRaw !== 'NSW' && stateRaw !== 'VIC') {
    return unsupportedBase('T2', 'unsupported_state', null)
  }

  const state = stateRaw as SupportedJurisdictionState
  const ragState: RagState = state

  if (!propertyType) {
    return unsupportedBase('T2', 'unknown_property_type', ragState)
  }

  const knownTypes = new Set([
    'private_room_landlord_on_site',
    'private_room_landlord_off_site',
    'entire_property',
    'shared_room',
  ])
  if (!knownTypes.has(propertyType)) {
    return unsupportedBase('T2', 'unknown_property_type', ragState)
  }

  if (isRooming && propertyType !== 'private_room_landlord_off_site') {
    return unsupportedBase(
      'T2',
      'Registered rooming house is only valid for private room (landlord off-site) listings.',
      ragState,
    )
  }

  if (propertyType === 'private_room_landlord_off_site' && isRooming) {
    return unsupportedBase('T3', T3_DEFERRED_REASON, ragState)
  }

  if (propertyType === 'private_room_landlord_on_site' && !isRooming) {
    if (state === 'NSW') {
      return {
        tier: 'T1',
        supported: true,
        generator: 'nsw-occupancy',
        pdfKind: 'occupancy_agreement',
        bondRules: bondRulesNone(),
        signingPackageName: 'NSW Residential Occupancy Agreement',
        storagePaths: null,
        ragState,
        unsupportedReason: null,
      }
    }
    return {
      tier: 'T1',
      supported: true,
      generator: 'vic-form1',
      pdfKind: 'residential_rental_agreement',
      bondRules: bondRulesVicStatutory(),
      signingPackageName: 'VIC Form 1 — Residential rental agreement',
      storagePaths: vicForm1Paths(),
      ragState,
      unsupportedReason: null,
    }
  }

  if (
    (propertyType === 'private_room_landlord_off_site' ||
      propertyType === 'entire_property' ||
      propertyType === 'shared_room') &&
    !isRooming
  ) {
    if (state === 'NSW') {
      return {
        tier: 'T2',
        supported: true,
        generator: 'nsw-ft6600',
        pdfKind: 'residential_tenancy_agreement',
        bondRules: bondRulesNswStatutory(),
        signingPackageName: 'NSW Residential Tenancy Agreement (FT6600)',
        storagePaths: nswFt6600Paths(),
        ragState,
        unsupportedReason: null,
      }
    }
    return {
      tier: 'T2',
      supported: true,
      generator: 'vic-form1',
      pdfKind: 'residential_rental_agreement',
      bondRules: bondRulesVicStatutory(),
      signingPackageName: 'VIC Form 1 — Residential rental agreement',
      storagePaths: vicForm1Paths(),
      ragState,
      unsupportedReason: null,
    }
  }

  return unsupportedBase('T2', 'unknown_property_type', ragState)
}

/** Maps router generator → internal document API path (NSW only until VIC generators ship). */
export function tenancyGeneratorToApiPath(generator: string | null): string | null {
  if (generator === 'nsw-ft6600') return '/api/documents/generate-residential-tenancy'
  if (generator === 'nsw-occupancy') return '/api/documents/generate-lease'
  return null
}
