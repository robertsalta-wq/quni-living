import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { PDFParse } from 'pdf-parse'

const url = process.argv[2]
const outStamp = process.argv[3] || 'submission-142-burnin'
if (!url) {
  console.error('usage: download-and-raster.mjs <pdf-url> [stamp]')
  process.exit(1)
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const spikeDir = path.join(root, 'scripts', 'test-official-form-spike')

const res = await fetch(url)
const buf = Buffer.from(await res.arrayBuffer())
const pdfPath = path.join(spikeDir, `nsw-ft6600-dryrun-executed-${outStamp}.pdf`)
fs.writeFileSync(pdfPath, buf)

const parser = new PDFParse({ data: buf })
const text = (await parser.getText()).text || ''
const info = await parser.getInfo()
await parser.destroy()

const dates = [...new Set(text.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g) || [])]
const isoDates = [...new Set(text.match(/\b\d{4}-\d{2}-\d{2}\b/g) || [])]

let pdftoppm = { available: false }
try {
  const v = execSync('pdftoppm -v', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
  pdftoppm = { available: true, versionLine: (v || '').split('\n')[0] }
} catch (e) {
  pdftoppm.reason = e instanceof Error ? e.message : String(e)
}

const prefix = path.join(spikeDir, `nsw-ft6600-dryrun-p${outStamp}`)
const rasters = []
if (pdftoppm.available) {
  execSync(`pdftoppm -png -r 150 -f 17 -l 18 "${pdfPath}" "${prefix}-ft6600-p"`, { stdio: 'pipe' })
  const last = info.total || 26
  execSync(`pdftoppm -png -r 150 -f ${last} -l ${last} "${pdfPath}" "${prefix}-addendum-p"`, { stdio: 'pipe' })
  for (const p of [17, 18, last]) {
    for (const c of [`${prefix}-ft6600-p-${p}.png`, `${prefix}-addendum-p-${p}.png`]) {
      if (fs.existsSync(c)) rasters.push(path.relative(root, c))
    }
  }
}

console.log(
  JSON.stringify(
    {
      pdfPath: path.relative(root, pdfPath),
      totalPages: info.total,
      slashDates: dates,
      isoDates,
      pdftoppm,
      rasters,
    },
    null,
    2,
  ),
)
