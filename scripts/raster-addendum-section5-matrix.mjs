/**
 * Pixel review: Section 5 matrix × NSW/QLD/VIC at 300dpi.
 *
 * Run: npx tsx scripts/raster-addendum-section5-matrix.mjs
 * Output: scripts/test-official-form-spike/section5-matrix/ (gitignored)
 *
 * Cases:
 *   1 managed_all_inclusive_cap — Managed + allInclusive + cap > 0
 *   2 listing_bills_included — Listing + bills included (must NOT show Managed cap language)
 *   3 listing_tenant_pays — Listing + tenant pays
 *   4 managed_tenant_pays — Managed + not all-inclusive
 */
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import React from 'react'

globalThis.React = React

const { renderToBuffer } = await import('@react-pdf/renderer')
const { QuniPlatformAddendum } = await import('../src/lib/documents/QuniPlatformAddendum.tsx')
const { QuniPlatformAddendumQld } = await import('../src/lib/documents/QuniPlatformAddendumQld.tsx')
const { QuniPlatformAddendumVic } = await import('../src/lib/documents/vic/addendumGenerator.tsx')

const OUT = join(process.cwd(), 'scripts/test-official-form-spike/section5-matrix')
mkdirSync(OUT, { recursive: true })

function baseProps(overrides) {
  return {
    documentId: 'section5-matrix',
    generatedAt: '23 Jul 2026, 7:00:00 pm',
    landlord: {
      fullName: 'Jordan Landlord',
      companyName: null,
      addressLine: '1 Provider St, Suburb ST 2000',
      email: 'landlord@example.com',
      phone: '0400 000 000',
    },
    tenant: {
      fullName: 'Sam Tenant',
      email: 'tenant@example.com',
      phone: '0401 000 000',
      dateOfBirth: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
    },
    premises: {
      addressLine: '2 Renter Rd, Suburb ST 2001',
      propertyType: 'private_room_landlord_off_site',
      roomType: 'Private room',
      furnished: true,
      linenSupplied: false,
      weeklyCleaningService: false,
    },
    term: {
      startDate: '2026-08-01',
      endDate: '2027-07-31',
      periodic: false,
      leaseLengthDescription: '52 weeks',
    },
    rent: {
      weeklyRent: 400,
      platformFeePercent: 10,
      totalWeekly: 440,
      paymentMethod: 'Bank transfer',
    },
    bond: { amount: 1600 },
    rentPaymentMethod: 'bank_transfer',
    bankDetails: {
      bsb: '123456',
      accountNumber: '12345678',
      accountName: 'Trust Account',
      bankName: 'Example Bank',
    },
    emergencyContact: '000',
    rentEnquiriesEmail: 'rent@quni.com.au',
    generalEnquiriesEmail: 'hello@quni.com.au',
    houseCommunicationsChannel: 'Property WhatsApp group',
    houseRules: null,
    ...overrides,
  }
}

const CASES = [
  {
    id: '01-managed-all-inclusive-cap',
    props: {
      serviceTier: 'managed',
      allInclusive: true,
      billsIncluded: true,
      utilitiesCap: 300,
      utilitiesDescription:
        'Electricity, gas and water usage are included in the rent. Internet and waste services as described on the property listing.',
      listingDisclosureLabels: ['Bills included', 'Water included in rent'],
    },
  },
  {
    id: '02-listing-bills-included',
    props: {
      serviceTier: 'listing',
      allInclusive: true,
      billsIncluded: true,
      utilitiesCap: null,
      utilitiesDescription:
        'Electricity, gas and water usage are included in the rent. Internet and waste services as described on the property listing.',
      listingDisclosureLabels: ['Bills included', 'Water included in rent'],
    },
  },
  {
    id: '03-listing-tenant-pays',
    props: {
      serviceTier: 'listing',
      allInclusive: false,
      billsIncluded: false,
      utilitiesCap: null,
      utilitiesDescription: 'Tenant pays electricity (individually metered). Tenant pays gas (individually metered).',
      listingDisclosureLabels: [
        'Tenant pays electricity (individually metered)',
        'Tenant pays gas (individually metered)',
      ],
    },
  },
  {
    id: '04-managed-tenant-pays',
    props: {
      serviceTier: 'managed',
      allInclusive: false,
      billsIncluded: false,
      utilitiesCap: 300,
      utilitiesDescription: 'Tenant pays electricity (individually metered).',
      listingDisclosureLabels: ['Tenant pays electricity (individually metered)'],
    },
  },
]

const PACKAGES = [
  {
    state: 'nsw',
    signingPackage: 'residential_tenancy',
    Component: QuniPlatformAddendum,
  },
  {
    state: 'qld',
    signingPackage: 'residential_tenancy_qld',
    Component: QuniPlatformAddendumQld,
  },
  {
    state: 'vic',
    signingPackage: 'residential_tenancy_vic',
    Component: QuniPlatformAddendumVic,
  },
]

function checkPdftoppm() {
  try {
    execSync('pdftoppm -v', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    return true
  } catch (e) {
    const msg = `${e?.stderr ?? ''}${e?.stdout ?? ''}${e?.message ?? ''}`
    if (/pdftoppm/i.test(msg)) return true
    return false
  }
}

if (!checkPdftoppm()) {
  console.error('pdftoppm not available — install poppler')
  process.exit(1)
}

const index = []

for (const pkg of PACKAGES) {
  for (const c of CASES) {
    const props = baseProps({ ...c.props, signingPackage: pkg.signingPackage, documentId: `${pkg.state}-${c.id}` })
    const buf = await renderToBuffer(React.createElement(pkg.Component, props))
    const stem = `${pkg.state}-${c.id}`
    const pdfPath = join(OUT, `${stem}.pdf`)
    writeFileSync(pdfPath, buf)
    const pngPrefix = join(OUT, stem)
    execSync(`pdftoppm -png -r 300 "${pdfPath}" "${pngPrefix}"`, { stdio: 'inherit' })
    const pngs = readdirSync(OUT)
      .filter((f) => f.startsWith(stem) && f.endsWith('.png'))
      .sort()
    index.push({ state: pkg.state, caseId: c.id, pdf: `${stem}.pdf`, pages: pngs })
    console.log('wrote', stem, 'pages', pngs.length)
  }
}

writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 2))
console.log('Done. Review PNGs under', OUT)
