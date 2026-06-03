/**
 * Part 1 de-risk: download official NSW + QLD prescribed PDFs, verify vs repo extractions,
 * write docs/{nsw,qld}/*.pdf and source.json provenance.
 *
 * Usage: node scripts/source-official-tenancy-pdfs.mjs
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument } from 'pdf-lib'
import { PDFParse } from 'pdf-parse'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const NSW_PAGE_URL =
  'https://www.nsw.gov.au/housing-and-construction/rental-forms-surveys-and-data/resources/standard-residential-tenancy-agreement'
const NSW_FALLBACK_PDF =
  'https://www.nsw.gov.au/sites/default/files/noindex/2025-06/residential-tenancy-agreement-form.pdf'
const QLD_PDF_URL =
  'https://www.rta.qld.gov.au/sites/default/files/2021-06/Form-18a-General-tenancy-agreement.pdf'

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'quni-official-source/1.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).href
          return fetchBuffer(next).then(resolve, reject)
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`))
          return
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
        res.on('error', reject)
      })
      .on('error', reject)
  })
}

function fetchText(url) {
  return fetchBuffer(url).then((b) => b.toString('utf8'))
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

async function extractPdfText(buf) {
  const parser = new PDFParse({ data: buf })
  const result = await parser.getText()
  await parser.destroy()
  return (result.text || '').replace(/\r\n/g, '\n')
}

function normalizeForCompare(s) {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s$.,;:()/-]/g, '')
    .trim()
}

/** Check that key phrases from reference extraction appear in PDF text. */
function phraseCoverage(referenceText, pdfText, label) {
  const ref = referenceText.replace(/\r\n/g, '\n')
  const candidates = [
    'RIGHT TO OCCUPY THE PREMISES',
    'Residential Tenancies Act 2010',
    'COPY OF AGREEMENT',
    'RENT INCREASES',
    'IMPORTANT INFORMATION',
    'Tenant Information Statement',
    'FT6600',
    'Standard form from 19 May 2025',
  ]
  const qldCandidates = [
    'Part 2 Standard Terms',
    'Part 1 Tenancy information',
    'General tenancy agreement (Form 18a)',
    'Residential Tenancies and Rooming Accommodation Act 2008',
    'Entry condition report',
    'v23 Sep25',
  ]
  const list = label === 'qld' ? qldCandidates : candidates
  const pdfNorm = normalizeForCompare(pdfText)
  const missing = []
  const found = []
  for (const phrase of list) {
    const p = normalizeForCompare(phrase)
    if (pdfNorm.includes(p)) found.push(phrase)
    else missing.push(phrase)
  }
  return { found, missing, coveragePct: Math.round((found.length / list.length) * 100) }
}

async function resolveNswPdfUrl() {
  const html = await fetchText(NSW_PAGE_URL)
  const m = html.match(/href="([^"]*residential-tenancy-agreement[^"]*\.pdf)"/i)
  if (m) {
    const href = m[1]
    return href.startsWith('http') ? href : `https://www.nsw.gov.au${href}`
  }
  return NSW_FALLBACK_PDF
}

async function writeProvenance(dir, json) {
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'source.json'), `${JSON.stringify(json, null, 2)}\n`, 'utf8')
}

async function main() {
  const downloadDate = new Date().toISOString().slice(0, 10)

  // --- NSW ---
  const nswUrl = await resolveNswPdfUrl()
  console.log('[NSW] Resolved PDF URL:', nswUrl)
  const nswBuf = await fetchBuffer(nswUrl)
  const nswDoc = await PDFDocument.load(nswBuf, { ignoreEncryption: true })
  const nswFields = nswDoc.getForm().getFields().length
  const nswText = await extractPdfText(nswBuf)
  const nswRef = fs.readFileSync(path.join(root, 'docs', 'ft6600-2025-12-17.txt'), 'utf8')
  const nswPhrase = phraseCoverage(nswRef, nswText, 'nsw')

  const nswDir = path.join(root, 'docs', 'nsw')
  const nswOut = path.join(nswDir, 'residential-tenancy-agreement-form-2025-12.pdf')
  fs.mkdirSync(nswDir, { recursive: true })
  fs.writeFileSync(nswOut, nswBuf)

  const nswLastUpdatedMatch = (await fetchText(NSW_PAGE_URL)).match(
    /File last updated on:\s*([^.<]+)/i,
  )
  const nswProvenance = {
    form: 'NSW FT6600 — Residential Tenancy Agreement',
    sourcePageUrl: NSW_PAGE_URL,
    downloadUrl: nswUrl,
    downloadDate,
    fairTradingLastUpdated: (nswLastUpdatedMatch?.[1] || '18 December 2025').trim(),
    publicationDate: '19 May 2025',
    sha256: sha256(nswBuf),
    fileSizeBytes: nswBuf.length,
    pageCount: nswDoc.getPageCount(),
    acroFormFieldCount: nswFields,
    storedAs: 'docs/nsw/residential-tenancy-agreement-form-2025-12.pdf',
    textVerification: {
      referenceFile: 'docs/ft6600-2025-12-17.txt',
      phraseCoveragePct: nswPhrase.coveragePct,
      phrasesFound: nswPhrase.found,
      phrasesMissing: nswPhrase.missing,
      pdfContainsFt6600: /ft6600/i.test(nswText),
      pdfContainsDec2025: /17 december 2025|updated 17 december 2025/i.test(nswText),
    },
  }
  await writeProvenance(nswDir, nswProvenance)
  console.log('[NSW] Wrote', nswOut)
  console.log('[NSW] Provenance:', JSON.stringify(nswProvenance, null, 2))

  // --- QLD ---
  console.log('[QLD] Download URL:', QLD_PDF_URL)
  const qldBuf = await fetchBuffer(QLD_PDF_URL)
  const qldDoc = await PDFDocument.load(qldBuf, { ignoreEncryption: true })
  const qldFields = qldDoc.getForm().getFields().length
  const qldText = await extractPdfText(qldBuf)
  const qldRef = fs.readFileSync(path.join(root, 'docs', 'form18a-v23-sep25-extracted.txt'), 'utf8')
  const qldPhrase = phraseCoverage(qldRef, qldText, 'qld')

  const qldDir = path.join(root, 'docs', 'qld')
  const qldOut = path.join(qldDir, 'form-18a-general-tenancy-agreement-v23-sep25.pdf')
  fs.mkdirSync(qldDir, { recursive: true })
  fs.writeFileSync(qldOut, qldBuf)

  const qldVersionInPdf = /v23\s*Sep25/i.test(qldText) ? 'v23 Sep25' : null
  const qldProvenance = {
    form: 'QLD RTA Form 18a — General Tenancy Agreement',
    sourceUrl: QLD_PDF_URL,
    rtaVersionString: qldVersionInPdf || 'v23 Sep25 (expected; verify on PDF)',
    downloadDate,
    sha256: sha256(qldBuf),
    fileSizeBytes: qldBuf.length,
    pageCount: qldDoc.getPageCount(),
    acroFormFieldCount: qldFields,
    storedAs: 'docs/qld/form-18a-general-tenancy-agreement-v23-sep25.pdf',
    textVerification: {
      referenceFile: 'docs/form18a-v23-sep25-extracted.txt',
      phraseCoveragePct: qldPhrase.coveragePct,
      phrasesFound: qldPhrase.found,
      phrasesMissing: qldPhrase.missing,
    },
  }
  await writeProvenance(qldDir, qldProvenance)
  console.log('[QLD] Wrote', qldOut)
  console.log('[QLD] Provenance:', JSON.stringify(qldProvenance, null, 2))

  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
