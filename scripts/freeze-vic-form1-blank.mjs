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

import {

  gateComplexScriptText,

  runInterpreterAnnexGate,

} from './lib/vic-form1-interpreter-annex-gate.mjs'



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



/** Runnable pinned linux/amd64 digest (LO 7.6.7.2 + JRE, ubuntu focal). */

const LO_DOCKER_IMAGE =

  'lankalana/libreoffice-headless@sha256:73910b51dabfbc32234f0d14d7f64751e8c5414e380d191647a41e7f81975c7b'



/** Inspected distroless instdir-only image — not runnable without host libc extract. */

const LO_DOCKER_IMAGE_INSPECTED_NON_RUNNABLE =

  'lankalana/libreoffice-headless@sha256:b8548113edb08452a41d4ec337ce8202961203d8390ee60187f545ca1418cbe0'



/** Installed inside the LO container (not on GHA host) — temurin image lacks some LO .so deps. */
const LO_RUNTIME_PACKAGES = [
  'libnss3',
  'libnspr4',
  'libxslt1.1',
  'libxml2',
  'libfontconfig1',
  'libcups2',
  'libdbus-1-3',
  'libglib2.0-0',
  'libxinerama1',
  'libsm6',
  'libice6',
  'libxext6',
  'libxrender1',
  'libx11-6',
  'libxcb1',
  'libgl1',
]

const NOTO_FONT_PACKAGES = [
  'fonts-noto-core',
  'fonts-noto-cjk',
  'fonts-noto-extra',
  'fonts-noto-ui-core',
  'fonts-noto-unhinted',
  'fonts-noto-color-emoji',
]

