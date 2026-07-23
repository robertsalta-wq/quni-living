/**
 * Create two-doc spike submission and save fields snapshot (no completion).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import React from 'react'

globalThis.React = React
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const spikeDir = path.join(root, 'scripts', 'test-official-form-spike')

const { buildNswResidentialTenancyAgreementPropsFromBooking } = await import(
  '../api/lib/documents/buildNswFt6600AgreementProps.ts'
)
const { QUINN_ROBERT_FT6600_LISTING_INPUT } = await import(
  '../api/lib/documents/quinnRobertFt6600Fixture.ts'
)
const { buildOfficialNswFt6600PdfWithSigning } = await import(
  '../api/lib/documents/officialNswFt6600Signing.ts'
)
const { createDocusealSubmissionFromPdf } = await import('../api/lib/docuseal.shared.js')
const { renderToBuffer } = await import('@react-pdf/renderer')
const { QuniPlatformAddendum } = await import('../src/lib/documents/QuniPlatformAddendum.tsx')

function addendumProps(rtaProps) {
  return {
    documentId: rtaProps.documentId,
    generatedAt: rtaProps.generatedAt,
    landlord: rtaProps.landlord,
    tenant: rtaProps.tenant,
    premises: rtaProps.premises,
    term: rtaProps.term,
    rent: rtaProps.rent,
    bond: rtaProps.bond,
    utilitiesDescription: 'Test',
    signingPackage: 'residential_tenancy',
    serviceTier: 'managed',
    allInclusive: true,
    billsIncluded: true,
    rentPaymentMethod: 'bank_transfer',
    bankDetails: { bsb: '000000', accountNumber: '1', accountName: 'X', bankName: 'B' },
    emergencyContact: '-',
    rentEnquiriesEmail: 'noreply-spike.quni.test@example.com',
    generalEnquiriesEmail: 'noreply-spike.quni.test@example.com',
    houseCommunicationsChannel: 'x',
    utilitiesCap: 0,
    houseRules: null,
    additionalTenantNames: [],
  }
}

const rtaProps = buildNswResidentialTenancyAgreementPropsFromBooking(QUINN_ROBERT_FT6600_LISTING_INPUT)
const built = await buildOfficialNswFt6600PdfWithSigning(rtaProps, { includeCoTenantSignatureTags: false })
const addendumBuffer = await renderToBuffer(
  React.createElement(QuniPlatformAddendum, addendumProps(rtaProps)),
)

let submission
let lastErr
for (let attempt = 1; attempt <= 4; attempt++) {
  try {
    submission = await createDocusealSubmissionFromPdf({
      name: `NSW fields snapshot attempt ${attempt}`,
      documents: [
        { name: 'NSW Residential Tenancy Agreement.pdf', file: Buffer.from(built.pdfBytes).toString('base64') },
        { name: 'Quni Platform Addendum.pdf', file: Buffer.from(addendumBuffer).toString('base64') },
      ],
      landlord: { name: 'Spike Landlord Dryrun', email: 'spike.nsw.ft6600.landlord.dryrun@example.com' },
      tenant: { name: 'Spike Tenant Dryrun', email: 'spike.nsw.ft6600.tenant.dryrun@example.com' },
      submitterSignReason: false,
    })
    break
  } catch (e) {
    lastErr = e
    console.warn(`create attempt ${attempt} failed`, e instanceof Error ? e.message : e)
    await new Promise((r) => setTimeout(r, 3000 * attempt))
  }
}
if (!submission) throw lastErr

const out = path.join(spikeDir, `nsw-ft6600-fields-snapshot-${submission.id}.json`)
fs.mkdirSync(spikeDir, { recursive: true })
fs.writeFileSync(
  out,
  JSON.stringify({ submissionId: submission.id, fields: submission.fields, submitters: submission.submitters }, null, 2),
)
console.log('saved', out)
console.log('field count', submission.fields?.length)
console.log(submission.fields?.map((f) => `${f.type}: ${f.name}`).join('\n'))
