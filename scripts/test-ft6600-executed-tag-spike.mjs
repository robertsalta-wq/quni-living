/**
 * Micro-spike: do {{...}} tag literals survive in the COMPLETED DocuSeal PDF?
 * Baseline: margin-anchor recipe on refined-b-v2.pdf (see docs/nsw/ft6600-acroform-mapping.md).
 *
 * Outputs: scripts/test-official-form-spike/executed-tag-spike-report.json
 * Deletes submission on success (or logs id for manual delete).
 */
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { PDFParse } from 'pdf-parse'
import { createDocusealSubmissionFromPdf } from '../api/lib/docuseal.shared.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outDir = path.join(__dirname, 'test-official-form-spike')

function loadEnv() {
  const vercel = path.join(root, '.env.vercel')
  const local = path.join(root, '.env.local')
  if (fs.existsSync(vercel)) dotenv.config({ path: vercel })
  if (fs.existsSync(local)) dotenv.config({ path: local, override: true })
  process.env.DOCUSEAL_SEND_EMAIL = 'false'
}

function docusealBase() {
  let base = (process.env.DOCUSEAL_API_URL || '').trim().replace(/\/$/, '')
  if (base.endsWith('/api')) base = base.slice(0, -4)
  return base
}

async function buildMarginAnchorPdf() {
  const v2Path = path.join(outDir, 'refined-b-v2.pdf')
  if (!fs.existsSync(v2Path)) {
    throw new Error(`Missing ${v2Path} - run refined-B spike first`)
  }
  const doc = await PDFDocument.load(fs.readFileSync(v2Path))
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const page = doc.getPages()[16]
  page.drawText('{{Landlord Signature;role=First Party;type=signature}}', {
    x: 12,
    y: 18,
    size: 14,
    font,
    color: rgb(0, 0, 0),
  })
  page.drawText('{{Tenant Signature;role=Second Party;type=signature}}', {
    x: 12,
    y: 34,
    size: 14,
    font,
    color: rgb(0, 0, 0),
  })
  return Buffer.from(await doc.save({ useObjectStreams: false }))
}

async function pdfTagScan(buf, label) {
  const parser = new PDFParse({ data: buf })
  const result = await parser.getText()
  await parser.destroy()
  const text = result.text || ''
  const curly = (text.match(/\{\{/g) || []).length
  const landlordSig = (text.match(/Landlord Signature/g) || []).length
  const tenantSig = (text.match(/Tenant Signature/g) || []).length
  const roleFirst = text.includes('role=First Party')
  return { label, curlyCount: curly, landlordSigMentions: landlordSig, tenantSigMentions: tenantSig, hasRoleSyntax: roleFirst, sample: text.slice(-1200) }
}

async function completeSubmitter(submitterId) {
  const base = docusealBase()
  const token = (process.env.DOCUSEAL_API_TOKEN || '').trim()
  const res = await fetch(`${base}/api/submitters/${submitterId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
    body: JSON.stringify({ completed: true, send_email: false }),
  })
  if (!res.ok) {
    throw new Error(`complete submitter ${submitterId}: ${res.status} ${await res.text()}`)
  }
  return res.json()
}

async function downloadCompletedPdf(submissionId) {
  const base = docusealBase()
  const token = (process.env.DOCUSEAL_API_TOKEN || '').trim()
  const subRes = await fetch(`${base}/api/submissions/${submissionId}`, {
    headers: { 'X-Auth-Token': token },
  })
  const sub = await subRes.json()
  const combined = sub.combined_document_url
  let url = typeof combined === 'string' && combined.startsWith('http') ? combined : null
  if (!url) {
    const docRes = await fetch(`${base}/api/submissions/${submissionId}/documents?merge=true`, {
      headers: { 'X-Auth-Token': token },
    })
    const docs = await docRes.json()
    const first = Array.isArray(docs) ? docs[0] : docs?.documents?.[0]
    url = first?.url || first?.download_url
  }
  if (!url) throw new Error('No completed PDF URL')
  const pdfRes = await fetch(url)
  if (!pdfRes.ok) throw new Error(`Download PDF ${pdfRes.status}`)
  return Buffer.from(await pdfRes.arrayBuffer())
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
  fs.mkdirSync(outDir, { recursive: true })

  const sourcePdf = await buildMarginAnchorPdf()
  const sourcePath = path.join(outDir, 'executed-spike-source.pdf')
  fs.writeFileSync(sourcePath, sourcePdf)

  const sourceScan = await pdfTagScan(sourcePdf, 'source-upload')

  const sub = await createDocusealSubmissionFromPdf({
    name: 'FT6600 executed tag spike',
    documents: [{ name: 'ft6600-tag-spike.pdf', file: sourcePdf.toString('base64') }],
    landlord: { name: 'Spike Landlord', email: 'spike.executed.landlord@example.com' },
    tenant: { name: 'Spike Tenant', email: 'spike.executed.tenant@example.com' },
    submitterSignReason: false,
  })

  const submissionId = sub.id
  const submitters = Array.isArray(sub.submitters) ? sub.submitters : []
  const fieldCount = Array.isArray(sub.fields) ? sub.fields.length : 0

  for (const s of submitters) {
    if (s.id == null) continue
    await completeSubmitter(s.id)
  }

  await new Promise((r) => setTimeout(r, 2000))

  const executedBuf = await downloadCompletedPdf(submissionId)
  const executedPath = path.join(outDir, 'executed-spike-completed.pdf')
  fs.writeFileSync(executedPath, executedBuf)
  const executedScan = await pdfTagScan(executedBuf, 'executed-download')

  const tagsStripped =
    sourceScan.curlyCount > 0 &&
    executedScan.curlyCount === 0 &&
    !executedScan.hasRoleSyntax

  const report = {
    ranAt: new Date().toISOString(),
    submissionId,
    submitters: submitters.map((s) => ({ id: s.id, role: s.role, email: s.email })),
    fieldCount,
    sourceScan,
    executedScan,
    verdict: tagsStripped
      ? 'OPTION_0 - tags consumed on completion; margin-anchor recipe ships (source-only cosmetic)'
      : 'TAGS_PERSIST - need white/appendix/strip options from micro-spike brief',
    paths: { sourcePath, executedPath },
    deleteSubmissionId: submissionId,
  }

  const reportPath = path.join(outDir, 'executed-tag-spike-report.json')
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)

  console.log(JSON.stringify(report, null, 2))
  console.log('\nDeleting test submission', submissionId)
  await deleteSubmission(submissionId)
  console.log('Wrote', reportPath)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
