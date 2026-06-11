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
import {
  normalizeVicForm1BlankPdfBytes,
  VIC_FORM1_BLANK_PDF_EPOCH_ISO,
  VIC_FORM1_BLANK_PDF_EPOCH_UNIX,
} from './lib/vic-form1-pdf-normalize.mjs'
import { runInterpreterAnnexGate } from './lib/vic-form1-interpreter-annex-gate.mjs'
import {
  finishVicForm1ContentCompletenessGate,
  probeVicForm1PdfWithPdfLib,
  runVicForm1ContentCompletenessGate,
  VIC_FORM1_EXPECTED_PAGE_COUNT_INFORMATIONAL,
} from './lib/vic-form1-content-completeness-gate.mjs'
import {
  dockerContainerSetupScript,
  queryFontPackageVersionsDocker,
  VIC_FORM1_CONTAINER_APT_PACKAGES,
  VIC_FORM1_FONT_PACKAGE_NAMES,
} from './lib/vic-form1-container-packages.mjs'
import { scanVicForm1CheckboxSquaresFromBytes } from './lib/vic-form1-checkbox-operator-scan.mjs'
import {
  removeVicForm1StrayPage4BoxFromContentStream,
  verifyNoStrayCoverOrPolygonInPdfBytes,
} from './lib/vic-form1-remove-stray-page4-box-content-stream.mjs'
import { bytesToBuffer, rasterizeAllPagesToNamedPngs } from './lib/vic-form1-pdftoppm-raster.mjs'
import { renderDiffVicForm1Pair } from './lib/vic-form1-render-diff.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const SOURCE_DOCX = path.join(root, 'docs', 'vic', 'form-1-residential-rental-agreement.docx')
const BLANK_PDF = path.join(root, 'docs', 'vic', 'form-1-blank.pdf')
const PROVENANCE_PATH = path.join(root, 'docs', 'vic', 'form-1-blank-provenance.json')
const SOURCE_JSON = path.join(root, 'docs', 'vic', 'source.json')
const RENDER_REPORT = path.join(root, 'scripts', 'test-official-form-spike', 'vic-form1-blank-render-diff.json')
const ANNEX_GATE_REPORT = path.join(
  root,
  'scripts',
  'test-official-form-spike',
  'vic-form1-interpreter-annex-gate.json',
)
const ANNEX_PNG_DIR = path.join(root, 'scripts', 'test-official-form-spike')
const CONTENT_COMPLETENESS_REPORT = path.join(
  root,
  'scripts',
  'test-official-form-spike',
  'vic-form1-content-completeness-gate.json',
)

const LO_DOCKER_IMAGE =
  'lankalana/libreoffice-headless@sha256:73910b51dabfbc32234f0d14d7f64751e8c5414e380d191647a41e7f81975c7b'

const LO_DOCKER_IMAGE_INSPECTED_NON_RUNNABLE =
  'lankalana/libreoffice-headless@sha256:b8548113edb08452a41d4ec337ce8202961203d8390ee60187f545ca1418cbe0'

const LO_PROFILE_HOST = path.join(root, 'tmp', 'vic-form1-freeze', 'lo-profile')
const SOURCE_DATE_EPOCH = String(VIC_FORM1_BLANK_PDF_EPOCH_UNIX)

/** Pinned LO 7.6.7.2 on unmodified CAV .docx (no freeze-time docx edits). */
const VIC_FORM1_CANONICAL_PAGE_COUNT = 10

const checkOnly = process.argv.includes('--check')

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

function toPosixRel(absPath) {
  return path.relative(root, absPath).split(path.sep).join('/')
}

