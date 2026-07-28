/**
 * Parse / validate Anthropic JSON for listing extraction.
 * Unknowns stay null; never invents tier, bond, or surcharges.
 */
import {
  EXTRACTOR_FEATURE_NAMES,
  EXTRACTOR_LEASE_LENGTHS,
  type ExtractConfidence,
  type ExtractedField,
  type ExtractedListing,
  type ExtractorLeaseLength,
} from './types.js'

const KNOWN_FEATURE_LOWER = new Map<string, string>(
  EXTRACTOR_FEATURE_NAMES.map((n) => [n.toLowerCase(), n]),
)

function isConfidence(v: unknown): v is ExtractConfidence {
  return v === 'high' || v === 'low'
}

function asFieldString(raw: unknown): ExtractedField<string> {
  if (raw == null) return null
  if (typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  if (!isConfidence(o.confidence)) return null
  if (typeof o.value !== 'string') return null
  const value = o.value.trim()
  if (!value) return null
  return { value, confidence: o.confidence }
}

function asFieldBoolean(raw: unknown): ExtractedField<boolean> {
  if (raw == null) return null
  if (typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  if (!isConfidence(o.confidence)) return null
  if (typeof o.value !== 'boolean') return null
  return { value: o.value, confidence: o.confidence }
}

/** Numeric string for rent / beds / baths / occupants — digits only after light clean. */
function asFieldNumericString(
  raw: unknown,
  opts?: { min?: number; max?: number; allowDecimal?: boolean },
): ExtractedField<string> {
  if (raw == null) return null
  if (typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  if (!isConfidence(o.confidence)) return null
  let n: number
  if (typeof o.value === 'number' && Number.isFinite(o.value)) {
    n = o.value
  } else if (typeof o.value === 'string') {
    const cleaned = o.value.replace(/[^0-9.-]/g, '')
    if (!cleaned) return null
    n = Number(cleaned)
  } else {
    return null
  }
  if (!Number.isFinite(n)) return null
  if (opts?.min != null && n < opts.min) return null
  if (opts?.max != null && n > opts.max) return null
  if (!opts?.allowDecimal && !Number.isInteger(n)) {
    n = Math.round(n)
  }
  const value = opts?.allowDecimal ? String(Math.round(n)) : String(Math.trunc(n))
  if (opts?.allowDecimal) {
    // rent: whole AUD weeks
    return { value: String(Math.round(n)), confidence: o.confidence }
  }
  return { value, confidence: o.confidence }
}

function asFieldFeatures(raw: unknown): ExtractedField<string[]> {
  if (raw == null) return null
  if (typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  if (!isConfidence(o.confidence)) return null
  if (!Array.isArray(o.value)) return null
  const names: string[] = []
  for (const item of o.value) {
    if (typeof item !== 'string') continue
    const canonical = KNOWN_FEATURE_LOWER.get(item.trim().toLowerCase())
    if (canonical && !names.includes(canonical)) names.push(canonical)
  }
  if (names.length === 0) return null
  return { value: names, confidence: o.confidence }
}

/** Raw feature strings before canonical filter — for unmatched suggestions. */
export function rawFeatureNamesFromField(raw: unknown): string[] {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return []
  const o = raw as Record<string, unknown>
  if (!Array.isArray(o.value)) return []
  return o.value
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean)
}

function asFieldLeaseLength(raw: unknown): ExtractedField<ExtractorLeaseLength> {
  const base = asFieldString(raw)
  if (!base) return null
  if (!(EXTRACTOR_LEASE_LENGTHS as readonly string[]).includes(base.value)) return null
  return { value: base.value as ExtractorLeaseLength, confidence: base.confidence }
}

function asFieldIsoDate(raw: unknown): ExtractedField<string> {
  const base = asFieldString(raw)
  if (!base) return null
  // Accept YYYY-MM-DD only (real date stated)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(base.value)) return null
  const t = Date.parse(base.value)
  if (!Number.isFinite(t)) return null
  return base
}

/** Every top-level balanced `{ ... }` substring in document order. */
export function extractAllJsonObjects(text: string): string[] {
  const results: string[] = []
  let i = 0
  while (i < text.length) {
    if (text[i] !== '{') {
      i++
      continue
    }
    const start = i
    let depth = 0
    let j = start
    while (j < text.length) {
      const ch = text[j]
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          results.push(text.slice(start, j + 1))
          i = j + 1
          break
        }
      }
      j++
    }
    if (j >= text.length && depth > 0) {
      i = start + 1
    }
  }
  return results
}

function emptyExtractedListing(): ExtractedListing {
  return {
    title: null,
    description: null,
    rentPerWeek: null,
    bedrooms: null,
    bathrooms: null,
    maxOccupants: null,
    furnished: null,
    linenSupplied: null,
    weeklyCleaning: null,
    features: null,
    parkingAvailable: null,
    address: null,
    suburb: null,
    state: null,
    postcode: null,
    leaseLength: null,
    availableFrom: null,
    houseRulesText: null,
    accommodationHint: null,
  }
}

export type ParseExtractedListingResult = {
  extracted: ExtractedListing
  /** Names the model returned that are not in the canonical feature list. */
  unmatchedFeatureNames: string[]
}

export function parseExtractedListing(rawText: string): ExtractedListing | null {
  const result = parseExtractedListingWithMeta(rawText)
  return result?.extracted ?? null
}

export function parseExtractedListingWithMeta(rawText: string): ParseExtractedListingResult | null {
  const trimmed = rawText.trim()
  if (!trimmed) return null

  const candidates: string[] = []
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) candidates.push(trimmed)
  candidates.push(...extractAllJsonObjects(trimmed))

  for (let c = candidates.length - 1; c >= 0; c--) {
    const parsed = tryParseExtractedObject(candidates[c]!)
    if (parsed) return parsed
  }
  return null
}

