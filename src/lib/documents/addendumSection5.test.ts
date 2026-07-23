import { describe, expect, it } from 'vitest'
import React from 'react'
import { PDFParse } from 'pdf-parse'
import { renderToBuffer } from '@react-pdf/renderer'
import { QuniPlatformAddendum } from './QuniPlatformAddendum.tsx'
import type { QuniPlatformAddendumProps } from '../../../api/documents/rtaTypes.js'
import { buildAddendumUtilitiesFields } from './addendumUtilitiesFields.ts'

function baseProps(
  overrides: Partial<QuniPlatformAddendumProps> = {},
): QuniPlatformAddendumProps {
  return {
    documentId: 'addendum-s5-test',
    generatedAt: '5 May 2026, 10:00:00 am',
    landlord: {
      fullName: 'Landlord One',
      companyName: null,
      addressLine: '1 Street, Sydney NSW 2000',
      email: 'landlord@example.com',
      phone: '0400 000 000',
    },
    tenant: {
      fullName: 'Tenant One',
      email: 'tenant@example.com',
      phone: '0401 000 000',
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
    },
    premises: {
      addressLine: '2 Road, Sydney NSW 2001',
      propertyType: 'private_room_landlord_off_site',
      roomType: 'Room A',
      furnished: true,
      linenSupplied: false,
      weeklyCleaningService: false,
    },
    term: {
      startDate: '2026-06-01',
      endDate: '2027-05-31',
      periodic: false,
      leaseLengthDescription: '52 weeks',
    },
    rent: {
      weeklyRent: 450,
      platformFeePercent: 10,
      totalWeekly: 495,
      paymentMethod: 'Bank transfer',
    },
    bond: { amount: null },
    utilitiesDescription: 'Electricity, water, gas and Wi-Fi',
    signingPackage: 'residential_tenancy',
    serviceTier: 'managed',
    allInclusive: true,
    billsIncluded: true,
    rentPaymentMethod: 'bank_transfer',
    bankDetails: {
      bsb: '123456',
      accountNumber: '12345678',
      accountName: 'Trust Account',
      bankName: 'Example Bank',
    },
    emergencyContact: '000',
    rentEnquiriesEmail: 'rent@quni.com.au',
    generalEnquiriesEmail: 'info@quni.com.au',
    houseCommunicationsChannel: 'Slack',
    utilitiesCap: 300,
    houseRules: null,
    ...overrides,
  }
}

async function pdfText(props: QuniPlatformAddendumProps): Promise<string> {
  const buf = await renderToBuffer(
    React.createElement(QuniPlatformAddendum, props) as Parameters<typeof renderToBuffer>[0],
  )
  const parser = new PDFParse({ data: buf })
  const parsed = await parser.getText()
  await parser.destroy()
  return parsed.text.replace(/\s+/g, ' ')
}

describe('addendum Section 5 matrix', () => {
  it(
    'Managed + all-inclusive + cap > 0 keeps quarterly allowance copy',
    async () => {
      const text = await pdfText(
        baseProps({
          serviceTier: 'managed',
          allInclusive: true,
          billsIncluded: true,
          utilitiesCap: 300,
        }),
      )
      expect(text).toContain('all-inclusive basis')
      expect(text).toContain('utilities allowance')
      expect(text).toContain('$300.00')
      expect(text).toContain('excess of the quarterly allowance')
      expect(text).not.toMatch(/covering electricity, gas and water usage are included/i)
    },
    30_000,
  )

  it(
    'Listing never claims Managed all-inclusive / quarterly cap',
    async () => {
      const text = await pdfText(
        baseProps({
          serviceTier: 'listing',
          allInclusive: true,
          billsIncluded: true,
          utilitiesCap: null,
          utilitiesDescription:
            'Electricity, gas and water usage are included in the rent. Internet and waste services as described on the property listing.',
          listingDisclosureLabels: ['Bills included', 'Water included in rent'],
        }),
      )
      expect(text).toContain('listing tenancy')
      expect(text).not.toContain('all-inclusive basis')
      expect(text).not.toContain('utilities allowance')
      expect(text).not.toContain('quarterly allowance')
      expect(text).toContain('Disclosure summary')
    },
    30_000,
  )

  it(
    'Listing tenant-pays uses responsibility wording without cap',
    async () => {
      const text = await pdfText(
        baseProps({
          serviceTier: 'listing',
          allInclusive: false,
          billsIncluded: false,
          utilitiesCap: null,
          utilitiesDescription: 'Tenant pays electricity (individually metered).',
          listingDisclosureLabels: ['Tenant pays electricity (individually metered)'],
        }),
      )
      expect(text).toContain('tenant is responsible for utility charges')
      expect(text).not.toContain('all-inclusive basis')
      expect(text).not.toContain('utilities allowance')
    },
    30_000,
  )

  it(
    'Managed + not all-inclusive never claims all-inclusive',
    async () => {
      const text = await pdfText(
        baseProps({
          serviceTier: 'managed',
          allInclusive: false,
          billsIncluded: false,
          utilitiesCap: 300,
          utilitiesDescription: 'Tenant pays electricity (individually metered).',
          listingDisclosureLabels: ['Tenant pays electricity (individually metered)'],
        }),
      )
      expect(text).toContain('Managed tenancy')
      expect(text).toContain('not calculated on an all-inclusive')
      expect(text).not.toContain('all-inclusive basis covering')
      expect(text).not.toContain('utilities allowance')
    },
    30_000,
  )

  it('buildAddendumUtilitiesFields nulls Listing cap and resolves description', () => {
    const fields = buildAddendumUtilitiesFields({
      serviceTier: 'listing',
      prop: {
        water_usage_charged_separately: false,
        property_features: [{ features: { name: 'Bills included' } }],
      },
      managedUtilitiesCapAud: 999,
    })
    expect(fields.serviceTier).toBe('listing')
    expect(fields.utilitiesCap).toBeNull()
    expect(fields.allInclusive).toBe(true)
    expect(fields.billsIncluded).toBe(true)
    expect(fields.utilitiesDescription.toLowerCase()).toContain('included in the rent')
  })

  it('buildAddendumUtilitiesFields keeps Managed cap from pricing', () => {
    const fields = buildAddendumUtilitiesFields({
      serviceTier: 'managed',
      prop: {
        water_usage_charged_separately: true,
        property_features: [],
        utilities_services: {
          electricity: {
            tenant_pays: true,
            individually_metered: true,
            apportionment_percent: null,
            how_must_be_paid: 'Direct to supplier',
          },
          gas: {
            tenant_pays: false,
            individually_metered: null,
            apportionment_percent: null,
            how_must_be_paid: null,
          },
        },
      },
      managedUtilitiesCapAud: 250,
    })
    expect(fields.serviceTier).toBe('managed')
    expect(fields.utilitiesCap).toBe(250)
    expect(fields.allInclusive).toBe(false)
  })
})
