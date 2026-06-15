import { describe, expect, it } from 'vitest'
import {
  VIC_FORM1_SIGNING_TAG_DEFS,
  assertVicForm1DocusealTagsExact,
  buildOfficialVicForm1PdfWithSigning,
  buildVicForm1SigningTagPlacements,
  expectedVicForm1SigningTags,
  extractVicForm1DocusealTagsFromPdfPage,
  parseDocusealTagString,
  resolveVicForm1IncludeCoTenantSignature,
} from './officialVicForm1Signing.js'
import { loadVicForm1CoordinateMap } from './officialVicForm1Fill.js'
import { pdfBufferHasDocusealTags } from './officialNswFt6600Signing.js'
import { vicForm1RepresentativeFixtureProps } from './vicForm1RepresentativeFixture.js'

describe('buildVicForm1SigningTagPlacements', () => {
  const map = loadVicForm1CoordinateMap()

  it('places six tags when co-tenant is included', () => {
    const placements = buildVicForm1SigningTagPlacements(map.fields, true)
    expect(placements).toHaveLength(6)
    expect(placements.map((p) => p.fieldName)).toEqual([
      'signature.rentalProvider1',
      'signature.rentalProvider1Date',
      'signature.renter1',
      'signature.renter1Date',
      'signature.renter2',
      'signature.renter2Date',
    ])
    expect(placements.every((p) => p.pageIndex === 7)).toBe(true)
    expect(placements.every((p) => p.tag.includes('{{'))).toBe(true)
  })

  it('omits co-renter pair when gated off', () => {
    const placements = buildVicForm1SigningTagPlacements(map.fields, false)
    expect(placements).toHaveLength(4)
    expect(placements.some((p) => p.fieldName.startsWith('signature.renter2'))).toBe(false)
  })
})

describe('resolveVicForm1IncludeCoTenantSignature', () => {
  it('returns true for representative fixture (Alex co-renter)', () => {
    const props = vicForm1RepresentativeFixtureProps()
    expect(resolveVicForm1IncludeCoTenantSignature(props)).toBe(true)
  })

  it('uses bookingRequiresCoTenantSignature when booking is provided', () => {
    const props = vicForm1RepresentativeFixtureProps()
    expect(
      resolveVicForm1IncludeCoTenantSignature(props, {
        occupant_count: 2,
        co_tenant: { full_name: 'Alex', email: 'alex@example.com' },
      }),
    ).toBe(true)
    expect(
      resolveVicForm1IncludeCoTenantSignature(props, { occupant_count: 1, co_tenant: null }),
    ).toBe(false)
  })
})

describe('parseDocusealTagString', () => {
  it('parses VIC rental provider signature tag', () => {
    const parsed = parseDocusealTagString(VIC_FORM1_SIGNING_TAG_DEFS[0]!.tag)
    expect(parsed).toEqual({
      label: 'Rental Provider Signature',
      role: 'First Party',
      type: 'signature',
    })
  })
})

describe('expectedVicForm1SigningTags', () => {
  it('lists four tags without co-tenant and six with', () => {
    expect(expectedVicForm1SigningTags(false)).toHaveLength(4)
    expect(expectedVicForm1SigningTags(true)).toHaveLength(6)
  })
})

describe('assertVicForm1DocusealTagsExact', () => {
  it('accepts exact expected tag set', () => {
    const tags = expectedVicForm1SigningTags(true).map((tag) => ({
      tag,
      label: '',
      role: tag.includes('Co-tenant')
        ? 'Co-tenant'
        : tag.includes('Second Party')
          ? 'Second Party'
          : 'First Party',
      type: tag.includes('type=date') ? 'date' : 'signature',
      fieldId: '',
      pageIndex: 7,
      x: 0,
      y: 0,
    }))
    expect(() => assertVicForm1DocusealTagsExact(tags, true)).not.toThrow()
  })

  it('rejects extra tags', () => {
    const tags = expectedVicForm1SigningTags(false).map((tag) => ({
      tag,
      label: '',
      role: 'First Party',
      type: 'signature',
      fieldId: '',
      pageIndex: 7,
      x: 0,
      y: 0,
    }))
    tags.push({
      tag: '{{Renter 2 Signature;role=Co-tenant;type=signature}}',
      label: '',
      role: 'Co-tenant',
      type: 'signature',
      fieldId: '',
      pageIndex: 7,
      x: 0,
      y: 0,
    })
    expect(() => assertVicForm1DocusealTagsExact(tags, false)).toThrow(/tag count/)
  })
})

describe('buildOfficialVicForm1PdfWithSigning (representative fixture)', () => {
  it('embeds exactly six DocuSeal tags on page 8 with co-renter', async () => {
    const props = vicForm1RepresentativeFixtureProps()
    const includeCoTenant = resolveVicForm1IncludeCoTenantSignature(props)
    expect(includeCoTenant).toBe(true)

    const result = await buildOfficialVicForm1PdfWithSigning(props, { includeCoTenantSignatureTags: includeCoTenant })
    expect(result.hasDocusealTags).toBe(true)
    expect(result.tagCount).toBe(6)
    expect(pdfBufferHasDocusealTags(result.pdfBytes)).toBe(true)

    const detected = await extractVicForm1DocusealTagsFromPdfPage(result.pdfBytes, 8)
    assertVicForm1DocusealTagsExact(detected, true)
    expect(detected.map((d) => d.role).sort()).toEqual(['Co-tenant', 'Co-tenant', 'First Party', 'First Party', 'Second Party', 'Second Party'])
    expect(detected.every((d) => d.pageIndex === 7)).toBe(true)
  })
})