function tryParseExtractedObject(rawJson: string): ParseExtractedListingResult | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const obj = parsed as Record<string, unknown>

  const out = emptyExtractedListing()
  out.title = asFieldString(obj.title)
  out.description = asFieldString(obj.description)
  out.rentPerWeek = asFieldNumericString(obj.rentPerWeek, { min: 1, allowDecimal: true })
  out.bedrooms = asFieldNumericString(obj.bedrooms, { min: 0, max: 99 })
  out.bathrooms = asFieldNumericString(obj.bathrooms, { min: 0, max: 99 })
  out.maxOccupants = asFieldNumericString(obj.maxOccupants, { min: 1, max: 10 })
  out.furnished = asFieldBoolean(obj.furnished)
  out.linenSupplied = asFieldBoolean(obj.linenSupplied)
  out.weeklyCleaning = asFieldBoolean(obj.weeklyCleaning)
  out.features = asFieldFeatures(obj.features)
  out.parkingAvailable = asFieldBoolean(obj.parkingAvailable)
  out.address = asFieldString(obj.address)
  out.suburb = asFieldString(obj.suburb)
  out.state = asFieldString(obj.state)
  out.postcode = asFieldString(obj.postcode)
  out.leaseLength = asFieldLeaseLength(obj.leaseLength)
  out.availableFrom = asFieldIsoDate(obj.availableFrom)
  out.houseRulesText = asFieldString(obj.houseRulesText)
  out.accommodationHint = asFieldString(obj.accommodationHint)

  const unmatchedFeatureNames = unmatchedFeatureNamesFromRaw(
    obj.features,
    out.features?.value ?? [],
  )

  const any =
    out.title ||
    out.description ||
    out.rentPerWeek ||
    out.bedrooms ||
    out.bathrooms ||
    out.suburb ||
    out.address ||
    out.features ||
    out.accommodationHint ||
    unmatchedFeatureNames.length > 0
  return any ? { extracted: out, unmatchedFeatureNames } : null
}

export function unmatchedFeatureNamesFromRaw(rawFeaturesField: unknown, matchedCanonical: string[]): string[] {
  const raw = rawFeatureNamesFromField(rawFeaturesField)
  const matchedLower = new Set(matchedCanonical.map((n) => n.toLowerCase()))
  const out: string[] = []
  for (const name of raw) {
    const lower = name.toLowerCase()
    if (KNOWN_FEATURE_LOWER.has(lower)) continue
    if (matchedLower.has(lower)) continue
    if (!out.some((x) => x.toLowerCase() === lower)) out.push(name)
  }
  return out
}
