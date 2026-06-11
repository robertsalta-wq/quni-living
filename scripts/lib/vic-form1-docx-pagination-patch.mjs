/**
 * Freeze-time-only patches to CAV Form 1 .docx for faithful LO PDF pagination.
 * Does not modify the committed canonical docx on disk.
 */
import fs from 'node:fs'
import path from 'node:path'
import JSZip from 'jszip'

/**
 * @param {string} documentXml
 */
export function patchVicForm1DocumentXml(documentXml) {
  let xml = documentXml

  // Word print hints; LO can render stray checkbox-sized boxes at page breaks.
  xml = xml.replace(/<w:lastRenderedPageBreak\/>/g, '')

  const tables = findRenterGridTables(xml)
  if (tables.length === 0) return xml

  xml = mergeConsecutiveRenterTables(xml, tables)

  const merged = findRenterGridTables(xml)
  if (merged.length !== 1) {
    throw new Error(`expected 1 merged renter table, found ${merged.length}`)
  }

  const { start, end, tbl } = merged[0]
  const next = injectCantSplitInRenterTable(tbl)
  return xml.slice(0, start) + next + xml.slice(end)
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
