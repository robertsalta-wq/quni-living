/**
 * Generates one agreement per state and one occupancy agreement per state
 * with a complete landlord payout, then checks the Quni-authored text.
 */
import { describe, expect, it } from 'vitest'
import React from 'react'
import { PDFParse } from 'pdf-parse'
import { renderToBuffer } from '@react-pdf/renderer'
import { FT6600_RENAMED_FIELDS as NSW } from '../../../api/lib/documents/ft6600RenamedFields.js'
import { buildNswResidentialTenancyAgreementPropsFromBooking } from '../../../api/lib/documents/buildNswFt6600AgreementProps.js'
import {
  applyOfficialQldForm18aScheduleFill,
  loadOfficialQldForm18aTemplate,
} from '../../../api/lib/documents/officialQldForm18aFill.js'
import {
  loadOfficialNswFt6600Template,
  prepareOfficialNswFt6600ScheduleForFlatten,
} from '../../../api/lib/documents/officialNswFt6600Fill.js'
import { QLD_FORM18A_RENAMED_FIELDS as QLD } from '../../../api/lib/documents/qldForm18aRenamedFields.js'
import { QUINN_ROBERT_FT6600_LISTING_INPUT } from '../../../api/lib/documents/quinnRobertFt6600Fixture.js'
import type {
  OccupancyAgreementProps,
  QldGeneralTenancyAgreementProps,
  QuniPlatformAddendumProps,
} from '../../../api/documents/rtaTypes.js'
import { QuniPlatformAddendum } from './QuniPlatformAddendum.tsx'
import { QuniPlatformAddendumQld } from './QuniPlatformAddendumQld.tsx'
import { QuniPlatformAddendumVic } from './vic/addendumGenerator.tsx'
import { VicResidentialRentalAgreementForm1 } from './vic/form1Generator.tsx'
import { NswLicenceToOccupyOnSite } from './nsw/occupancyGenerator.tsx'
import { QldLicenceToOccupyOnSite } from './qld/occupancyGenerator.tsx'
import { VicLicenceToOccupyOnSite } from './vic/occupancyGenerator.tsx'

const LANDLORD = {
  accountName: 'Quinn Lee',
  bsb: '062000',
  accountNumber: '11223344',
  bankName: 'Commonwealth Bank',
}

const BANNED = [
  '939200',
  '823175945',
  '8%',
  'service fee',
  'payment facilitation',
  'deducted',
  '$99',
  'via the Quni Living platform',
  'conduit',
  'through the platform',
  'bond workflow',
  'international transfer fee',
  '/move-out',
]

function windowAround(text: string, needle: string, before = 60, after = 420): string {
  const i = text.toLowerCase().indexOf(needle.toLowerCase())
  if (i < 0) return `(not found: ${needle})`
  return text.slice(Math.max(0, i - before), i + after).replace(/\s+/g, ' ')
}

async function pdfText(node: React.ReactElement): Promise<string> {
  const buf = await renderToBuffer(node as Parameters<typeof renderToBuffer>[0])
  const parser = new PDFParse({ data: buf })
  const parsed = await parser.getText()
  await parser.destroy()
  return parsed.text.replace(/\s+/g, ' ')
}

function assertClean(label: string, text: string) {
  for (const banned of BANNED) {
    expect(text, `${label} contains ${banned}`).not.toContain(banned)
  }
  expect(text, label).toContain('The tenant pays Quni Living nothing')
  expect(text).toContain('does not hold, transfer or refund the bond')
}

function addendumProps(signingPackage: QuniPlatformAddendumProps['signingPackage']): QuniPlatformAddendumProps {
  return {
    documentId: 'extract',
    generatedAt: '8 Nov 2026',
    landlord: {
      fullName: 'Quinn Lee',
      companyName: null,
      addressLine: '18 Malvina Street, Ryde NSW 2112',
      email: 'quinn@example.com',
      phone: '0400000000',
    },
    tenant: {
      fullName: 'Alex Resident',
      email: 'alex@example.com',
      phone: '0401000000',
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
    },
    premises: {
      addressLine: '2 Demo Rd',
      propertyType: 'private_room_landlord_off_site',
      roomType: 'Private room',
      furnished: true,
      linenSupplied: false,
      weeklyCleaningService: false,
    },
    term: {
      startDate: '2026-08-01',
      endDate: '2027-01-31',
      periodic: false,
      leaseLengthDescription: '6 months',
    },
    rent: {
      weeklyRent: 400,
      platformFeePercent: 0,
      totalWeekly: 400,
      paymentMethod: 'Direct deposit - Account name: Quinn Lee; BSB: 062-000; Account number: 11223344.',
    },
    bond: { amount: 1600 },
    utilitiesDescription: 'As listed',
    signingPackage,
    serviceTier: 'listing',
    allInclusive: false,
    billsIncluded: false,
    rentPaymentMethod: 'bank_transfer',
    bankDetails: {
      bsb: LANDLORD.bsb,
      accountNumber: LANDLORD.accountNumber,
      accountName: LANDLORD.accountName,
      bankName: LANDLORD.bankName,
    },
    emergencyContact: '0400000000',
    rentEnquiriesEmail: 'rent@example.com',
    generalEnquiriesEmail: 'info@example.com',
    houseCommunicationsChannel: 'Email',
    utilitiesCap: null,
    houseRules: null,
  }
}

