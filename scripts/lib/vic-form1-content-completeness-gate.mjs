/**
 * Content-completeness gate for VIC Form 1 blank PDF (pinned LO 7.6.7.2 container).
 * Page count is recorded, not enforced — canonical page count is whatever the
 * faithful pinned-container render produces (9 or 10 is renderer-dependent).
 */
import { PDFCheckBox, PDFDocument } from 'pdf-lib'
import { phraseCoverage, VIC_FORM1_REGRESSION_PHRASES } from './vic-form1-phrase-gate.mjs'
import {
  gateComplexScriptText,
  VIC_FORM1_ANNEX_COMPLEX_SCRIPT_SAMPLES,
} from './vic-form1-interpreter-annex-gate.mjs'
import { countEmbeddedImages, countImageMarkersInPdfBytes } from './vic-form1-pdf-normalize.mjs'

/** Informational only — sandbox LO 24.x produced 9; pinned container may differ. */
export const VIC_FORM1_EXPECTED_PAGE_COUNT_INFORMATIONAL = 9

/** Prescribed Form 1 checkbox count on official CAV .docx (content control checkboxes). */
export const VIC_FORM1_EXPECTED_CHECKBOX_COUNT = 25

/** Section / structure markers — normalized substring match. */
export const VIC_FORM1_CONTENT_STRUCTURE_MARKERS = [
  { id: 'part_a', label: 'Part A – Basic terms', pattern: /part a.{0,8}basic terms/i },
  { id: 'renter_1', label: 'Full name of renter 1', pattern: /full name of renter 1/i },
  { id: 'renter_2', label: 'Full name of renter 2', pattern: /full name of renter 2/i },
  { id: 'renter_3', label: 'Full name of renter 3', pattern: /full name of renter 3/i },
  { id: 'renter_4', label: 'Full name of renter 4', pattern: /full name of renter 4/i },
  { id: 'item_8', label: 'Item 8 payment methods', pattern: /8.{0,40}preferred method.{0,20}rent payment/i },
  { id: 'item_9_1', label: 'Item 9.1 rental provider electronic service', pattern: /9\.1.{0,80}rental provider agree/i },
  { id: 'item_9_2', label: 'Item 9.2 renter electronic service', pattern: /9\.2.{0,80}renter agree/i },
  { id: 'item_12', label: 'Item 12 owners corporation', pattern: /12.{0,40}owners corporation/i },
  { id: 'item_13', label: 'Item 13 condition report', pattern: /13.{0,40}condition report/i },
  { id: 'signatures', label: 'Item 22 signatures', pattern: /22.{0,20}signatures/i },
  { id: 'interpreter_annex', label: 'Telephone interpreter service', pattern: /telephone interpreter service/i },
  { id: 'official_footer', label: 'OFFICIAL footer', pattern: /\bofficial\b/i },
]

/**
 * @param {Uint8Array | Buffer} bytes
 */
export async function countPdfFormCheckboxes(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const form = doc.getForm()
  const fields = form.getFields()
  const checkboxes = fields.filter((f) => f instanceof PDFCheckBox)
  return {
    totalFormFields: fields.length,
    checkboxCount: checkboxes.length,
    checkboxNames: checkboxes.map((f) => f.getName()),
  }
}

/**
 * @param {string} text
 */
export function gateContentStructureMarkers(text) {
  const results = []
  let ok = true
  for (const { id, label, pattern } of VIC_FORM1_CONTENT_STRUCTURE_MARKERS) {
    const pass = pattern.test(text)
    if (!pass) ok = false
    results.push({ id, label, pass })
  }
  return { ok, results }
}

/**
 * @param {Uint8Array | Buffer} bytes
 * @param {string} text full PDF text extract
 */
export async function runVicForm1ContentCompletenessGate(bytes, text) {
  const pageCountDoc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const pageCount = pageCountDoc.getPageCount()

  let embeddedImageCount = countEmbeddedImages(pageCountDoc)
  if (embeddedImageCount < 1) {
    embeddedImageCount = countImageMarkersInPdfBytes(bytes)
  }

  const phrases = phraseCoverage(text, VIC_FORM1_REGRESSION_PHRASES)
  const structure = gateContentStructureMarkers(text)
  const complexScript = gateComplexScriptText(text)
  const formFields = await countPdfFormCheckboxes(bytes)

  const checkboxGate = {
    expected: VIC_FORM1_EXPECTED_CHECKBOX_COUNT,
    actual: formFields.checkboxCount,
    pass: formFields.checkboxCount === VIC_FORM1_EXPECTED_CHECKBOX_COUNT,
  }

  const imageGate = {
    expectedMin: 1,
    actual: embeddedImageCount,
    pass: embeddedImageCount >= 1,
    note: 'CAV logo expected as embedded image',
  }

  const pageCountGate = {
    expectedPageCountInformational: VIC_FORM1_EXPECTED_PAGE_COUNT_INFORMATIONAL,
    actual: pageCount,
    pass: true,
    abortOnMismatch: false,
    note: 'CAV publishes .docx only; page count is renderer-dependent. Pinned LO 7.6.7.2 output is canonical.',
  }

  const phraseGate = {
    coveragePct: phrases.coveragePct,
    phrasesFound: phrases.found,
    phrasesMissing: phrases.missing,
    pass: phrases.coveragePct === 100,
  }

  const failures = []
  if (!phraseGate.pass) failures.push(`phrases missing: ${phrases.missing.join(', ')}`)
  if (!structure.ok) {
    failures.push(
      `structure markers missing: ${structure.results.filter((r) => !r.pass).map((r) => r.id).join(', ')}`,
    )
  }
  if (!complexScript.ok) {
    const failed = complexScript.results.filter((r) => !r.pass).map((r) => r.id)
    failures.push(`complex-script annex: ${failed.join(', ')} tofu=${complexScript.tofuCharCount}`)
  }
  if (!checkboxGate.pass) {
    failures.push(`checkboxCount ${formFields.checkboxCount} !== ${VIC_FORM1_EXPECTED_CHECKBOX_COUNT}`)
  }
  if (!imageGate.pass) {
    failures.push(`embeddedImageCount ${embeddedImageCount} < 1`)
  }

  const ok = failures.length === 0

  return {
    ok,
    gate: 'contentCompleteness',
    pageCount,
    pageCountGate,
    embeddedImageCount,
    imageGate,
    checkboxGate,
    formFields: {
      totalFormFields: formFields.totalFormFields,
      checkboxCount: formFields.checkboxCount,
    },
    phraseGate,
    structureGate: structure,
    complexScriptGate: complexScript,
    annexScriptSamples: VIC_FORM1_ANNEX_COMPLEX_SCRIPT_SAMPLES.map((s) => s.id),
    failures,
    note: 'Human review of full-page pdftoppm PNGs is gate of record for layout fidelity; this gate checks text/structure completeness only.',
  }
}
