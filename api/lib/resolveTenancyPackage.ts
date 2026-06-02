/**
 * Single source of truth: maps listing attributes → tenancy document package (tier, generator, bond rules).
 * Lives under `api/lib` so Vercel Node bundles include it (imports from `src/` are not deployed with `api/*` functions).
 */
import type { TenancyRules } from './tenancy/rules/types.js'
import { nswTenancyRules } from './tenancy/rules/nsw.js'
import { qldTenancyRules } from './tenancy/rules/qld.js'
import { vicTenancyRules } from './tenancy/rules/vic.js'

export type TenancyTier = 'T1' | 'T2' | 'T3'

export type SupportedJurisdictionState = 'NSW' | 'VIC' | 'QLD'

export type RagState = 'NSW' | 'VIC' | 'QLD' | null

export interface TenancyPackageInput {
  /** Australian state code (e.g. properties.state) */
  state: string
  /** properties.property_type */
  property_type: string
  /** properties.is_registered_rooming_house */
  is_registered_rooming_house: boolean
  /**
   * Tenancy start / agreement date for future rule versioning — v1 ignored.
   */
  date?: string | Date
}

/** @deprecated Use TenancyPackageInput */
export type ResolveTenancyPackageInput = TenancyPackageInput

export interface TenancyPackageStoragePaths {
  draft: string
  signed: string
}

type TenancyPackageResultBase = {
  tier: TenancyTier
  pdfKind: string | null
  signingPackageName: string | null
  storagePaths: TenancyPackageStoragePaths | null
  ragState: RagState
}

/** Supported package — generator id set; rules fully populated. */
export type SupportedTenancyPackageResult = TenancyPackageResultBase & {
  supported: true
  generator: string
  rules: TenancyRules
  unsupportedReason: null
}

/** Unsupported — no generator; rules omitted. */
export type UnsupportedTenancyPackageResult = TenancyPackageResultBase & {
  supported: false
  generator: null
  rules: null
  unsupportedReason: string
}

export type TenancyPackageResult = SupportedTenancyPackageResult | UnsupportedTenancyPackageResult

const T3_DEFERRED_REASON =
  'Rooming/boarding house (T3) tenancy agreements are not available on the platform yet.'

function nswFt6600Paths(): TenancyPackageStoragePaths {
  return {
    draft: 'nsw_residential_tenancy_agreement_draft.pdf',
    signed: 'nsw_residential_tenancy_agreement_signed.pdf',
  }
}

function qldForm18aPaths(): TenancyPackageStoragePaths {
  return {
    draft: 'qld_form18a_general_tenancy_agreement_draft.pdf',
    signed: 'qld_form18a_general_tenancy_agreement_signed.pdf',
  }
}

function vicForm1Paths(): TenancyPackageStoragePaths {
  return {
    draft: 'vic_residential_rental_agreement_draft.pdf',
    signed: 'vic_residential_rental_agreement_signed.pdf',
  }
}

function vicOccupancyPaths(): TenancyPackageStoragePaths {
  return {
    draft: 'vic_occupancy_agreement_draft.pdf',
    signed: 'vic_occupancy_agreement_signed.pdf',
  }
}

function qldOccupancyPaths(): TenancyPackageStoragePaths {
  return {
    draft: 'qld_occupancy_agreement_draft.pdf',
    signed: 'qld_occupancy_agreement_signed.pdf',
  }
}

function unsupportedBase(
  tier: TenancyTier,
  reason: string,
  ragState: RagState,
): UnsupportedTenancyPackageResult {
  return {
    tier,
    supported: false,
    generator: null,
    pdfKind: null,
    rules: null,
    signingPackageName: null,
    storagePaths: null,
    ragState,
    unsupportedReason: reason,
  }
}

/**
 * Truth table (property_type × rooming house × state) → package metadata.
 * `date` is accepted for future versioned rules; v1 ignores it.
 */
export function resolveTenancyPackage(input: TenancyPackageInput): TenancyPackageResult {
  void input.date

  const stateRaw = typeof input.state === 'string' ? input.state.trim().toUpperCase() : ''
  const propertyType = typeof input.property_type === 'string' ? input.property_type.trim() : ''
  const isRooming = Boolean(input.is_registered_rooming_house)

  if (stateRaw !== 'NSW' && stateRaw !== 'VIC' && stateRaw !== 'QLD') {
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
      const rules = nswTenancyRules('T1')
      return {
        tier: 'T1',
        supported: true,
        generator: 'nsw-occupancy',
        pdfKind: 'occupancy_agreement',
        rules,
        signingPackageName: 'NSW Residential Occupancy Agreement',
        storagePaths: null,
        ragState,
        unsupportedReason: null,
      }
    }
    if (state === 'QLD') {
      const rules = qldTenancyRules('T1')
      return {
        tier: 'T1',
        supported: true,
        generator: 'qld-occupancy',
        pdfKind: 'occupancy_agreement',
        rules,
        signingPackageName: 'QLD occupancy agreement',
        storagePaths: qldOccupancyPaths(),
        ragState,
        unsupportedReason: null,
      }
    }
    const rules = vicTenancyRules('T1')
    return {
      tier: 'T1',
      supported: true,
      generator: 'vic-occupancy',
      pdfKind: 'occupancy_agreement',
      rules,
      signingPackageName: 'VIC Licence to Occupy',
      storagePaths: vicOccupancyPaths(),
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
      const rules = nswTenancyRules('T2')
      return {
        tier: 'T2',
        supported: true,
        generator: 'nsw-ft6600',
        pdfKind: 'residential_tenancy_agreement',
        rules,
        signingPackageName: 'NSW Residential Tenancy Agreement (FT6600)',
        storagePaths: nswFt6600Paths(),
        ragState,
        unsupportedReason: null,
      }
    }
    if (state === 'QLD') {
      const rules = qldTenancyRules('T2')
      return {
        tier: 'T2',
        supported: true,
        generator: 'qld-form18a',
        pdfKind: 'residential_tenancy_agreement',
        rules,
        signingPackageName: 'QLD Form 18a — General Tenancy Agreement',
        storagePaths: qldForm18aPaths(),
        ragState,
        unsupportedReason: null,
      }
    }
    const rules = vicTenancyRules('T2')
    return {
      tier: 'T2',
      supported: true,
      generator: 'vic-form1',
      pdfKind: 'residential_rental_agreement',
      rules,
      signingPackageName: 'VIC Form 1 — Residential rental agreement',
      storagePaths: vicForm1Paths(),
      ragState,
      unsupportedReason: null,
    }
  }

  return unsupportedBase('T2', 'unknown_property_type', ragState)
}

/** Maps router generator → internal document API path for server-side PDF generation. */
export function tenancyGeneratorToApiPath(generator: string | null): string | null {
  if (generator === 'nsw-ft6600') return '/api/documents/generate-residential-tenancy'
  if (generator === 'nsw-occupancy') return '/api/documents/generate-lease'
  if (generator === 'qld-occupancy') return '/api/documents/generate-qld-occupancy'
  if (generator === 'qld-form18a') return '/api/documents/generate-qld-residential-tenancy'
  if (generator === 'vic-form1') return '/api/documents/generate-vic-residential-rental'
  if (generator === 'vic-occupancy') return '/api/documents/generate-vic-occupancy'
  return null
}
