/**
 * Wired-path smoke test: buildOfficialNswFt6600PdfWithSigning + DocuSeal submission.
 * Run: npx tsx scripts/test-official-ft6600-wired-signing.mjs
 * DOCUSEAL_SEND_EMAIL=false. Deletes submission when done.
 */
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFParse } from 'pdf-parse'
import { createDocusealSubmissionFromPdf } from '../api/lib/docuseal.shared.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function loadEnv() {
  const vercel = path.join(root, '.env.vercel')
  if (fs.existsSync(vercel)) dotenv.config({ path: vercel })
  process.env.DOCUSEAL_SEND_EMAIL = 'false'
}

async function main() {
  loadEnv()
  const { buildOfficialNswFt6600PdfWithSigning } = await import(
    '../api/lib/documents/officialNswFt6600Signing.ts'
  )

  const props = {
    documentId: 'wired-test',
    generatedAt: '3 June 2026, 10:00 am',
    landlord: {
      fullName: 'Wired Test Landlord',
      companyName: null,
      addressLine: '1 Owner Street, Sydney NSW 2000',
      email: 'landlord.wired@example.com',
      phone: '0400000001',
    },
    tenant: {
      fullName: 'Wired Test Tenant',
      email: 'tenant.wired@example.com',
      phone: '0400000002',
      dateOfBirth: null,
      emergencyContactName: 'Emergency Person',
      emergencyContactPhone: '0400000003',
      addressForServiceLine: '2 Tenant Street, Sydney NSW 2000',
    },
    additionalTenantNames: ['Wired Co-Tenant Person'],
    premises: {
      addressLine: '99 Premises Road, Newtown NSW 2042',
      propertyType: 'House',
      roomType: 'Room',
      furnished: true,
      linenSupplied: null,
      weeklyCleaningService: null,
    },
    premisesPartDescription: null,
    additionalPremisesInclusions: ['Furnished bedroom'],
    maxOccupantsPermitted: 3,
    term: {
      startDate: '2026-07-01',
      endDate: '2027-06-30',
      periodic: false,
      leaseLengthDescription: '12 months',
    },
    rent: {
      weeklyRent: 450,
      platformFeePercent: 0,
      totalWeekly: 450,
      paymentMethod: 'Electronic transfer per addendum',
      rentFrequency: 'weekly',
      paymentTimingDescription: 'Weekly in advance',
    },
    bond: { amount: 1800 },
    landlordAgent: null,
    urgentRepairsTradespeople: {
      electrician: 'Wired Test Landlord — 0400000001',
      plumber: 'Wired Test Landlord — 0400000001',
      other: null,
    },
    electronicService: {
      landlordEmail: 'landlord.wired@example.com',
      tenantEmail: 'tenant.wired@example.com',
      landlordConsentsToEmailService: true,
      tenantConsentsToEmailService: true,
    },
    billsIncluded: true,
    propertyCompliance: {
      smokeAlarmType: 'battery',
      smokeAlarmBatteryTenantReplaceable: false,
      smokeAlarmBatteryType: null,
      smokeAlarmBackupTenantReplaceable: null,
      smokeAlarmBackupBatteryType: null,
      strataOcResponsibleForAlarms: null,
      waterUsageChargedSeparately: false,
      electricityEmbeddedNetwork: false,
      gasEmbeddedNetwork: false,
      strataBylawsApplicable: false,
    },
    specialConditions: [],
    bookingNotes: null,
  }

  const built = await buildOfficialNswFt6600PdfWithSigning(props, { includeCoTenantSignatureTags: true })
  const pdfBuf = Buffer.from(built.pdfBytes)
  if (!pdfBuf.length) throw new Error('built PDF bytes empty')

  const outDir = path.join(__dirname, 'test-official-form-spike')
  fs.mkdirSync(outDir, { recursive: true })
  const pdfPath = path.join(outDir, 'wired-official-with-signing.pdf')
  fs.writeFileSync(pdfPath, pdfBuf)

  const pdfBase64 = pdfBuf.toString('base64')
  if (!pdfBase64.length) throw new Error('built PDF base64 empty')

  const parser = new PDFParse({ data: pdfBuf })
  const text = (await parser.getText()).text
  await parser.destroy()
  const curly = (text.match(/\{\{/g) || []).length

  const sub = await createDocusealSubmissionFromPdf({
    name: 'wired-official-ft6600-signing',
    pdfBase64,
    landlord: { name: 'Wired Test Landlord', email: 'landlord.wired@example.com' },
    tenant: { name: 'Wired Test Tenant', email: 'tenant.wired@example.com' },
    coTenant: { name: 'Wired Co-Tenant Person', email: 'cotenant.wired@example.com' },
    submitterSignReason: false,
  })

  const fields = sub.fields || []
  const sigFields = fields.filter((f) => f.type === 'signature' || f.type === 'date')

  const report = {
    hasDocusealTags: built.hasDocusealTags,
    tagCount: built.tagCount,
    curlyInSource: curly,
    submissionId: sub.id,
    submitters: (sub.submitters || []).map((s) => ({ role: s.role, email: s.email })),
    fieldCount: fields.length,
    signatureFields: sigFields.map((f) => ({
      name: f.name,
      type: f.type,
      page: f.areas?.[0]?.page,
      y: f.areas?.[0]?.y,
    })),
    pdfPath,
  }

  console.log(JSON.stringify(report, null, 2))

  if (sub.id) {
    let base = (process.env.DOCUSEAL_API_URL || '').trim().replace(/\/$/, '')
    if (base.endsWith('/api')) base = base.slice(0, -4)
    await fetch(`${base}/api/submissions/${sub.id}?permanently=true`, {
      method: 'DELETE',
      headers: { 'X-Auth-Token': (process.env.DOCUSEAL_API_TOKEN || '').trim() },
    })
    console.log('Deleted submission', sub.id)
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