function shellQuote(arg) {
  return `'${arg.replace(/'/g, `'\\''`)}'`
}

async function extractPdfTextWithPages(buf) {
  const parser = new PDFParse({ data: buf })
  try {
    const result = await parser.getText()
    const text = (result.text || '').replace(/\r\n/g, '\n')
    const pageTexts = result.pages?.length ? result.pages.map((page) => page.text || '') : [text]
    return { text, pageTexts }
  } finally {
    await parser.destroy()
  }
}

async function extractPdfText(buf) {
  const { text } = await extractPdfTextWithPages(buf)
  return text
}

async function pdfPageCount(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  return doc.getPageCount()
}

async function validateBlankPdf(bytes) {
  const text = await extractPdfText(bytes)
  const contentCompleteness = await runVicForm1ContentCompletenessGate(bytes, text)
  if (!contentCompleteness.ok) {
    throw new Error(`content completeness gate failed: ${contentCompleteness.failures.join('; ')}`)
  }

  return {
    pageCount: contentCompleteness.pageCount,
    pageCountGate: contentCompleteness.pageCountGate,
    embeddedImageCount: contentCompleteness.embeddedImageCount,
    contentCompleteness,
    textVerification: {
      phraseCoveragePct: contentCompleteness.phraseGate.coveragePct,
      phrasesFound: contentCompleteness.phraseGate.phrasesFound,
      phrasesMissing: contentCompleteness.phraseGate.phrasesMissing,
      structureGate: contentCompleteness.structureGate,
      complexScriptGate: contentCompleteness.complexScriptGate,
      checkboxExportMode: contentCompleteness.checkboxExportMode,
      imageGate: contentCompleteness.imageGate,
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

function runDocker(imageRef, containerArgs, extraEnv = {}) {
  const docker = resolveDockerBin()
  const envArgs = [
    '-e',
    `SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH}`,
    '-e',
    'HOME=/tmp',
    '-e',
    'LANG=en_US.UTF-8',
    '-e',
    'SAL_USE_VCLPLUGIN=svp',
  ]
  for (const [k, v] of Object.entries(extraEnv)) {
    envArgs.push('-e', `${k}=${v}`)
  }
  const result = spawnSync(
    docker,
    ['run', '--rm', '-v', `${root}:/work`, '-w', '/work', ...envArgs, imageRef, ...containerArgs],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  )
  if (result.status !== 0) {
    throw new Error(
      `Docker LO failed (exit ${result.status}). stdout: ${result.stdout || '(empty)'} stderr: ${result.stderr || '(empty)'}`,
    )
  }
  return { stdout: (result.stdout || '').trim(), stderr: (result.stderr || '').trim() }
}

/** @param {string[]} sofficeArgs */
function dockerSofficeConvertScript(sofficeArgs) {
  const sofficeCmd = sofficeArgs.map(shellQuote).join(' ')
  return dockerContainerSetupScript(
    ['set +e', 'ec=0', 'for attempt in 1 2 3; do', sofficeCmd, 'ec=$?', '[ "$ec" -eq 0 ] && exit 0', '[ "$ec" -eq 81 ] || exit "$ec"', 'done', 'exit "$ec"'].join(
      '\n',
    ),
  )
}

function loVersionDocker(imageRef) {
  const inner = dockerContainerSetupScript('soffice --version')
  const { stdout, stderr } = runDocker(imageRef, ['bash', '-lc', inner])
  const out = stdout || stderr
  return out.split('\n')[0] || out
}

function convertDocxToPdfRawDocker(imageRef, hostDocxPath) {
  const outId = crypto.randomUUID()
  const profileId = crypto.randomUUID()
  const hostOutDir = path.join(root, 'tmp', 'vic-form1-freeze', `out-${outId}`)
  fs.mkdirSync(hostOutDir, { recursive: true })

  const containerOutDir = `/work/${toPosixRel(hostOutDir)}`
  const profileDir = `/tmp/lo-profile-${profileId}`
  const docxInContainer = `/work/${toPosixRel(hostDocxPath)}`

  const sofficeArgs = [
    'soffice',
    '--headless',
    '--norestore',
    '--nolockcheck',
    '--nofirststartwizard',
    '--nodefault',
    `-env:UserInstallation=file://${profileDir}`,
    '--convert-to',
    'pdf:writer_pdf_Export',
    '--outdir',
    containerOutDir,
    docxInContainer,
  ]

  try {
    runDocker(imageRef, ['bash', '-lc', dockerSofficeConvertScript(sofficeArgs)])
    const base = path.basename(hostDocxPath, '.docx')
    const produced = path.join(hostOutDir, `${base}.pdf`)
    if (!fs.existsSync(produced)) {
      throw new Error(`Expected PDF not found: ${produced}`)
    }
    return fs.readFileSync(produced)
  } finally {
    fs.rmSync(hostOutDir, { recursive: true, force: true })
  }
}

