/**
 * Listing accuracy attestation at publish/save.
 *
 * Material hash deliberately EXCLUDES title and description (and address). Those are prose
 * edited constantly for wording; re-prompting on every typo would train landlords to tick
 * without reading. Do not "fix" this by adding description/title to the hash.
 *
 * Amenity IDs and images are passed from form state (not read from a property column).
 * Structured house rules are passed the same way.
 *
 * Hash algorithm duplicates api/lib/booking/listingBookingApply.js (sortKeysDeep + SHA-256
 * via crypto.subtle) — do not import that API module from the client.
 */

export const LISTING_ACCURACY_BLOCKED_MESSAGE =
  'You must confirm the details and description in this listing are accurate before saving.'

export const LISTING_ACCURACY_ATTESTATION_LABEL =
  'I confirm the details and description in this listing are accurate, and the photos are a current and fair representation of the property.'

export type ListingAccuracyMaterialFields = {
  rent_per_week: number | null
  bond: number | null
  bond_weeks: number | null
  room_type: string | null
  max_occupants: number | null
  available_from: string | null
  available_to: string | null
  furnished: boolean | null
  /** Preserved order — do not sort. */
  images: string[] | null
  house_rules: string | null
  /** Sorted by rule_id before hashing. */
  structured_house_rules: { rule_id: string; permitted: string }[]
  /** Sorted before hashing. */
  amenity_feature_ids: string[]
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep)
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortKeysDeep((value as Record<string, unknown>)[key])
    }
    return out
  }
  return value
}

async function sha256HexCanonicalJson(payload: Record<string, unknown>): Promise<string> {
  const canonical = JSON.stringify(sortKeysDeep(payload))
  const bytes = new TextEncoder().encode(canonical)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Always include every material key; use null where empty. Never omit keys. */
export function buildListingAccuracyMaterialPayload(
  fields: ListingAccuracyMaterialFields,
): Record<string, unknown> {
  const amenityIds = [...fields.amenity_feature_ids].sort((a, b) => a.localeCompare(b))
  const structured = [...fields.structured_house_rules]
    .map((r) => ({ rule_id: r.rule_id, permitted: r.permitted }))
    .sort((a, b) => a.rule_id.localeCompare(b.rule_id))

  return {
    amenity_feature_ids: amenityIds,
    available_from: fields.available_from,
    available_to: fields.available_to,
    bond: fields.bond,
    bond_weeks: fields.bond_weeks,
    furnished: fields.furnished,
    house_rules: fields.house_rules,
    images: fields.images,
    max_occupants: fields.max_occupants,
    rent_per_week: fields.rent_per_week,
    room_type: fields.room_type,
    structured_house_rules: structured,
  }
}

export async function computeListingAccuracyContentHash(
  fields: ListingAccuracyMaterialFields,
): Promise<string> {
  return sha256HexCanonicalJson(buildListingAccuracyMaterialPayload(fields))
}

export function propertyHasCurrentListingAccuracyAttestation(
  property: {
    accuracy_attested_at?: string | null
    accuracy_attested_content_hash?: string | null
  } | null | undefined,
  recomputedHash: string,
): boolean {
  const at = property?.accuracy_attested_at
  const stored = property?.accuracy_attested_content_hash
  return Boolean(at) && typeof stored === 'string' && stored.length > 0 && stored === recomputedHash
}

/**
 * Unlike authority/water helpers (once-only), this re-stamps when the material hash changed.
 */
export function listingAccuracyAttestationPatch(args: {
  agreed: boolean
  existingAttestedAt: string | null
  existingContentHash: string | null
  contentHash: string
}):
  | { accuracy_attested_at: string; accuracy_attested_content_hash: string }
  | Record<string, never> {
  if (!args.agreed) return {}
  if (
    propertyHasCurrentListingAccuracyAttestation(
      {
        accuracy_attested_at: args.existingAttestedAt,
        accuracy_attested_content_hash: args.existingContentHash,
      },
      args.contentHash,
    )
  ) {
    return {}
  }
  return {
    accuracy_attested_at: new Date().toISOString(),
    accuracy_attested_content_hash: args.contentHash,
  }
}