function shellQuote(arg) {
  return `'${arg.replace(/'/g, `'\\''`)}'`
}

/** @param {string[]} sofficeArgs @param {{ withNotoFonts?: boolean }} [opts] */
function dockerInnerSofficeScript(sofficeArgs, opts = {}) {
  const aptPkgs = [...LO_RUNTIME_PACKAGES]
  if (opts.withNotoFonts) aptPkgs.push(...NOTO_FONT_PACKAGES)
  return [
    'set -e',
    'export DEBIAN_FRONTEND=noninteractive',
    'apt-get update -qq',
    `apt-get install -y -qq ${aptPkgs.join(' ')}`,
    'fc-cache -f',
    sofficeArgs.map(shellQuote).join(' '),
  ].join(' && ')
}



const EXPECTED_PAGE_COUNT = 9

const SOURCE_DATE_EPOCH = String(VIC_FORM1_BLANK_PDF_EPOCH_UNIX)



const checkOnly = process.argv.includes('--check')



function sha256(buf) {

  return crypto.createHash('sha256').update(buf).digest('hex')

}



function toPosixRel(absPath) {

  return path.relative(root, absPath).split(path.sep).join('/')

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

  const complexScript = gateComplexScriptText(text)

  if (!complexScript.ok) {

    const failed = complexScript.results.filter((r) => !r.pass).map((r) => r.id)

    throw new Error(

      `interpreter annex complex-script text gate failed: ${failed.join(', ')} tofuChars=${complexScript.tofuCharCount}`,

    )

  }

  return {

    pageCount,

    embeddedImageCount,

    textVerification: {

      phraseCoveragePct: phrases.coveragePct,

      phrasesFound: phrases.found,

      phrasesMissing: phrases.missing,

      regressionPhrases: [...VIC_FORM1_REGRESSION_PHRASES],

      complexScriptGate: complexScript,

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



function loVersionDocker(imageRef) {

  const inner = dockerInnerSofficeScript(['soffice', '--version'])

  const { stdout, stderr } = runDocker(imageRef, ['bash', '-lc', inner])

  const out = stdout || stderr

  return out.split('\n')[0] || out

}



/**

 * @param {string} imageRef

 * @param {{ withNotoFonts?: boolean }} [opts]

 * @returns {Buffer}

 */

function convertDocxToPdfRawDocker(imageRef, opts = {}) {

  const profileId = crypto.randomUUID()

  const outId = crypto.randomUUID()

  const hostOutDir = path.join(root, 'tmp', 'vic-form1-freeze', `out-${outId}`)

  fs.mkdirSync(hostOutDir, { recursive: true })

  const containerOutDir = `/work/${toPosixRel(hostOutDir)}`

  const profileDir = `/tmp/lo-profile-${profileId}`

  const docxInContainer = '/work/docs/vic/form-1-residential-rental-agreement.docx'



  const sofficeArgs = [

    'soffice',

    '--headless',

    '--norestore',

    '--nolockcheck',

    '--nofirststartwizard',

    '--nodefault',

    `-env:UserInstallation=file://${profileDir}`,

    '--convert-to',

    'pdf',

    '--outdir',

    containerOutDir,

    docxInContainer,

  ]



  try {

    const inner = dockerInnerSofficeScript(sofficeArgs, opts)

    runDocker(imageRef, ['bash', '-lc', inner])



    const base = path.basename(SOURCE_DOCX, '.docx')

    const produced = path.join(hostOutDir, `${base}.pdf`)

    if (!fs.existsSync(produced)) {

      throw new Error(`Expected PDF not found: ${produced}`)

    }

    return fs.readFileSync(produced)

  } finally {

    fs.rmSync(hostOutDir, { recursive: true, force: true })

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



  const docker = resolveDockerBin()

  execFileSync(docker, ['pull', imageRef], { stdio: 'inherit' })

  const imageDigest = dockerImageDigest(imageRef)

  const loVersion = loVersionDocker(imageRef)

  console.log('[vic-form1-freeze] Resolved digest:', imageDigest)

  console.log('[vic-form1-freeze] LO version:', loVersion)



  let withNotoFonts = false

  let annexGate = null



  const convert = () => convertDocxToPdfRawDocker(imageRef, { withNotoFonts })



  console.log('[vic-form1-freeze] Conversion run 1...')

  let raw1 = convert()

  console.log('[vic-form1-freeze] Conversion run 2...')

  let raw2 = convert()



  annexGate = await runInterpreterAnnexGate(raw1, { outDir: ANNEX_PNG_DIR, repoRoot: root })

  if (!annexGate.heuristicOk && !withNotoFonts) {

    console.warn('[vic-form1-freeze] Annex heuristics failed; retrying with Noto fonts in container...')

    withNotoFonts = true

    console.log('[vic-form1-freeze] Conversion run 1 (Noto)...')

    raw1 = convert()

    console.log('[vic-form1-freeze] Conversion run 2 (Noto)...')

    raw2 = convert()

    annexGate = await runInterpreterAnnexGate(raw1, { outDir: ANNEX_PNG_DIR, repoRoot: root })

  }

  if (!annexGate.heuristicOk) {

    console.warn(

      `[vic-form1-freeze] Annex heuristic gate not clean (textOk=${annexGate.textGate.ok} inkOk=${annexGate.inkOk}); PNG visual is gate of record for human review.`,

    )

  }



  fs.mkdirSync(path.dirname(ANNEX_GATE_REPORT), { recursive: true })

  fs.writeFileSync(ANNEX_GATE_REPORT, `${JSON.stringify({ ...annexGate, comparedAt: new Date().toISOString() }, null, 2)}\n`)



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

    conversionLoBinary: 'soffice',

    conversionDockerImageInspectedNonRunnable: LO_DOCKER_IMAGE_INSPECTED_NON_RUNNABLE,

    conversionNote:

      'Pinned lankalana 7.6.7.2 eclipse-temurin JRE image; Docker-only soffice conversion (LO runtime deps via apt inside container, not on GHA host).',

    loRuntimePackagesInstalledInContainer: LO_RUNTIME_PACKAGES,

    notoFontsInstalledInContainer: withNotoFonts,

    notoFontPackages: withNotoFonts ? NOTO_FONT_PACKAGES : [],

    sourceDateEpoch: SOURCE_DATE_EPOCH,

    sourceDateEpochIso: VIC_FORM1_BLANK_PDF_EPOCH_ISO,

    conversionCommand:

      'docker run … soffice --headless --norestore --nolockcheck -env:UserInstallation=<temp> --convert-to pdf',

    layoutDeterminism: {

      gate: 'renderDiff',

      renderDiff,

      renderDiffReport: 'scripts/test-official-form-spike/vic-form1-blank-render-diff.json',

      note: 'Raw conversion SHAs differ per-run (LO metadata); layout proven by maxDiffPixels 0.',

    },

    interpreterAnnexGate: {

      ...annexGate,

      fidelityGateOfRecord: 'annex PNG human review',

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


