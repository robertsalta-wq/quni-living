/**
 * Freeze-time-only patches to CAV Form 1 .docx for faithful LO PDF pagination.
 * Does not modify the committed canonical docx on disk.
 */
import fs from 'node:fs'
import path from 'node:path'
import JSZip from 'jszip'

const ITEM_92_QUESTION_MARKER = 'Does the renter agree to the service of notices'
const ITEM_92_TICK_MARKER = 'tick as appropriate)</w:t></w:r></w:p><w:tbl>'

/**
 * @param {string} documentXml
 */
export function patchVicForm1DocumentXml(documentXml) {
  let xml = documentXml

  // Word print hints; LO can render stray checkbox-sized boxes at page breaks.
  xml = xml.replace(/<w:lastRenderedPageBreak\/>/g, '')

  xml = injectItem92BlockKeepTogether(xml)

  const tables = findRenterGridTables(xml)
  if (tables.length === 0) return xml

  xml = mergeConsecutiveRenterTables(xml, tables)

  const merged = findRenterGridTables(xml)
  if (merged.length !== 1) {
    throw new Error(`expected 1 merged renter table, found ${merged.length}`)
  }

  const { start, end, tbl } = merged[0]
  let next = injectCantSplitInRenterTable(tbl)
  next = wrapRenterTableInKeepTogetherOuter(next)
  return xml.slice(0, start) + next + xml.slice(end)
}

/**
 * Force item 9.2 (question + tick line + renter grid) to start on a fresh page and
 * stay with the following table so LO does not draw a continuation border fragment.
 *
 * @param {string} xml
 */
function injectItem92BlockKeepTogether(xml) {
  const question = findParagraphContaining(xml, ITEM_92_QUESTION_MARKER)
  if (!question) throw new Error('item 9.2 question paragraph not found')

  const tick = findParagraphEndingBefore(xml, ITEM_92_TICK_MARKER, question.end)
  if (!tick) throw new Error('item 9.2 tick-instruction paragraph not found')

  let questionPara = injectPageBreakBefore(question.para)
  questionPara = injectKeepNext(questionPara)

  let tickPara = injectKeepNext(tick.para)

  return (
    xml.slice(0, question.start) +
    questionPara +
    xml.slice(question.end, tick.start) +
    tickPara +
    xml.slice(tick.end)
  )
}

/**
 * @param {string} xml
 * @param {string} marker unique suffix through following sibling tag
 * @param {number} afterIndex search only after this offset
 */
function findParagraphEndingBefore(xml, marker, afterIndex) {
  const idx = xml.indexOf(marker, afterIndex)
  if (idx < 0) return null
  const pEnd = idx + marker.indexOf('</w:p>') + 6
  const pStart = xml.lastIndexOf('<w:p ', pEnd)
  if (pStart < afterIndex) return null
  return { start: pStart, end: pEnd, para: xml.slice(pStart, pEnd) }
}

/**
 * @param {string} xml
 * @param {string} marker
 */
function findParagraphContaining(xml, marker) {
  const idx = xml.indexOf(marker)
  if (idx < 0) return null

  const pStart = xml.lastIndexOf('<w:p ', idx)
  if (pStart < 0) return null
  const pEnd = xml.indexOf('</w:p>', idx)
  if (pEnd < 0) return null

  return { start: pStart, end: pEnd + 6, para: xml.slice(pStart, pEnd + 6) }
}

/**
 * @param {string} paraXml
 */
function injectPageBreakBefore(paraXml) {
  if (paraXml.includes('w:pageBreakBefore')) return paraXml
  if (paraXml.includes('<w:pPr>')) {
    return paraXml.replace('<w:pPr>', '<w:pPr><w:pageBreakBefore w:val="1"/>')
  }
  return paraXml.replace(/<w:p\b[^>]*>/, (open) => `${open}<w:pPr><w:pageBreakBefore w:val="1"/></w:pPr>`)
}

/**
 * @param {string} paraXml
 */
function injectKeepNext(paraXml) {
  if (paraXml.includes('w:keepNext')) return paraXml
  if (paraXml.includes('<w:pPr>')) {
    return paraXml.replace('<w:pPr>', '<w:pPr><w:keepNext w:val="1"/>')
  }
  return paraXml.replace(/<w:p\b[^>]*>/, (open) => `${open}<w:pPr><w:keepNext w:val="1"/></w:pPr>`)
}