/**
 * When total exceeds 25 but min-x/top-y heuristics miss the stray, use the lone box on
 * a page that only carries the table-break fragment (prescribed boxes sit at x ≈ 45.85).
 *
 * @param {{ total: number, expected: number, perPage: { page: number, count: number, boxes: object[] }[] }} scan
 */
function inferStrayTopLeftFromScan(scan) {
  if (scan.total <= scan.expected) return []
  const extras = scan.total - scan.expected
  /** @type {object[]} */
  const hints = []
  for (const p of scan.perPage) {
    for (const b of p.boxes) {
      if (b.minX < 15 && b.topY < 80) hints.push({ page: p.page, ...b })
    }
  }
  if (hints.length === 0) {
    for (const p of scan.perPage) {
      if (p.count === 1 && p.page >= 4) {
        hints.push({ page: p.page, ...p.boxes[0] })
      }
    }
  }
  hints.sort((a, b) => a.minX - b.minX || a.topY - b.topY)
  return hints.slice(0, extras)
}

/**
 * @param {Buffer} raw1Converted
 * @param {Buffer} raw2Converted
 */
async function remediateStrayPage4CheckboxArtifact(raw1Converted, raw2Converted) {
  let raw1 = Buffer.from(raw1Converted)
  let raw2 = Buffer.from(raw2Converted)
  let checkboxOperatorScan = await scanVicForm1CheckboxSquaresFromBytes(raw1)
  /** @type {object | null} */
  let strayPage4BoxFix = null

  console.log(
    `[vic-form1-freeze] Checkbox operator scan (pre-remediation): total=${checkboxOperatorScan.total} expected=${checkboxOperatorScan.expected}`,
  )
  for (const p of checkboxOperatorScan.perPage) {
    if (p.count > 0) console.log(`  page ${p.page}: ${p.count}`)
  }

  if (!checkboxOperatorScan.ok) {
    console.log(
      '[vic-form1-freeze] LO table-break border fragment detected; deleting stray path operators from PDF content stream...',
    )
    const strayHints = checkboxOperatorScan.strayTopLeft.length
      ? checkboxOperatorScan.strayTopLeft
      : inferStrayTopLeftFromScan(checkboxOperatorScan)
    const fixed1 = await removeVicForm1StrayPage4BoxFromContentStream(raw1, strayHints)
    const fixed2 = await removeVicForm1StrayPage4BoxFromContentStream(raw2, strayHints)
    raw1 = Buffer.from(fixed1.bytes)
    raw2 = Buffer.from(fixed2.bytes)
    strayPage4BoxFix = {
      tool: 'scripts/lib/vic-form1-remove-stray-page4-box-content-stream.mjs',
      method: 'content-stream path deletion',
      pathsRemovedRun1: fixed1.removed,
      pagesTouchedRun1: fixed1.pagesTouched,
      reason:
        'LO drew an extra ~11pt square at a page top (9.2 table page-break border fragment, not a 26th FORMCHECKBOX).',
    }
    checkboxOperatorScan = await scanVicForm1CheckboxSquaresFromBytes(raw1)
    console.log(
      `[vic-form1-freeze] Checkbox operator scan (post-remediation): total=${checkboxOperatorScan.total}`,
    )
  }

  if (!checkboxOperatorScan.ok) {
    throw new Error(
      `checkbox operator scan failed: total ${checkboxOperatorScan.total}, expected ${checkboxOperatorScan.expected}`,
    )
  }
  if (checkboxOperatorScan.strayTopLeft.length > 0) {
    throw new Error(
      `page top-left still has stray checkbox-sized path(s): ${JSON.stringify(checkboxOperatorScan.strayTopLeft)}`,
    )
  }

  return { raw1, raw2, checkboxOperatorScan, strayPage4BoxFix }
}