function residentialProps(): QldGeneralTenancyAgreementProps {
  return {
    documentId: 'extract-residential',
    generatedAt: '8 Nov 2026',
    landlord: {
      fullName: 'Quinn Lee',
      companyName: null,
      addressLine: '18 Malvina Street, Ryde NSW 2112',
      email: 'quinn@example.com',
      phone: '0400000000',
    },
    tenant: {
      fullName: 'Alex Resident',
      email: 'alex@example.com',
      phone: '0401000000',
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      addressForServiceLine: null,
    },
    additionalTenantNames: [],
    premises: {
      addressLine: '22 Rental Street, West End QLD 4101',
      propertyType: 'private_room_landlord_off_site',
      roomType: 'Private room',
      furnished: true,
      linenSupplied: false,
      weeklyCleaningService: false,
    },
    premisesInclusionsLine: 'Room: Private room',
    maxOccupantsPermitted: 2,
    term: {
      startDate: '2026-08-01',
      endDate: '2027-01-31',
      periodic: false,
      leaseLengthDescription: '6 months',
    },
    rent: {
      weeklyRent: 400,
      platformFeePercent: 0,
      totalWeekly: 400,
      paymentMethod: 'Direct deposit - Account name: Quinn Lee; BSB: 062-000; Account number: 11223344.',
      rentFrequency: 'weekly',
      paymentTimingDescription: 'Payable in advance each week.',
    },
    bond: { amount: 1600 },
    landlordAgent: null,
    urgentRepairsTradespeople: { electrician: null, plumber: null, other: null },
    electronicService: {
      landlordEmail: 'quinn@example.com',
      tenantEmail: 'alex@example.com',
      landlordConsentsToEmailService: true,
      tenantConsentsToEmailService: true,
    },
    lastRentIncreaseDate: null,
    landlordPostcode: '2112',
    premisesPostcode: '4101',
    rentPaymentBankDetails: {
      bsb: '062-000',
      accountNumber: LANDLORD.accountNumber,
      accountName: LANDLORD.accountName,
      bankName: LANDLORD.bankName,
    },
    rentPaymentPreference: 'bank_transfer',
    specialConditions: [],
    bookingNotes: null,
  }
}

function occupancyProps(address: string): OccupancyAgreementProps {
  return {
    documentId: 'extract-occupancy',
    generatedAt: '8 Nov 2026',
    serviceTier: 'listing',
    landlord: {
      fullName: 'Quinn Lee',
      companyName: null,
      addressLine: address,
      email: 'quinn@example.com',
      phone: '0400000000',
    },
    tenant: {
      fullName: 'Alex Resident',
      email: 'alex@example.com',
      phone: '0401000000',
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
    },
    premises: {
      addressLine: address,
      propertyType: 'private_room_landlord_on_site',
      roomType: 'Private room',
      furnished: true,
      linenSupplied: false,
      weeklyCleaningService: false,
    },
    term: {
      startDate: '2026-08-01',
      endDate: '2027-01-31',
      periodic: false,
      leaseLengthDescription: '6 months',
    },
    rent: {
      weeklyRent: 400,
      platformFeePercent: 0,
      totalWeekly: 400,
      paymentMethod: 'Direct credit (see clause 11)',
    },
    bond: { amount: 1600 },
    platformLegalName: 'Quinnvestments Pty Ltd',
    platformAcn: '675 990 968',
    platformTradingName: 'Quni Living',
    payout: {
      account_name: LANDLORD.accountName,
      bsb: LANDLORD.bsb,
      account_number: LANDLORD.accountNumber,
    },
    paymentReference: 'Alex Resident',
    schemeApplies: false,
    qldBondRemittancePreference: null,
    specialConditions: [],
    bookingNotes: null,
    houseRules: null,
  }
}

