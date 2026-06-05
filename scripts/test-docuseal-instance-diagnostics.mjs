/**
 * Instance vs pipeline diagnostics (no code changes).
 * Run: node scripts/test-docuseal-instance-diagnostics.mjs
 *
 * 1. Byte-identical green artifact (executed-spike-source.pdf = submission 87 upload)
 * 2. Known-good react-pdf sample (public/agreement-samples/nsw-t2-ft6600-tenancy-agreement.pdf)
 *
 * Uses raw API POST - does NOT run pdf-lib reencode (unlike createDocusealSubmissionFromPdf).
 * DOCUSEAL_SEND_EMAIL=false. Deletes created submissions when done.
 */
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

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

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

/** Submit exact file bytes - no reencode. */
async function submitExactBytes(label, filePath, { coTenant = false } = {}) {
  const buf = fs.readFileSync(filePath)
  const base = docusealBase()
  const token = (process.env.DOCUSEAL_API_TOKEN || '').trim()
  const url = `${base}/api/submissions/pdf`

  const submitters = [
    { role: 'Landlord', email: 'diag.landlord@example.com', name: 'Diag Landlord' },
    { role: 'Tenant', email: 'diag.tenant@example.com', name: 'Diag Tenant' },
  ]
  if (coTenant) {
    submitters.push({ role: 'Co-tenant', email: 'diag.cotenant@example.com', name: 'Diag Co-Tenant' })
  }

  const body = {
    name: `instance-diag - ${label}`,
    order: 'preserved',
    send_email: false,
    documents: [{ name: path.basename(filePath), file: buf.toString('base64') }],
    submitters,
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let parsed = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = null
  }
  if (!res.ok) {
    return {
      label,
      filePath,
      sha256: sha256(buf),
      byteLength: buf.length,
      error: `${res.status} ${text}`,
    }
  }

  const submittersOut = Array.isArray(parsed.submitters) ? parsed.submitters : []
  const fields = Array.isArray(parsed.fields) ? parsed.fields : []

  return {
    label,
    filePath,
    sha256: sha256(buf),
    byteLength: buf.length,
    submissionId: parsed.id,
    httpStatus: res.status,
    submitterCount: submittersOut.length,
    submitterRoles: submittersOut.map((s) => s.role),
    fieldCount: fields.length,
    signatureFieldCount: fields.filter((f) => f.type === 'signature' || f.type === 'date').length,
    reencoded: false,
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

async function main() {
  loadEnv()

  const greenArtifact = path.join(
    __dirname,
    'test-official-form-spike',
    'executed-spike-source.pdf',
  )
  const reactPdfSample = path.join(
    root,
    'public',
    'agreement-samples',
    'nsw-t2-ft6600-tenancy-agreement.pdf',
  )

  if (!fs.existsSync(greenArtifact)) {
    throw new Error(`Missing green artifact: ${greenArtifact}`)
  }
  if (!fs.existsSync(reactPdfSample)) {
    throw new Error(`Missing react-pdf sample: ${reactPdfSample}`)
  }

  const report = {
    ranAt: new Date().toISOString(),
    docusealUrl: docusealBase(),
    note: 'Submission 87 used executed-spike-source.pdf (refined-b-v2 + margin anchors, useObjectStreams:false). Historical: 2 submitters, 7 fields.',
    tests: [],
    purgeReminder: 'Delete submissions 88–91 in DocuSeal admin if still present.',
  }

  const t1 = await submitExactBytes('green-artifact-sub87', greenArtifact)
  report.tests.push(t1)
  if (t1.submissionId) await deleteSubmission(t1.submissionId)

  const t2 = await submitExactBytes('react-pdf-nsw-t2-sample', reactPdfSample)
  report.tests.push(t2)
  if (t2.submissionId) await deleteSubmission(t2.submissionId)

  // Optional: same green bytes WITH co-tenant API role (3 requested submitters)
  const t3 = await submitExactBytes('green-artifact-3-api-submitters', greenArtifact, { coTenant: true })
  report.tests.push(t3)
  if (t3.submissionId) await deleteSubmission(t3.submissionId)

  console.log(JSON.stringify(report, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
