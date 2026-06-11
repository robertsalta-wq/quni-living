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

  // Word print hint on Renter 2 row; LO renders a stray ~11pt box at page 4 top-left.
  xml = xml.replace(/<w:lastRenderedPageBreak\/>/g, '')

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

  let patched = xml
  for (let i = tables.length - 1; i >= 0; i--) {
    const { start, end, tbl } = tables[i]
    let next = injectCantSplitInRenterTable(tbl)
    if (i === 0) next = addPageBreakBeforeTable(next)
    patched = patched.slice(0, start) + next + patched.slice(end)
  }

  return patched
}

/** @param {string} tblXml */
function addPageBreakBeforeTable(tblXml) {
  if (tblXml.includes('w:pageBreakBefore')) return tblXml
  return tblXml.replace('<w:tblPr>', '<w:tblPr><w:pageBreakBefore w:val="1"/>')
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
 * Copy canonical docx → out path with pagination patch applied.
 *
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