describe('landlord payee agreement extract', () => {
  it('prints landlord rent, Quni software wording, and the statutory bond route', async () => {
    const nswProps = buildNswResidentialTenancyAgreementPropsFromBooking({
      ...QUINN_ROBERT_FT6600_LISTING_INPUT,
      documentId: 'extract-ft6600',
    })
    const nswDoc = await loadOfficialNswFt6600Template()
    await prepareOfficialNswFt6600ScheduleForFlatten(nswDoc, nswProps)
    const nswForm = nswDoc.getForm()
    const nswRent = nswForm.getTextField(NSW.rent_payment_details).getText() ?? ''
    expect(nswRent).toContain('Quinn Lee')
    expect(nswRent).toContain('062 000')
    expect(nswRent).toContain('11223344')
    expect(nswForm.getCheckBox(NSW.bond_paid_to_rbo_cb).isChecked()).toBe(true)
    expect(nswForm.getCheckBox(NSW.bond_paid_to_landlord_cb).isChecked()).toBe(false)
    expect(nswForm.getCheckBox(NSW.bond_paid_to_agent_cb).isChecked()).toBe(false)

    const qldDoc = await loadOfficialQldForm18aTemplate()
    const { assignments: qldAssignments } = await applyOfficialQldForm18aScheduleFill(qldDoc, residentialProps())
    const qldAssigned = new Map(qldAssignments)
    const qldForm = qldDoc.getForm()
    const qldRent = [
      qldAssigned.get(QLD.Method1),
      qldAssigned.get(QLD.Method2),
      qldAssigned.get(QLD.Account_name),
      qldAssigned.get(QLD.BSB_number),
      qldAssigned.get(QLD.Account_number),
    ].join(' | ')
    expect(qldRent).toContain('Quinn Lee')
    expect(qldRent).toContain('11223344')
    expect(qldRent).not.toContain('Quni')

    const vicText = await pdfText(
      React.createElement(VicResidentialRentalAgreementForm1, residentialProps()),
    )
    expect(vicText).toContain('Quinn Lee')
    expect(vicText).toContain('062-000')
    expect(vicText).not.toContain('via the Quni Living platform')

    const nswAddendum = await pdfText(React.createElement(QuniPlatformAddendum, addendumProps('residential_tenancy')))
    const qldAddendum = await pdfText(
      React.createElement(QuniPlatformAddendumQld, addendumProps('residential_tenancy_qld')),
    )
    const vicAddendum = await pdfText(
      React.createElement(QuniPlatformAddendumVic, addendumProps('residential_tenancy_vic')),
    )
    assertClean('NSW addendum', nswAddendum)
    assertClean('QLD addendum', qldAddendum)
    assertClean('VIC addendum', vicAddendum)
    expect(nswAddendum).toContain('NSW Fair Trading (Rental Bonds Online)')
    expect(qldAddendum).toContain('Residential Tenancies Authority')
    expect(vicAddendum).toContain('Residential Tenancies Bond Authority')

    const nswOcc = await pdfText(React.createElement(NswLicenceToOccupyOnSite, occupancyProps('2 Demo Rd, Sydney NSW 2000')))
    const qldOcc = await pdfText(React.createElement(QldLicenceToOccupyOnSite, occupancyProps('2 Demo Rd, Brisbane QLD 4000')))
    const vicOcc = await pdfText(React.createElement(VicLicenceToOccupyOnSite, occupancyProps('2 Demo Rd, Melbourne VIC 3000')))
    for (const [label, text] of [
      ['NSW occupancy', nswOcc],
      ['QLD occupancy', qldOcc],
      ['VIC occupancy', vicOcc],
    ] as const) {
      for (const banned of BANNED) {
        expect(text, `${label} contains ${banned}`).not.toContain(banned)
      }
      expect(text, label).toContain('The resident pays Quni Living nothing')
      expect(text).toContain('Quinn Lee')
      expect(text).toContain('11223344')
    }
    expect(qldOcc).toContain('held by the RTA')
    expect(qldOcc).not.toContain('conduit')
    expect(nswOcc).toContain('not lodged with NSW Fair Trading')
    expect(vicOcc).toContain('held directly by the owner')
    expect(vicOcc).toContain('not lodged with any statutory bond authority')

    const sections = {
      nswRent,
      nswBond: `RBO ${nswForm.getCheckBox(NSW.bond_paid_to_rbo_cb).isChecked()} landlord ${nswForm.getCheckBox(NSW.bond_paid_to_landlord_cb).isChecked()} agent ${nswForm.getCheckBox(NSW.bond_paid_to_agent_cb).isChecked()} amount ${nswForm.getTextField(NSW.bond_amount).getText()}`,
      nswQuni: windowAround(nswAddendum, 'Quni Living is software'),
      nswAddendumBond: windowAround(nswAddendum, 'The tenant pays the bond'),
      qldRent,
      qldBondAmount: qldForm.getTextField(QLD.Rental_bond_amount).getText(),
      qldQuni: windowAround(qldAddendum, 'Quni Living is software'),
      qldAddendumBond: windowAround(qldAddendum, 'The tenant pays the bond'),
      vicRent: windowAround(vicText, 'Direct deposit', 0, 280),
      vicBond: windowAround(vicText, 'Bond amount', 0, 180),
      vicQuni: windowAround(vicAddendum, 'Quni Living is software'),
      vicAddendumBond: windowAround(vicAddendum, 'The tenant pays the bond'),
      nswOccQuni: windowAround(nswOcc, 'Quni Living is software'),
      nswOccBond: windowAround(nswOcc, 'not lodged'),
      qldOccQuni: windowAround(qldOcc, 'Quni Living is software'),
      qldOccBond: windowAround(qldOcc, 'held by the RTA'),
      vicOccQuni: windowAround(vicOcc, 'Quni Living is software'),
      vicOccBond: windowAround(vicOcc, 'not lodged'),
    }
    console.log(JSON.stringify(sections, null, 2))
  }, 60_000)
})
