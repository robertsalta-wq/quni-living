/**
 * Freeze VIC CAV Form 1 .docx → canonical blank PDF (M2 overlay baseline).
 *
 * Freeze (one-time, requires Docker + pinned LO image digest):
 *   node scripts/freeze-vic-form1-blank.mjs
 *
 * Verify committed blank (Node-only, CI-safe — never reconverts):
 *   node scripts/freeze-vic-form1-blank.mjs --check
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { PDFDocument } from 'pdf-lib'
import { PDFParse } from 'pdf-parse'
import { phraseCoverage, VIC_FORM1_REGRESSION_PHRASES } from './lib/vic-form1-phrase-gate.mjs'
import {
  countEmbeddedImages,
  countImageMarkersInPdfBytes,
  normalizeVicForm1BlankPdfBytes,
  VIC_FORM1_BLANK_PDF_EPOCH_ISO,
  VIC_FORM1_BLANK_PDF_EPOCH_UNIX,
} from './lib/vic-form1-pdf-normalize.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const SOURCE_DOCX = path.join(root, 'docs', 'vic', 'form-1-residential-rental-agreement.docx')
const BLANK_PDF = path.join(root, 'docs', 'vic', 'form-1-blank.pdf')
const PROVENANCE_PATH = path.join(root, 'docs', 'vic', 'form-1-blank-provenance.json')
const SOURCE_JSON = path.join(root, 'docs', 'vic', 'source.json')
const RENDER_REPORT = path.join(root, 'scripts', 'test-official-form-spike', 'vic-form1-blank-render-diff.json')

/** Pinned linux/amd64 digest — update only after intentional LO toolchain bump + re-freeze. */
const LO_DOCKER_IMAGE =
  'lankalana/libreoffice-headless@sha256:b8548113edb08452a41d4ec337ce8202961203d8390ee60187f545ca1418cbe0'

const EXPECTED_PAGE_COUNT = 9
/** CAV reform date 2025-11-25 UTC (matches VIC_FORM1_BLANK_PDF_EPOCH_ISO). */
const SOURCE_DATE_EPOCH = String(VIC_FORM1_BLANK_PDF_EPOCH_UNIX)

const checkOnly = process.argv.includes('--check')

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

async function extractPdfText(buf) {
  const parser = new PDFParse({ data: buf })
  const result = await parser.getText()
  await parser.destroy()
  return (result.text || '').replace(/\r\n/g, '\n')
}

/**
 * @param {Uint8Array} bytes
 */
async function validateBlankPdf(bytes, opts = {}) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const pageCount = doc.getPageCount()
  if (pageCount !== EXPECTED_PAGE_COUNT) {
    throw new Error(`pageCount ${pageCount} !== ${EXPECTED_PAGE_COUNT}`)
  }
  let embeddedImageCount = countEmbeddedImages(doc)
  if (embeddedImageCount < 1) {
    embeddedImageCount = countImageMarkersInPdfBytes(bytes)
  }
  if (embeddedImageCount < 1) {
    throw new Error(`embeddedImageCount ${embeddedImageCount} < 1 (CAV logo expected)`)
  }
  const text = await extractPdfText(bytes)
  const phrases = phraseCoverage(text)
  if (phrases.coveragePct !== 100) {
    throw new Error(`phrase gate failed: missing ${phrases.missing.join(', ')}`)
  }
  if (!text.includes('Italian')) {
    throw new Error('interpreter annex: expected Italian language section in PDF text')
  }
  return {
    pageCount,
    embeddedImageCount,
    textVerification: {
      phraseCoveragePct: phrases.coveragePct,
      phrasesFound: phrases.found,
      phrasesMissing: phrases.missing,
      regressionPhrases: [...VIC_FORM1_REGRESSION_PHRASES],
    },
  }
}

function resolveDockerBin() {
  const env = (process.env.DOCKER_BIN || '').trim()
  if (env) return env
  if (process.platform === 'win32') {
    const candidates = [
      'docker',
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Docker', 'Docker', 'resources', 'bin', 'docker.exe'),
      path.join(
        process.env.LOCALAPPDATA || '',
        'Programs',
        'Docker',
        'Docker',
        'resources',
        'bin',
        'docker.exe',
      ),
    ]
    for (const c of candidates) {
      if (c === 'docker') return c
      if (c && fs.existsSync(c)) return c
    }
  }
  return 'docker'
}

