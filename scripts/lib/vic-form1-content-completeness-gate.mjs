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
 * @returns {Uint8Array}
 */
function toPdfLibBytes(bytes) {
  if (Buffer.isBuffer(bytes)) return Uint8Array.from(bytes)
  if (bytes instanceof Uint8Array) {
    if (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) {
      return bytes
    }
    return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }
  return new Uint8Array(bytes)
}

/**
 * @param {Uint8Array | Buffer} bytes
 */
export async function countPdfFormCheckboxes(bytes) {
  const doc = await PDFDocument.load(toPdfLibBytes(bytes), { ignoreEncryption: true })
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
 * pdf-lib probe — run before pdfjs/pdf-parse so LO PDF bytes are not loaded twice
 * in one process (pdf-lib reload after pdfjs can fail on CI for this export).
 *
 * @param {Uint8Array | Buffer} bytes
 */
export async function probeVicForm1PdfWithPdfLib(bytes) {
  const pdfBytes = toPdfLibBytes(bytes)
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  const pageCount = doc.getPageCount()

  let embeddedImageCount = countEmbeddedImages(doc)
  if (embeddedImageCount < 1) {
    embeddedImageCount = countImageMarkersInPdfBytes(pdfBytes)
  }

  const form = doc.getForm()
  const fields = form.getFields()
  const checkboxes = fields.filter((f) => f instanceof PDFCheckBox)
  const formFields = {
    totalFormFields: fields.length,
    checkboxCount: checkboxes.length,
    checkboxNames: checkboxes.map((f) => f.getName()),
  }

  return { pdfBytes, pageCount, embeddedImageCount, formFields }
}

/**
 * @param {string} text
 * @param {Awaited<ReturnType<typeof probeVicForm1PdfWithPdfLib>>} pdfProbe
 */
export function finishVicForm1ContentCompletenessGate(text, pdfProbe) {
  const { pdfBytes, pageCount, embeddedImageCount, formFields } = pdfProbe
  const phrases = phraseCoverage(text, VIC_FORM1_REGRESSION_PHRASES)
  const structure = gateContentStructureMarkers(text)
  const complexScript = gateComplexScriptText(text)
  const checkboxExportMode = recordCheckboxExportMode(pdfBytes, text, formFields)

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
    checkboxExportMode,
    phraseGate,
    structureGate: structure,
    complexScriptGate: complexScript,
    annexScriptSamples: VIC_FORM1_ANNEX_COMPLEX_SCRIPT_SAMPLES.map((s) => s.id),
    failures,
    note: 'Human review of full-page pdftoppm PNGs is gate of record for layout fidelity; this gate checks text/structure completeness only.',
  }
}

/**
 * Record how LO exported the 25 legacy Word FORMCHECKBOX fields — informational only.
 * M2 overlays tick glyphs on a flat canonical page; widget survival is not required.
 *
 * @param {Uint8Array | Buffer} bytes
 * @param {string} text PDF text extract
 * @param {{ totalFormFields: number, checkboxCount: number, checkboxNames: string[] }} formFields
 */
export function recordCheckboxExportMode(bytes, text, formFields) {
  const latin = Buffer.from(bytes).toString('latin1')
  const hasAcroForm = /\/AcroForm\b/.test(latin)
  const btnFieldMarkers = latin.match(/\/FT\s*\/Btn\b/g) ?? []
  const widgetSubtypeMarkers = latin.match(/\/Subtype\s*\/Widget\b/g) ?? []
  const textLayerBoxGlyphs = text.match(/[\u2610\u2611\u2612\u25A1\u25A0\u274F\u2751□☐☑]/g) ?? []

  /** @type {'acroform_checkbox_widgets' | 'acroform_btn_widgets_no_pdf_lib_checkboxes' | 'flattened_text_glyphs' | 'flattened_drawings_no_widgets' | 'mixed_or_unknown'} */
  let exportMode = 'mixed_or_unknown'
  if (formFields.checkboxCount > 0) {
    exportMode = 'acroform_checkbox_widgets'
  } else if (formFields.totalFormFields > 0 || btnFieldMarkers.length > 0) {
    exportMode = 'acroform_btn_widgets_no_pdf_lib_checkboxes'
  } else if (textLayerBoxGlyphs.length > 0) {
    exportMode = 'flattened_text_glyphs'
  } else if (!hasAcroForm && widgetSubtypeMarkers.length === 0) {
    exportMode = 'flattened_drawings_no_widgets'
  }

  return {
    gate: 'checkboxExportMode',
    informationalOnly: true,
    abortOnMismatch: false,
    pass: true,
    docxLegacyFormCheckboxCountInformational: VIC_FORM1_EXPECTED_CHECKBOX_COUNT,
    acroFormCheckboxWidgetCount: formFields.checkboxCount,
    acroFormCheckboxNames: formFields.checkboxNames,
    totalAcroFormFields: formFields.totalFormFields,
    hasAcroForm,
    pdfBtnFieldMarkerCount: btnFieldMarkers.length,
    pdfWidgetSubtypeMarkerCount: widgetSubtypeMarkers.length,
    textLayerBoxGlyphCount: textLayerBoxGlyphs.length,
    exportMode,
    note:
      'CAV .docx has 25 legacy FORMCHECKBOX fields; LO PDF export may emit widgets, flatten to glyphs, or another count. Not a fidelity gate for M2 — confirm 25 boxes visually in page PNGs; exportMode feeds coordinate-map detection.',
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
  const pdfProbe = await probeVicForm1PdfWithPdfLib(bytes)
  return finishVicForm1ContentCompletenessGate(text, pdfProbe)
}
