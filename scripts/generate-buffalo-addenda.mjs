/**
 * Review PDFs for the 1/244 Buffalo Road listing addenda.
 * Not a production write. Output stays under docs/review.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import React from 'react'

globalThis.React = React

const { renderToBuffer } = await import('@react-pdf/renderer')
const { QuniPlatformAddendum } = await import('../src/lib/documents/QuniPlatformAddendum.tsx')
const { QuniPlatformAddendumQld } = await import('../src/lib/documents/QuniPlatformAddendumQld.tsx')
const { QuniPlatformAddendumVic } = await import('../src/lib/documents/vic/addendumGenerator.tsx')
const { resolvePropertyUtilities } = await import('../src/lib/propertyUtilitiesResolver.ts')
const { nswAddendumSampleProps, qldAddendumSampleProps, vicAddendumSampleProps } = await import(
  './agreement-sample-fixtures.mjs'
)

const resolution = resolvePropertyUtilities({
  featureNames: ['Bills included', 'WiFi'],
  waterUsageChargedSeparately: false,
  electricityEmbeddedNetwork: true,
  gasEmbeddedNetwork: true,
  waterSeparatelyMeteredEfficientAttestedAt: null,
  utilitiesServices: null,
})

function buffalo(base) {
  return {
    ...base,
    documentId: `${base.documentId}-buffalo`,
    landlord: {
      ...base.landlord,
      fullName: 'Quinn Lee',
      email: 'quinniele90@gmail.com',
      phone: '0410 025 719',
    },
    tenant: {
      ...base.tenant,
      fullName: 'Robert Saltalamacchia',
      email: 'rob@3thingsatonce.com.au',
    },
    premises: {
      ...base.premises,
      addressLine: '1/244 Buffalo Road, Ryde NSW 2112',
    },
    term: {
      ...base.term,
      startDate: '2026-12-28',
      endDate: '2027-03-27',
      periodic: false,
      leaseLengthDescription: '3 months',
    },
    utilitiesDescription: resolution.utilitiesDescription,
    billsIncluded: true,
    allInclusive: resolution.allInclusive,
    listingDisclosureLabels: resolution.listingDisclosureLabels,
    rentEnquiriesEmail: 'quinniele90@gmail.com',
    generalEnquiriesEmail: 'hello@quni.com.au',
    emergencyContact: 'Quinn Lee - 0410 025 719',
    houseCommunicationsChannel: '',
    houseRules: '',
  }
}

const outDir = join(process.cwd(), 'docs', 'review', '1-244-buffalo-road-addenda')
mkdirSync(outDir, { recursive: true })

const files = [
  ['nsw-addendum.pdf', QuniPlatformAddendum, buffalo(nswAddendumSampleProps())],
  ['qld-addendum.pdf', QuniPlatformAddendumQld, buffalo(qldAddendumSampleProps())],
  ['vic-addendum.pdf', QuniPlatformAddendumVic, buffalo(vicAddendumSampleProps())],
]

for (const [name, Component, props] of files) {
  const buf = await renderToBuffer(React.createElement(Component, props))
  const path = join(outDir, name)
  writeFileSync(path, buf)
  console.log(path)
}

console.log(resolution.utilitiesDescription)
