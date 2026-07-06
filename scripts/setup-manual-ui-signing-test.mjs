/**
 * Manual UI signing test — setup only (Rob signs in browser).
 *
 * Creates FT6600 + addendum from fixture, both parties → rob@quni.com.au,
 * snapshots create.fields, reports required-ness + signing links. Does NOT complete.
 *
 * Run: node scripts/run-with-env.mjs npx tsx scripts/setup-manual-ui-signing-test.mjs
 *
 * After Rob signs both parties:
 *   node scripts/run-with-env.mjs node scripts/finalize-manual-ui-signing-test.mjs <submissionId>
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import React from 'react'

globalThis.React = React

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const spikeDir = path.join(root, 'scripts', 'test-official-form-spike')

const ROB_EMAIL = 'rob@quni.com.au'
const FIRST_PARTY = { name: 'Rob UI Test (Landlord)', email: ROB_EMAIL }
const SECOND_PARTY = { name: 'Rob UI Test (Tenant)', email: ROB_EMAIL }

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

function buildAddendumPropsFromRta(rtaProps) {
  return {
    documentId: `manual-ui-test-${Date.now()}`,
    generatedAt: rtaProps.generatedAt,
    landlord: rtaProps.landlord,
    tenant: rtaProps.tenant,
    premises: rtaProps.premises,
    term: rtaProps.term,
    rent: rtaProps.rent,
    bond: rtaProps.bond,
    utilitiesDescription:
      'Electricity, gas, water, internet and waste services as agreed between the parties and as described on the property listing where applicable.',
    signingPackage: 'residential_tenancy',
    rentPaymentMethod: 'bank_transfer',
    bankDetails: {
      bsb: '939200',
      accountNumber: '823175945',
      accountName: 'SPIKE DRYRUN PTY LTD',
      bankName: 'Bank',
    },
    emergencyContact: '-',
    rentEnquiriesEmail: 'noreply-spike.quni.test@example.com',
    generalEnquiriesEmail: 'noreply-spike.quni.test@example.com',
    houseCommunicationsChannel: 'Property WhatsApp group (house-related only)',
    utilitiesCap: 0,
    houseRules: null,
    additionalTenantNames: rtaProps.additionalTenantNames ?? [],
  }
}

function analyzeRequiredness(fields) {
  const sigDate = (fields ?? []).filter((f) => f.type === 'signature' || f.type === 'date')
  const optional = sigDate.filter((f) => !f.required)
  const signatureAreaCounts = (fields ?? [])
    .filter((f) => f.type === 'signature')
    .map((f) => ({ name: f.name, areaCount: f.areas?.length ?? 0 }))
  return {
    totalFields: fields?.length ?? 0,
    signatureAndDateCount: sigDate.length,
    allSignatureAndDateRequired: optional.length === 0,
    optionalFields: optional.map((f) => ({ name: f.name, type: f.type, required: f.required })),
    signatureAreaCounts,
    allSignaturesSingleArea: signatureAreaCounts.every((f) => f.areaCount === 1),
    byField: sigDate.map((f) => ({
      name: f.name,
      type: f.type,
      required: f.required,
      format: f.preferences?.format ?? null,
      areaCount: f.areas?.length ?? 0,
    })),
  }
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
fs.mkdirSync(spikeDir, { recursive: true })

const rtaProps = buildNswResidentialTenancyAgreementPropsFromBooking(QUINN_ROBERT_FT6600_LISTING_INPUT)
const built = await buildOfficialNswFt6600PdfWithSigning(rtaProps, { includeCoTenantSignatureTags: false })
const addendumProps = buildAddendumPropsFromRta(rtaProps)
const addendumBuffer = await renderToBuffer(React.createElement(QuniPlatformAddendum, addendumProps))

let submission
let lastErr
for (let attempt = 1; attempt <= 4; attempt++) {
  try {
    submission = await createDocusealSubmissionFromPdf({
      name: `NSW manual UI signing test ${stamp}`,
      documents: [
        { name: 'NSW Residential Tenancy Agreement.pdf', file: Buffer.from(built.pdfBytes).toString('base64') },
        { name: 'Quni Platform Addendum.pdf', file: Buffer.from(addendumBuffer).toString('base64') },
      ],
      landlord: FIRST_PARTY,
      tenant: SECOND_PARTY,
      submitterSignReason: false,
    })
    break
  } catch (e) {
    lastErr = e
    console.warn(`create attempt ${attempt} failed:`, e instanceof Error ? e.message : e)
    await new Promise((r) => setTimeout(r, 3000 * attempt))
  }
}
if (!submission?.id) throw lastErr ?? new Error('DocuSeal create failed')

const submitters = submission.submitters ?? []
const firstParty = submitters.find((s) => s.role === 'First Party')
const secondParty = submitters.find((s) => s.role === 'Second Party')

const requiredness = analyzeRequiredness(submission.fields)

const report = {
  phase: 'setup',
  ranAt: new Date().toISOString(),
  submissionId: submission.id,
  signerEmail: ROB_EMAIL,
  note: 'Rob signs both parties in browser via embed_src links below. No production changes.',
  fieldDiscovery:
    'Fields snapshotted from POST /submissions/pdf response only — GET submitter returns template=null for one-off PDFs.',
  requirednessGate: {
    ...requiredness,
    singleAreaSignatures:
      'Landlord Signature and Tenant Signature must each have exactly 1 area after create (parser anchors coincident with widget tags).',
    tagSyntaxIfOptional:
      'DocuSeal supports optional required= in text tags, e.g. {{Landlord Sign Date;role=First Party;type=date;format=DD/MM/YYYY;required=true}} — not implemented until Rob confirms.',
  },
  signingLinks: {
    firstParty: {
      role: 'First Party',
      name: FIRST_PARTY.name,
      embed_src: firstParty?.embed_src ?? null,
      submitterId: firstParty?.id ?? null,
      instruction: 'Sign as landlord FIRST (preserved order). Draw signature; observe each date field.',
    },
    secondParty: {
      role: 'Second Party',
      name: SECOND_PARTY.name,
      embed_src: secondParty?.embed_src ?? null,
      submitterId: secondParty?.id ?? null,
      instruction: 'After First Party completes, open this link. Sign as tenant; observe date auto-fill/format.',
    },
  },
  fields: submission.fields,
  submitters: submission.submitters,
  paths: {
    fieldsSnapshot: `scripts/test-official-form-spike/nsw-manual-ui-test-fields-${submission.id}.json`,
    setupReport: `scripts/test-official-form-spike/nsw-manual-ui-test-setup-${submission.id}.json`,
  },
  nextStep:
    'After Rob completes both parties: node scripts/run-with-env.mjs node scripts/finalize-manual-ui-signing-test.mjs ' +
    submission.id,
}

const fieldsPath = path.join(spikeDir, `nsw-manual-ui-test-fields-${submission.id}.json`)
const reportPath = path.join(spikeDir, `nsw-manual-ui-test-setup-${submission.id}.json`)
fs.writeFileSync(fieldsPath, JSON.stringify({ submissionId: submission.id, fields: submission.fields, submitters: submission.submitters }, null, 2))
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

console.log(JSON.stringify(report, null, 2))
