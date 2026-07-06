/**
 * Manual UI signing test — finalize after Rob signs both parties in browser.
 *
 * Run: node scripts/run-with-env.mjs node scripts/finalize-manual-ui-signing-test.mjs <submissionId>
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFParse } from 'pdf-parse'
import { getDocusealApiBase, getDocusealAuthHeaders } from '../api/lib/docuseal.shared.js'

const submissionId = Number(process.argv[2])
if (!submissionId) {
  console.error('usage: finalize-manual-ui-signing-test.mjs <submissionId>')
  process.exit(1)
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const spikeDir = path.join(root, 'scripts', 'test-official-form-spike')
const stamp = `manual-ui-${submissionId}`
const base = getDocusealApiBase()
const h = getDocusealAuthHeaders()

async function jfetch(pathname) {
  const res = await fetch(`${base}${pathname}`, { headers: h })
  const text = await res.text()
  if (!res.ok) throw new Error(`${pathname} ${res.status}: ${text.slice(0, 400)}`)
  return text ? JSON.parse(text) : null
}

const sm = await jfetch(`/api/submissions/${submissionId}`)
if (sm.status !== 'completed') {
  console.error(`Submission ${submissionId} status=${sm.status} — complete both parties in browser first.`)
  process.exit(1)
}

let combinedUrl = sm.combined_document_url
if (!combinedUrl) {
  const docs = await jfetch(`/api/submissions/${submissionId}/documents?merge=true`)
  combinedUrl = docs.documents?.[0]?.url
}
if (!combinedUrl) throw new Error('No executed PDF URL')

const pdfRes = await fetch(combinedUrl)
const executedBytes = Buffer.from(await pdfRes.arrayBuffer())
const executedPath = path.join(spikeDir, `nsw-ft6600-dryrun-executed-${stamp}.pdf`)
fs.writeFileSync(executedPath, executedBytes)

const parser = new PDFParse({ data: executedBytes })
const text = (await parser.getText()).text || ''
const info = await parser.getInfo()
await parser.destroy()

const slashDates = [...new Set(text.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g) || [])]
const usAmbiguous = slashDates.includes('07/06/2026')

const prefix = path.join(spikeDir, `nsw-ft6600-dryrun-p${stamp}`)
execSync(`pdftoppm -png -r 150 -f 17 -l 18 "${executedPath}" "${prefix}-ft6600-p"`, { stdio: 'pipe' })
const lastPage = info.total || 26
execSync(`pdftoppm -png -r 150 -f ${lastPage} -l ${lastPage} "${executedPath}" "${prefix}-addendum-p"`, { stdio: 'pipe' })

const p17Path = `${prefix}-ft6600-p-17.png`
const p17CropPath = path.join(spikeDir, `nsw-ft6600-dryrun-p${stamp}-ft6600-p-17-footer-crop.png`)

// Bottom ~22% of p17 for footer/audit legibility check
try {
  const { createCanvas, loadImage } = await import('canvas')
  const img = await loadImage(p17Path)
  const cropH = Math.round(img.height * 0.22)
  const canvas = createCanvas(img.width, cropH)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, img.height - cropH, img.width, cropH, 0, 0, img.width, cropH)
  fs.writeFileSync(p17CropPath, canvas.toBuffer('image/png'))
} catch (e) {
  console.warn('footer crop skipped:', e instanceof Error ? e.message : e)
}

// Cleanup spike orphans + this submission
const SPIKE_PREFIX = 'spike.nsw.ft6600'
const archived = []
for (let page = 0; page < 5; page++) {
  const q = new URLSearchParams({ q: SPIKE_PREFIX, limit: '100' })
  const body = await jfetch(`/api/submitters?${q}`)
  const rows = body.data ?? []
  const ids = [...new Set(rows.map((s) => s.submission_id).filter((id) => typeof id === 'number'))]
  for (const id of ids) {
    if (id === submissionId) continue
    const del = await fetch(`${base}/api/submissions/${id}`, {
      method: 'DELETE',
      headers: { ...h, 'Content-Type': 'application/json' },
    })
    if (del.ok) archived.push(id)
  }
  if (!body.pagination?.next || !rows.length) break
}

const delTest = await fetch(`${base}/api/submissions/${submissionId}`, {
  method: 'DELETE',
  headers: { ...h, 'Content-Type': 'application/json' },
})

const report = {
  phase: 'finalize',
  ranAt: new Date().toISOString(),
  submissionId,
  status: sm.status,
  slashDatesFound: slashDates,
  usFormat07_06_2026: usAmbiguous,
  paths: {
    executedPdf: path.relative(root, executedPath),
    ft6600_p17: path.relative(root, p17Path),
    ft6600_p18: path.relative(root, `${prefix}-ft6600-p-18.png`),
    addendum: path.relative(root, `${prefix}-addendum-p-${lastPage}.png`),
    p17_footer_crop: fs.existsSync(p17CropPath) ? path.relative(root, p17CropPath) : null,
  },
  pixelGate: {
    names: 'verify on p17 raster',
    signatures: 'verify FT6600 + addendum box sizing',
    dates: 'all signer dates DD/MM/YYYY on spanning lines; flag if 07/06/2026 appears',
    auditFooter: 'judge p17 footer crop — Fair Trading line legible under audit block',
    inkContainment:
      'zero signature or audit ink outside designated boxes on any page (p17, p18, addendum execution)',
  },
  cleanup: {
    archivedSpikeSubmissions: [...new Set(archived)],
    archivedThisTest: delTest.ok ? submissionId : `delete failed ${delTest.status}`,
  },
}

const reportPath = path.join(spikeDir, `nsw-manual-ui-test-finalize-${submissionId}.json`)
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
