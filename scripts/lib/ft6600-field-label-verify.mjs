/**
 * Verify renamed FT6600 fields: nearest printed label must agree with correct_name semantics.
 */
import { EXPECTED_LABEL_SUBSTRINGS } from './ft6600-field-label-expectations.mjs'
import { collectAllFieldWidgets } from './ft6600-pdf-rename-utils.mjs'

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')

const PAGE_HEIGHT = 841.89

/**
 * @param {number[]} a
 * @param {number[]} b
 * @param {number} [tol]
 */
export function rectsNear(a, b, tol = 1.5) {
  if (a.length !== 4 || b.length !== 4) return false
  return a.every((v, i) => Math.abs(v - b[i]) <= tol)
}

/**
 * @param {Uint8Array} pdfBytes
 */
async function loadPageTextTopOrigin(pdfBytes) {
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfBytes), useSystemFonts: true })
  const pdf = await loadingTask.promise
  /** @type {Map<number, Array<{ str: string, x: number, yTop: number }>>} */
  const byPage = new Map()
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    const viewport = page.getViewport({ scale: 1 })
    const pageHeight = viewport.height
    const items = []
    for (const item of content.items) {
      if (!('str' in item) || !item.str?.trim()) continue
      const tx = pdfjs.Util.transform(viewport.transform, item.transform)
      items.push({ str: item.str.trim(), x: tx[4], yTop: pageHeight - tx[5] })
    }
    byPage.set(p - 1, items)
  }
  return byPage
}

/**
 * @param {Array<{ str: string, x: number, yTop: number }>} items
 * @param {number[]} rectTop
 * @param {'Text'|'CheckBox'|'Signature'} type
 * @param {string[]} expectedSubstrings
 */
function nearestLabelText(items, rectTop, type, expectedSubstrings) {
  const [x0, yTop0, x1, yTop1] = rectTop
  const cy = (yTop0 + yTop1) / 2

  const inBand = items.filter((item) => {
    const yAbove = type === 'CheckBox' ? 18 : 85
    const yBelow = type === 'CheckBox' ? 15 : 100
    const yOk = item.yTop >= yTop0 - yAbove && item.yTop <= yTop1 + yBelow
    if (!yOk) return false
    if (type === 'CheckBox') return item.x >= x1 - 4 && item.x <= x1 + 420
    return item.x >= x0 - 280 && item.x <= x1 + 40
  })

  const lines = []
  for (const item of inBand.sort((a, b) => a.yTop - b.yTop || a.x - b.x)) {
    const line = lines.find((l) => Math.abs(l.yTop - item.yTop) <= 4)
    if (line) {
      line.parts.push(item)
      line.yTop = (line.yTop + item.yTop) / 2
    } else {
      lines.push({ yTop: item.yTop, parts: [item] })
    }
  }

  const scored = lines.map((l) => {
    const text = l.parts
      .sort((a, b) => a.x - b.x)
      .map((p) => p.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    const lower = text.toLowerCase()
    const matched = expectedSubstrings.some((e) => lower.includes(e.toLowerCase()))
    const dist = Math.abs(l.yTop - cy)
    return { text, score: matched ? dist : dist + 1000 }
  })

  scored.sort((a, b) => a.score - b.score)
  return scored[0]?.text ?? ''
}

function labelMatches(label, expectedSubstrings) {
  if (expectedSubstrings.length === 0) return true
  const lower = label.toLowerCase()
  return expectedSubstrings.some((e) => lower.includes(e.toLowerCase()))
}

/**
 * @param {Uint8Array} pdfBytes
 * @param {Array<{ page: number, rect: number[], type: string, correct_name: string }>} correctedMap
 */
export async function verifyRenamedFieldLabels(pdfBytes, correctedMap) {
  const pageText = await loadPageTextTopOrigin(pdfBytes)
  const rows = []
  const failures = []

  for (const entry of correctedMap) {
    const expected = EXPECTED_LABEL_SUBSTRINGS[entry.correct_name]
    if (!expected) {
      failures.push({ ...entry, nearestLabel: '(no expectations)', reason: 'missing EXPECTED_LABEL_SUBSTRINGS entry' })
      continue
    }
    if (entry.correct_name === 'made_on_spare_unused') {
      rows.push({ page: entry.page, correct_name: entry.correct_name, nearestLabel: '(spare/unlabelled - skip)', ok: true })
      continue
    }

    const pageIndex = entry.page - 1
    const items = pageText.get(pageIndex) ?? []
    const nearestLabel = nearestLabelText(items, entry.rect, entry.type, expected)
    const ok = labelMatches(nearestLabel, expected)
    rows.push({ page: entry.page, correct_name: entry.correct_name, nearestLabel, ok })
    if (!ok) {
      failures.push({ ...entry, nearestLabel, reason: `label mismatch for ${entry.correct_name}` })
    }
  }

  return { rows, failures, ok: failures.length === 0 }
}

/**
 * Assert renamed PDF /T names match corrected map entries by page+rect (round-trip).
 * @param {import('pdf-lib').PDFDocument} doc
 * @param {Array<{ page: number, rect: number[], correct_name: string }>} correctedMap
 */
export function verifyRenamedFieldsMatchMap(doc, correctedMap) {
  const widgets = collectAllFieldWidgets(doc)
  const failures = []
  for (const w of widgets) {
    const entry = correctedMap.find((m) => m.page - 1 === w.page && rectsNear(m.rect, w.rect))
    const actualName = w.field.getName()
    if (!entry) {
      failures.push({ page: w.page + 1, rect: w.rect, actualName, reason: 'no map entry' })
      continue
    }
    if (entry.correct_name !== actualName) {
      failures.push({
        page: w.page + 1,
        rect: w.rect,
        expected: entry.correct_name,
        actualName,
        reason: 'name mismatch',
      })
    }
  }
  if (widgets.length !== correctedMap.length) {
    failures.push({ reason: `widget count ${widgets.length} != map ${correctedMap.length}` })
  }
  return { ok: failures.length === 0, failures }
}