/**
 * @param {string} xml
 */
function findRenterGridTables(xml) {
  /** @type {{ start: number, end: number, tbl: string }[]} */
  const tables = []
  let pos = 0
  while ((pos = xml.indexOf('<w:tbl>', pos)) >= 0) {
    let depth = 0
    let end = -1
    for (let i = pos; i < xml.length; i++) {
      if (xml.startsWith('<w:tbl>', i)) depth++
      if (xml.startsWith('</w:tbl>', i)) {
        depth--
        if (depth === 0) {
          end = i + 8
          break
        }
      }
    }
    const tbl = xml.slice(pos, end)
    const text = [...tbl.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
      .map((m) => m[1])
      .join('')
    const isRenterGrid =
      /FORMCHECKBOX/.test(tbl) && /Renter\s*[1-4]/.test(text.replace(/\s+/g, ' '))
    if (isRenterGrid) tables.push({ start: pos, end, tbl })
    pos = end
  }
  return tables
}

/**
 * CAV ships item 9.2 as four 2-row tables; LO leaves a stray border box when the
 * Renter 1 / Renter 2 tables straddle a page break. One table keeps 8 rows intact.
 *
 * @param {string} xml
 * @param {{ start: number, end: number, tbl: string }[]} tables
 */
function mergeConsecutiveRenterTables(xml, tables) {
  if (tables.length < 2) return xml

  const sorted = [...tables].sort((a, b) => a.start - b.start)
  for (let i = 1; i < sorted.length; i++) {
    const gap = xml.slice(sorted[i - 1].end, sorted[i].start)
    if (!/^[\s]*(<w:p[^>]*>[\s\S]*?<\/w:p>[\s]*)*$/.test(gap)) {
      throw new Error('renter tables are not consecutive (unexpected content between tables)')
    }
  }

  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const head = first.tbl.match(/^<w:tbl>(<w:tblPr>[\s\S]*?<\/w:tblPr><w:tblGrid>[\s\S]*?<\/w:tblGrid>)/)
  if (!head) throw new Error('renter table head (tblPr/tblGrid) not found')

  let rowsXml = ''
  for (const t of sorted) {
    const rows = [...t.tbl.matchAll(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g)].map((m) => m[0])
    rowsXml += rows.join('')
  }

  const merged = `<w:tbl>${head[1]}${rowsXml}</w:tbl>`
  return xml.slice(0, first.start) + merged + xml.slice(last.end)
}

/**
 * @param {string} tblXml
 */
function injectCantSplitInRenterTable(tblXml) {
  return tblXml.replace(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g, (row) => {
    if (row.includes('w:cantSplit')) return row
    if (row.includes('<w:trPr>')) {
      return row.replace('<w:trPr>', '<w:trPr><w:cantSplit w:val="1"/>')
    }
    return row.replace(/<w:tr\b[^>]*>/, (open) => `${open}<w:trPr><w:cantSplit w:val="1"/></w:trPr>`)
  })
}

/**
 * Outer single-cell table with cantSplit so LO cannot break the renter grid across pages.
 *
 * @param {string} innerTblXml full <w:tbl>…</w:tbl>
 */
function wrapRenterTableInKeepTogetherOuter(innerTblXml) {
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblLayout w:type="autofit"/><w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="0"/></w:tblPr><w:tblGrid><w:gridCol w:w="10000"/></w:tblGrid><w:tr><w:trPr><w:cantSplit w:val="1"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="10000" w:type="dxa"/><w:tcBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/></w:tcBorders></w:tcPr>${innerTblXml}</w:tc></w:tr></w:tbl>`
}

/**
 * @param {string} sourceDocx absolute path to committed CAV docx
 * @param {string} outDocx absolute path for patched copy
 */
export async function writePatchedVicForm1DocxForFreeze(sourceDocx, outDocx) {
  const buf = fs.readFileSync(sourceDocx)
  const zip = await JSZip.loadAsync(buf)
  const docFile = zip.file('word/document.xml')
  if (!docFile) throw new Error('docx missing word/document.xml')

  const original = await docFile.async('string')
  const patched = patchVicForm1DocumentXml(original)
  zip.file('word/document.xml', patched)

  const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  fs.mkdirSync(path.dirname(outDocx), { recursive: true })
  fs.writeFileSync(outDocx, out)
}