function writeBlankPdfAndVerify(normalized, blankSha) {
  fs.mkdirSync(path.dirname(BLANK_PDF), { recursive: true })
  const buf = bytesToBuffer(normalized)
  fs.writeFileSync(BLANK_PDF, buf)
  const onDisk = fs.readFileSync(BLANK_PDF)
  if (onDisk.length === 0) {
    throw new Error('blank PDF write produced 0 bytes on disk')
  }
  const diskSha = sha256(onDisk)
  if (diskSha !== blankSha) {
    throw new Error(`blank PDF SHA mismatch after write: disk ${diskSha} vs expected ${blankSha}`)
  }
  return { blankPdfBytesOnDisk: onDisk.length, blankPdfSha256OnDisk: diskSha }
}

async function runCheck() {
  if (!fs.existsSync(BLANK_PDF)) {
    throw new Error(`Missing committed blank PDF: ${BLANK_PDF}`)
  }
  const blankBytes = fs.readFileSync(BLANK_PDF)
  if (blankBytes.length === 0) {
    throw new Error('blank PDF on disk is 0 bytes')
  }
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
  console.log(JSON.stringify({ blankSha256: blankSha, blankPdfBytesOnDisk: blankBytes.length, ...validation }, null, 2))
}

async function runFreeze() {
  if (!fs.existsSync(SOURCE_DOCX)) {
    throw new Error(`Missing source docx: ${SOURCE_DOCX}`)
  }

  fs.rmSync(LO_PROFILE_HOST, { recursive: true, force: true })

  const imageRef = resolveLoDockerImage()
  console.log('[vic-form1-freeze] Docker image:', imageRef)

  const docker = resolveDockerBin()
  execFileSync(docker, ['pull', imageRef], { stdio: 'inherit' })
  const imageDigest = dockerImageDigest(imageRef)

  console.log('[vic-form1-freeze] Resolving container font package versions...')
  const fontPackageVersions = queryFontPackageVersionsDocker(imageRef, runDocker)

  const loVersion = loVersionDocker(imageRef)
  console.log('[vic-form1-freeze] Resolved digest:', imageDigest)
  console.log('[vic-form1-freeze] LO version:', loVersion)
  console.log('[vic-form1-freeze] Font packages:', fontPackageVersions)

  const dockerCtx = { imageRef, runDocker, repoRoot: root }

  console.log('[vic-form1-freeze] Converting official CAV docx (unmodified):', toPosixRel(SOURCE_DOCX))

  console.log('[vic-form1-freeze] Conversion run 1...')
  const raw1Converted = Buffer.from(convertDocxToPdfRawDocker(imageRef, SOURCE_DOCX))
  console.log('[vic-form1-freeze] Conversion run 2...')
  const raw2Converted = Buffer.from(convertDocxToPdfRawDocker(imageRef, SOURCE_DOCX))

  const { raw1, raw2, checkboxOperatorScan, strayPage4BoxFix } = await remediateStrayPage4CheckboxArtifact(
    raw1Converted,
    raw2Converted,
  )

  const pdfProbe = await probeVicForm1PdfWithPdfLib(raw1)
  console.log('[vic-form1-freeze] pageCount after conversion:', pdfProbe.pageCount)
  if (pdfProbe.pageCount !== VIC_FORM1_CANONICAL_PAGE_COUNT) {
    throw new Error(
      `page count must be ${VIC_FORM1_CANONICAL_PAGE_COUNT} (unmodified CAV docx + pinned LO), got ${pdfProbe.pageCount}`,
    )
  }

  const bytesGate = await verifyNoStrayCoverOrPolygonInPdfBytes(raw1)
  if (!bytesGate.ok) {
    throw new Error(`PDF bytes gate failed: ${bytesGate.failures.join('; ')}`)
  }
  console.log('[vic-form1-freeze] PDF bytes gate ok (no white cover, no stray polygon markers)')

  const fullPageRaster = rasterizeAllPagesToNamedPngs({
    pdfBytes: raw1,
    outDir: ANNEX_PNG_DIR,
    repoRoot: root,
    imageRef,
    runDocker,
    fileNamePrefix: 'vic-form1-blank-page',
  })
  console.log(
    `[vic-form1-freeze] Rasterized ${fullPageRaster.pageCount} page(s) for human review:`,
    fullPageRaster.relPaths.join(', '),
  )

  const rawTextBundle = await extractPdfTextWithPages(raw1)
  const contentCompletenessRaw = finishVicForm1ContentCompletenessGate(rawTextBundle.text, pdfProbe)
  fs.mkdirSync(path.dirname(CONTENT_COMPLETENESS_REPORT), { recursive: true })
  fs.writeFileSync(
    CONTENT_COMPLETENESS_REPORT,
    `${JSON.stringify({ ...contentCompletenessRaw, comparedAt: new Date().toISOString() }, null, 2)}\n`,
  )
  if (!contentCompletenessRaw.ok) {
    throw new Error(`content completeness gate failed: ${contentCompletenessRaw.failures.join('; ')}`)
  }

  const annexGate = await runInterpreterAnnexGate(raw1, {
    outDir: ANNEX_PNG_DIR,
    repoRoot: root,
    imageRef,
    runDocker,
    pageTexts: rawTextBundle.pageTexts,
  })
  if (!annexGate.heuristicOk) {
    console.warn(
      `[vic-form1-freeze] Annex heuristics not clean (textOk=${annexGate.textGate.ok} inkOk=${annexGate.inkOk}); pdftoppm PNG is gate of record for human review.`,
    )
  }

  fs.mkdirSync(path.dirname(ANNEX_GATE_REPORT), { recursive: true })
  fs.writeFileSync(ANNEX_GATE_REPORT, `${JSON.stringify({ ...annexGate, comparedAt: new Date().toISOString() }, null, 2)}\n`)

  const renderDiff = await renderDiffVicForm1Pair(raw1, raw2, dockerCtx)
  if (!renderDiff.ok) {
    throw new Error(`layout determinism failed: ${renderDiff.reason ?? 'pixels differ'}`)
  }
  fs.mkdirSync(path.dirname(RENDER_REPORT), { recursive: true })
  fs.writeFileSync(
    RENDER_REPORT,
    JSON.stringify(
      {
        ...renderDiff,
        note: 'first vs second raw LO conversion via pdftoppm; gate of record for layout determinism',
        comparedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  )

  const normalized = await normalizeVicForm1BlankPdfBytes(pdfProbe.pdfBytes)
  const blankSha = sha256(normalized)
  const validation = {
    pageCount: contentCompletenessRaw.pageCount,
    pageCountGate: contentCompletenessRaw.pageCountGate,
    embeddedImageCount: contentCompletenessRaw.embeddedImageCount,
    contentCompleteness: contentCompletenessRaw,
    textVerification: {
      phraseCoveragePct: contentCompletenessRaw.phraseGate.coveragePct,
      phrasesFound: contentCompletenessRaw.phraseGate.phrasesFound,
      phrasesMissing: contentCompletenessRaw.phraseGate.phrasesMissing,
      structureGate: contentCompletenessRaw.structureGate,
      complexScriptGate: contentCompletenessRaw.complexScriptGate,
      checkboxExportMode: contentCompletenessRaw.checkboxExportMode,
      imageGate: contentCompletenessRaw.imageGate,
    },
  }
  const diskVerify = writeBlankPdfAndVerify(normalized, blankSha)

  const sourceDocxSha = sha256(fs.readFileSync(SOURCE_DOCX))
  const provenance = {
    sourceDocx: 'docs/vic/form-1-residential-rental-agreement.docx',
    sourceSha256: sourceDocxSha,
    blankPdf: 'docs/vic/form-1-blank.pdf',
    blankSha256: blankSha,
    blankPdfBytesOnDisk: diskVerify.blankPdfBytesOnDisk,
    blankPdfSha256OnDisk: diskVerify.blankPdfSha256OnDisk,
    pageCount: validation.pageCount,
    pageCountGate: validation.pageCountGate,
    embeddedImageCount: validation.embeddedImageCount,
    expectedPageCountInformational: VIC_FORM1_EXPECTED_PAGE_COUNT_INFORMATIONAL,
    canonicalPageCountNote:
      'Page count from pinned LO 7.6.7.2 container is canonical for coordinate map; not compared to sandbox LO 24.x.',
    conversionTool: 'libreoffice-docker',
    conversionDockerImage: imageDigest,
    conversionLoVersion: loVersion,
    conversionLoBinary: 'soffice',
    conversionDockerImageInspectedNonRunnable: LO_DOCKER_IMAGE_INSPECTED_NON_RUNNABLE,
    conversionNote:
      'Pinned lankalana 7.6.7.2 eclipse-temurin JRE; Docker-only soffice + pdftoppm; apt packages and fonts installed inside container only.',
    sourceDocxUnmodified: true,
    canonicalPageCount: VIC_FORM1_CANONICAL_PAGE_COUNT,
    pdfBytesGate: bytesGate,
    checkboxOperatorScan: {
      tool: 'scripts/lib/vic-form1-checkbox-operator-scan.mjs',
      ...checkboxOperatorScan,
      gate: 'hard — total must equal 25 with no page-4 top-left stray',
    },
    ...(strayPage4BoxFix ? { strayPage4BoxFix } : {}),
    containerAptPackages: VIC_FORM1_CONTAINER_APT_PACKAGES,
    fontPackageNames: VIC_FORM1_FONT_PACKAGE_NAMES,
    fontPackageVersions,
    sourceDateEpoch: SOURCE_DATE_EPOCH,
    sourceDateEpochIso: VIC_FORM1_BLANK_PDF_EPOCH_ISO,
    conversionCommand:
      'docker run … SAL_USE_VCLPLUGIN=svp soffice --headless … --convert-to pdf:writer_pdf_Export',
    layoutDeterminism: {
      gate: 'renderDiff',
      rasterizer: 'pdftoppm',
      renderDiff,
      renderDiffReport: 'scripts/test-official-form-spike/vic-form1-blank-render-diff.json',
      note: 'Raw conversion SHAs differ per-run (LO metadata); layout proven by pdftoppm maxDiffPixels 0.',
    },
    fullPageRaster: {
      ...fullPageRaster,
      fidelityGateOfRecord: 'all-page pdftoppm PNG human review',
      note: 'Review all pages before locking canonical page count; 9 vs 10 is renderer-dependent.',
    },
    contentCompletenessGate: {
      ...validation.contentCompleteness,
      report: 'scripts/test-official-form-spike/vic-form1-content-completeness-gate.json',
    },
    interpreterAnnexGate: {
      ...annexGate,
      fidelityGateOfRecord: 'annex PNG human review (pdftoppm)',
      report: 'scripts/test-official-form-spike/vic-form1-interpreter-annex-gate.json',
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