function resolveLoDockerImage() {
  const env = (process.env.VIC_FORM1_LO_DOCKER_IMAGE || '').trim()
  if (env) return env
  return LO_DOCKER_IMAGE
}

function dockerImageDigest(imageRef) {
  const docker = resolveDockerBin()
  const out = execFileSync(docker, ['inspect', '--format', '{{index .RepoDigests 0}}', imageRef], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
  if (!out || !out.includes('@sha256:')) {
    throw new Error(`Could not resolve docker image digest for ${imageRef}: ${out || '(empty)'}`)
  }
  return out
}

/** Cached absolute soffice path inside pinned distroless image (discovered once per run). */
let cachedLoBinaryPath = null

/** Common paths in TDF / distroless LibreOffice 7.6 images (lankalana uses soffice.bin). */
const LO_BINARY_CANDIDATES = [
  '/libreoffice/program/soffice.bin',
  '/libreoffice/program/soffice',
  '/opt/libreoffice7.6/program/soffice.bin',
  '/opt/libreoffice7.6/program/soffice',
  '/opt/libreoffice7.6.7.2/program/soffice.bin',
  '/opt/libreoffice7.6.7.2/program/soffice',
  '/instdir/program/soffice.bin',
  '/instdir/program/soffice',
  '/usr/lib/libreoffice/program/soffice.bin',
  '/usr/lib/libreoffice/program/soffice',
  '/usr/bin/libreoffice',
  '/usr/bin/soffice',
]

/**
 * lankalana/libreoffice-headless is distroless (no /bin/sh, no ENTRYPOINT/CMD).
 * Probe known paths, then fall back to scanning `docker save` layer tarballs on the host.
 * @param {string} imageRef
 */
function discoverLoBinaryPath(imageRef) {
  const docker = resolveDockerBin()
  for (const loBin of LO_BINARY_CANDIDATES) {
    const probe = spawnSync(docker, ['run', '--rm', '--entrypoint', loBin, imageRef, '--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    if (probe.status === 0) return loBin
  }

  const savePath = path.join(root, 'tmp', `lo-image-save-${crypto.randomUUID()}.tar`)
  fs.mkdirSync(path.dirname(savePath), { recursive: true })
  try {
    execFileSync(docker, ['save', '-o', savePath, imageRef], { stdio: 'pipe' })
    const escaped = savePath.replace(/'/g, `'\\''`)
    const script = [
      'set -e',
      'work=$(mktemp -d)',
      `tar -xf '${escaped}' -C "$work"`,
      'found=""',
      'for blob in "$work"/*; do',
      '  [ -f "$blob" ] || continue',
      '  case "$blob" in *.json) continue ;; esac',
      '  listing=$(tar -tf "$blob" 2>/dev/null || gzip -dc "$blob" 2>/dev/null | tar -tf - 2>/dev/null || true)',
      '  line=$(printf "%s\\n" "$listing" | grep -E "program/soffice(\\.bin)?$|/libreoffice$" | head -1 || true)',
      '  if [ -n "$line" ]; then found="${line#./}"; break; fi',
      'done',
      'rm -rf "$work"',
      'if [ -z "$found" ]; then echo "soffice not found in docker save layers" >&2; exit 127; fi',
      'printf "%s" "$found"',
    ].join('\n')
    const result = spawnSync('bash', ['-c', script], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    })
    if (result.status !== 0) {
      throw new Error(
        `soffice not found in image (probe + save scan): ${result.stderr || result.stdout || '(empty)'}`,
      )
    }
    const pick = result.stdout.trim()
    return pick.startsWith('/') ? pick : `/${pick}`
  } finally {
    fs.rmSync(savePath, { force: true })
  }
}

function getLoBinaryPath(imageRef) {
  if (!cachedLoBinaryPath) {
    cachedLoBinaryPath = discoverLoBinaryPath(imageRef)
    console.log('[vic-form1-freeze] Resolved LO binary in image:', cachedLoBinaryPath)
  }
  return cachedLoBinaryPath
}

/**
 * @param {string} imageRef
 * @param {string[]} loArgs argv after soffice binary
 * @param {string[]} [dockerArgs] extra docker run flags before imageRef
 */
function runLoDocker(imageRef, loArgs, dockerArgs = []) {
  const docker = resolveDockerBin()
  const loBin = getLoBinaryPath(imageRef)
  const result = spawnSync(
    docker,
    ['run', '--rm', ...dockerArgs, '--entrypoint', loBin, imageRef, ...loArgs],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  )
  if (result.status !== 0) {
    throw new Error(
      `LibreOffice docker failed (exit ${result.status}): ${result.stderr || result.stdout}`,
    )
  }
  return { stdout: (result.stdout || '').trim(), stderr: (result.stderr || '').trim() }
}

function loVersionFromDocker(imageRef) {
  const { stdout, stderr } = runLoDocker(imageRef, ['--version'])
  const out = stdout || stderr
  return out.split('\n')[0] || out
}

/**
 * @returns {Buffer}
 */
function convertDocxToPdfRaw(imageRef) {
  const profileDir = path.join(root, 'tmp', `lo-profile-${crypto.randomUUID()}`)
  fs.mkdirSync(profileDir, { recursive: true })
  const outDir = path.join(root, 'tmp', `lo-out-${crypto.randomUUID()}`)
  fs.mkdirSync(outDir, { recursive: true })

  const userInstallation = `file://${profileDir.replace(/\\/g, '/')}`

  try {
    runLoDocker(
      imageRef,
      [
        '--headless',
        '--norestore',
        '--nolockcheck',
        `-env:UserInstallation=${userInstallation}`,
        '--convert-to',
        'pdf',
        '--outdir',
        path.posix.join('/work', path.relative(root, outDir).replace(/\\/g, '/')),
        path.posix.join('/work', path.relative(root, SOURCE_DOCX).replace(/\\/g, '/')),
      ],
      [
        '-v',
        `${root}:/work`,
        '-w',
        '/work',
        '-e',
        `SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH}`,
        '-e',
        'HOME=/tmp',
      ],
    )
    const base = path.basename(SOURCE_DOCX, '.docx')
    const produced = path.join(outDir, `${base}.pdf`)
    if (!fs.existsSync(produced)) {
      throw new Error(`Expected PDF not found: ${produced}`)
    }
    return fs.readFileSync(produced)
  } finally {
    fs.rmSync(profileDir, { recursive: true, force: true })
    fs.rmSync(outDir, { recursive: true, force: true })
  }
}

async function runCheck() {
  if (!fs.existsSync(BLANK_PDF)) {
    throw new Error(`Missing committed blank PDF: ${BLANK_PDF}`)
  }
  const blankBytes = fs.readFileSync(BLANK_PDF)
  const blankSha = sha256(blankBytes)

  let provenance = null
  if (fs.existsSync(PROVENANCE_PATH)) {
    provenance = JSON.parse(fs.readFileSync(PROVENANCE_PATH, 'utf8'))
  }
  if (!provenance?.blankSha256) {
    throw new Error('form-1-blank-provenance.json missing blankSha256')
  }
  if (provenance.blankSha256 !== blankSha) {
    throw new Error(`blank SHA mismatch: file ${blankSha} vs provenance ${provenance.blankSha256}`)
  }

  const validation = await validateBlankPdf(blankBytes)
  console.log('[vic-form1-freeze] --check ok')
  console.log(JSON.stringify({ blankSha256: blankSha, ...validation }, null, 2))
}

async function runFreeze() {
  if (!fs.existsSync(SOURCE_DOCX)) {
    throw new Error(`Missing source docx: ${SOURCE_DOCX}`)
  }

  const imageRef = resolveLoDockerImage()
  console.log('[vic-form1-freeze] Docker image:', imageRef)

  // Pull if using digest ref and image not local
  const docker = resolveDockerBin()
  execFileSync(docker, ['pull', imageRef], { stdio: 'inherit' })
  const imageDigest = dockerImageDigest(imageRef)
  const loVersion = loVersionFromDocker(imageRef)
  console.log('[vic-form1-freeze] Resolved digest:', imageDigest)
  console.log('[vic-form1-freeze] LO version:', loVersion)

  console.log('[vic-form1-freeze] Conversion run 1...')
  const raw1 = convertDocxToPdfRaw(imageRef)
  console.log('[vic-form1-freeze] Conversion run 2...')
  const raw2 = convertDocxToPdfRaw(imageRef)

  const { renderDiffFt6600Pair } = await import('./lib/ft6600-render-diff.mjs')
  const renderDiff = await renderDiffFt6600Pair(raw1, raw2)
  if (!renderDiff.ok) {
    throw new Error(`layout determinism failed: ${renderDiff.reason ?? 'pixels differ'}`)
  }
  fs.mkdirSync(path.dirname(RENDER_REPORT), { recursive: true })
  fs.writeFileSync(
    RENDER_REPORT,
    JSON.stringify(
      {
        ...renderDiff,
        note: 'first vs second raw LO conversion; gate of record for layout determinism',
        comparedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  )

  const normalized = await normalizeVicForm1BlankPdfBytes(raw1)
  const blankSha = sha256(normalized)
  const validation = await validateBlankPdf(normalized)

  fs.mkdirSync(path.dirname(BLANK_PDF), { recursive: true })
  fs.writeFileSync(BLANK_PDF, normalized)

  const sourceDocxSha = sha256(fs.readFileSync(SOURCE_DOCX))
  const provenance = {
    sourceDocx: 'docs/vic/form-1-residential-rental-agreement.docx',
    sourceSha256: sourceDocxSha,
    blankPdf: 'docs/vic/form-1-blank.pdf',
    blankSha256: blankSha,
    pageCount: validation.pageCount,
    embeddedImageCount: validation.embeddedImageCount,
    expectedPageCount: EXPECTED_PAGE_COUNT,
    conversionTool: 'libreoffice-docker',
    conversionDockerImage: imageDigest,
    conversionLoVersion: loVersion,
    conversionLoBinaryPath: getLoBinaryPath(imageRef),
    sourceDateEpoch: SOURCE_DATE_EPOCH,
    sourceDateEpochIso: VIC_FORM1_BLANK_PDF_EPOCH_ISO,
    conversionCommand:
      'soffice --headless --norestore --nolockcheck -env:UserInstallation=<temp> --convert-to pdf',
    layoutDeterminism: {
      gate: 'renderDiff',
      renderDiff,
      renderDiffReport: 'scripts/test-official-form-spike/vic-form1-blank-render-diff.json',
      note: 'Raw conversion SHAs differ per-run (LO metadata); layout proven by maxDiffPixels 0.',
    },
    metadataNormalization: {
      tool: 'scripts/lib/vic-form1-pdf-normalize.mjs',
      producer: 'quni-vic-form1-freeze/1',
      fixedIdHex: true,
    },
    textVerification: validation.textVerification,
    freezeScript: 'scripts/freeze-vic-form1-blank.mjs',
    generatedAt: new Date().toISOString(),
    generatedOnHost: os.hostname(),
  }
  fs.writeFileSync(PROVENANCE_PATH, `${JSON.stringify(provenance, null, 2)}\n`, 'utf8')

  if (fs.existsSync(SOURCE_JSON)) {
    const source = JSON.parse(fs.readFileSync(SOURCE_JSON, 'utf8'))
    source.blankPdfSha256 = blankSha
    source.blankPdfPageCount = validation.pageCount
    source.blankPdfEmbeddedImageCount = validation.embeddedImageCount
    fs.writeFileSync(SOURCE_JSON, `${JSON.stringify(source, null, 2)}\n`, 'utf8')
  }

  console.log('\n[vic-form1-freeze] Freeze complete (not committed).')
  console.log(JSON.stringify(provenance, null, 2))
}

async function main() {
  if (checkOnly) {
    await runCheck()
    return
  }
  await runFreeze()
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
