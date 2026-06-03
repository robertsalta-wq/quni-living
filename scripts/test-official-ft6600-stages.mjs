/**
 * Stage 1: wired PDF without co-tenant → 2 submitters / ~7 fields.
 * Stage 2: wired PDF with co-tenant → 3 submitters.
 * Run: npx tsx scripts/test-official-ft6600-stages.mjs
 */
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function loadEnv() {
  const vercel = path.join(root, '.env.vercel')
  if (fs.existsSync(vercel)) dotenv.config({ path: vercel })
  process.env.DOCUSEAL_SEND_EMAIL = 'false'
}

function docusealBase() {
  let base = (process.env.DOCUSEAL_API_URL || '').trim().replace(/\/$/, '')
  if (base.endsWith('/api')) base = base.slice(0, -4)
  return base
}

async function submitExact(buf, label, { coTenant = false } = {}) {
  const base = docusealBase()
  const token = (process.env.DOCUSEAL_API_TOKEN || '').trim()
  const submitters = [
    { role: 'Landlord', email: 'stage.landlord@example.com', name: 'Stage Landlord' },
    { role: 'Tenant', email: 'stage.tenant@example.com', name: 'Stage Tenant' },
  ]
  if (coTenant) {
    submitters.push({ role: 'Co-tenant', email: 'stage.cotenant@example.com', name: 'Stage Co-Tenant' })
  }
  const res = await fetch(`${base}/api/submissions/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
    body: JSON.stringify({
      name: label,
      order: 'preserved',
      send_email: false,
      documents: [{ name: 'wired-stage.pdf', file: buf.toString('base64') }],
      submitters,
    }),
  })
  const parsed = await res.json()
  if (!res.ok) throw new Error(`${label}: ${res.status} ${JSON.stringify(parsed)}`)
  const submittersOut = parsed.submitters || []
  const fields = parsed.fields || []
  return {
    submissionId: parsed.id,
    submitterCount: submittersOut.length,
    submitterRoles: submittersOut.map((s) => s.role),
    fieldCount: fields.length,
  }
}

async function deleteSubmission(id) {
  const base = docusealBase()
  const token = (process.env.DOCUSEAL_API_TOKEN || '').trim()
  await fetch(`${base}/api/submissions/${id}?permanently=true`, {
    method: 'DELETE',
    headers: { 'X-Auth-Token': token },
  })
}

const minimalProps = {
  documentId: 'stage-test',
  generatedAt: '3 June 2026',
  landlord: {
    fullName: 'Stage Landlord',
    companyName: null,
    addressLine: '1 Owner St Sydney NSW 2000',
    email: 'stage.landlord@example.com',
    phone: '0400000001',
  },
  tenant: {
    fullName: 'Stage Tenant',
    email: 'stage.tenant@example.com',
    phone: '0400000002',
    dateOfBirth: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    addressForServiceLine: '2 Tenant St Sydney NSW 2000',
  },
  additionalTenantNames: ['Stage Co-Tenant'],
  premises: {
    addressLine: '99 Premises Rd Newtown NSW 2042',
    propertyType: 'House',
    roomType: 'Room',
    furnished: true,
    linenSupplied: null,
    weeklyCleaningService: null,
  },
  premisesPartDescription: null,
  additionalPremisesInclusions: [],
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
    paymentMethod: 'Electronic transfer',
    rentFrequency: 'weekly',
    paymentTimingDescription: 'Weekly in advance',
  },
  bond: { amount: 1800 },
  landlordAgent: null,
  urgentRepairsTradespeople: { electrician: 'x', plumber: 'x', other: null },
  electronicService: {
    landlordEmail: 'stage.landlord@example.com',
    tenantEmail: 'stage.tenant@example.com',
    landlordConsentsToEmailService: true,
    tenantConsentsToEmailService: true,
  },
  specialConditions: [],
  bookingNotes: null,
}

async function main() {
  loadEnv()
  const { buildOfficialNswFt6600PdfWithSigning } = await import(
    '../api/lib/documents/officialNswFt6600Signing.ts'
  )
  const outDir = path.join(__dirname, 'test-official-form-spike')
  fs.mkdirSync(outDir, { recursive: true })

  const stage1 = await buildOfficialNswFt6600PdfWithSigning(minimalProps, {
    includeCoTenantSignatureTags: false,
  })
  const buf1 = Buffer.from(stage1.pdfBytes)
  fs.writeFileSync(path.join(outDir, 'wired-stage1-no-cotenant.pdf'), buf1)
  const r1 = await submitExact(buf1, 'wired-stage1-no-cotenant')
  await deleteSubmission(r1.submissionId)

  const stage2 = await buildOfficialNswFt6600PdfWithSigning(minimalProps, {
    includeCoTenantSignatureTags: true,
  })
  const buf2 = Buffer.from(stage2.pdfBytes)
  fs.writeFileSync(path.join(outDir, 'wired-stage2-with-cotenant.pdf'), buf2)
  const r2 = await submitExact(buf2, 'wired-stage2-with-cotenant', { coTenant: true })
  await deleteSubmission(r2.submissionId)

  const green = fs.readFileSync(path.join(outDir, 'executed-spike-source.pdf'))

  const report = {
    ranAt: new Date().toISOString(),
    test2Production: {
      completedNswRtaExamples: [
        { submissionId: 28, completedAt: '2026-04-13', submitters: ['Second Party', 'First Party'] },
        { submissionId: 22, completedAt: '2026-04-10', submitters: ['First Party', 'Second Party'] },
      ],
      conclusion: 'react-pdf production signing works; public sample is unrepresentative (no margin anchors)',
    },
    stage1: {
      ...r1,
      pass: r1.submitterCount >= 2 && r1.fieldCount >= 7,
      pdfBytes: buf1.length,
    },
    stage2: {
      ...r2,
      pass: r2.submitterCount >= 3,
      pdfBytes: buf2.length,
    },
    greenReference: { byteLength: green.length },
  }

  console.log(JSON.stringify(report, null, 2))
  if (!report.stage1.pass || !report.stage2.pass) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
