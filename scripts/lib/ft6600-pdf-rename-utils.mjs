import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRef,
  PDFString,
} from 'pdf-lib'

/**
 * @param {import('pdf-lib').PDFPage} page
 * @param {import('pdf-lib').PDFDocument} doc
 */
export function getPageContentsByteSlices(page, doc) {
  const contents = page.node.Contents()
  if (!contents) return []
  const slices = []
  const pushStream = (ref) => {
    const stream = doc.context.lookup(ref)
    const decoded = stream.getContents()
    slices.push(Buffer.from(decoded))
  }
  if (contents instanceof PDFRef) {
    pushStream(contents)
  } else if (contents instanceof PDFArray) {
    for (let i = 0; i < contents.size(); i++) {
      pushStream(contents.get(i))
    }
  }
  return slices
}

/**
 * @param {PDFDocument} doc
 */
export function snapshotPageContents(doc) {
  return doc.getPages().map((page) => getPageContentsByteSlices(page, doc))
}

/**
 * @param {Buffer[][]} before
 * @param {Buffer[][]} after
 */
export function assertPageContentsIdentical(before, after) {
  if (before.length !== after.length) {
    throw new Error(`page count changed: ${before.length} -> ${after.length}`)
  }
  for (let p = 0; p < before.length; p++) {
    const a = before[p]
    const b = after[p]
    if (a.length !== b.length) {
      throw new Error(`page ${p}: content stream count ${a.length} -> ${b.length}`)
    }
    for (let s = 0; s < a.length; s++) {
      if (!a[s].equals(b[s])) {
        throw new Error(`page ${p} stream ${s}: content bytes differ (${a[s].length} vs ${b[s].length})`)
      }
    }
  }
}

/**
 * @param {PDFDict} dict
 * @param {import('pdf-lib').PDFContext} ctx
 * @returns {PDFRef}
 */
function dictRef(dict, ctx) {
  return dict instanceof PDFRef ? dict : ctx.register(dict)
}

/**
 * @param {PDFDocument} doc
 * @param {import('pdf-lib').PDFAcroField} acroField
 */
export function detachFromParentFolder(doc, acroField) {
  const terminalDict = acroField.dict
  const ctx = doc.context
  const terminalRef = dictRef(terminalDict, ctx)
  const parentRef = terminalDict.get(PDFName.of('Parent'))
  if (parentRef) {
    const parentDict = ctx.lookup(parentRef, PDFDict)
    const kids = parentDict.lookup(PDFName.of('Kids'), PDFArray)
    const newKids = PDFArray.withContext(ctx)
    const terminalKey = terminalRef.toString()
    for (let i = 0; i < kids.size(); i++) {
      if (kids.get(i).toString() !== terminalKey) newKids.push(kids.get(i))
    }
    parentDict.set(PDFName.of('Kids'), newKids)
    terminalDict.delete(PDFName.of('Parent'))
  }
  hoistToRootFieldsArray(doc, terminalRef)
}

/**
 * @param {PDFDocument} doc
 * @param {PDFRef} fieldRef
 */
export function hoistToRootFieldsArray(doc, fieldRef) {
  const ctx = doc.context
  const acroFormRef = doc.catalog.get(PDFName.of('AcroForm'))
  if (!acroFormRef) return
  const acroForm = ctx.lookup(acroFormRef, PDFDict)
  const fields = acroForm.lookup(PDFName.of('Fields'), PDFArray)
  const key = fieldRef.toString()
  for (let i = 0; i < fields.size(); i++) {
    if (fields.get(i).toString() === key) return
  }
  fields.push(fieldRef)
}

/**
 * @param {PDFDocument} doc
 * @param {import('pdf-lib').PDFAcroField} acroField
 * @param {string} semanticName
 */
export function setTerminalFieldName(doc, acroField, semanticName) {
  const terminalDict = acroField.dict
  terminalDict.set(PDFName.of('T'), PDFString.of(semanticName))
  detachFromParentFolder(doc, acroField)
}

/**
 * Split a 2-widget yes/no checkbox into two root fields (left=yes, right=no).
 * @param {PDFDocument} doc
 * @param {import('pdf-lib').PDFForm} form
 * @param {string} acroName
 * @param {string} yesName
 * @param {string} noName
 */
export function splitYesNoCheckbox(doc, form, acroName, yesName, noName) {
  const field = form.getCheckBox(acroName)
  const dict = field.acroField.dict
  const ctx = doc.context
  const kids = dict.lookup(PDFName.of('Kids'), PDFArray)
  if (kids.size() !== 2) {
    throw new Error(`${acroName}: expected 2 widget kids, got ${kids.size()}`)
  }

  const leftRef = kids.get(0)
  const rightRef = kids.get(1)
  const leftWidget = ctx.lookup(leftRef, PDFDict)
  const rightWidget = ctx.lookup(rightRef, PDFDict)
  const leftX = leftWidget.lookup(PDFName.of('Rect'), PDFArray).get(0).asNumber()
  const rightX = rightWidget.lookup(PDFName.of('Rect'), PDFArray).get(0).asNumber()
  const yesRef = leftX <= rightX ? leftRef : rightRef
  const noRef = leftX <= rightX ? rightRef : leftRef

  const yesKids = PDFArray.withContext(ctx)
  yesKids.push(yesRef)
  dict.set(PDFName.of('Kids'), yesKids)
  dict.set(PDFName.of('T'), PDFString.of(yesName))
  ctx.lookup(yesRef, PDFDict).set(PDFName.of('Parent'), dictRef(dict, ctx))
  detachFromParentFolder(doc, field.acroField)

  const noDict = PDFDict.withContext(ctx)
  for (const key of ['FT', 'Ff', 'F', 'V', 'Opt']) {
    const v = dict.get(PDFName.of(key))
    if (v !== undefined) noDict.set(PDFName.of(key), v)
  }
  noDict.set(PDFName.of('T'), PDFString.of(noName))
  const noKids = PDFArray.withContext(ctx)
  noKids.push(noRef)
  noDict.set(PDFName.of('Kids'), noKids)
  const noDictRef = ctx.register(noDict)
  ctx.lookup(noRef, PDFDict).set(PDFName.of('Parent'), noDictRef)
  detachFromParentFolder(doc, field.acroField)
  hoistToRootFieldsArray(doc, noDictRef)
}

/**
 * Rebuild AcroForm /Fields: dedupe hoisted terminal dicts (skip empty parent folders).
 * @param {PDFDocument} doc
 */
export function rebuildAcroFormRootFields(doc) {
  const ctx = doc.context
  const acroFormRef = doc.catalog.get(PDFName.of('AcroForm'))
  if (!acroFormRef) throw new Error('PDF has no AcroForm')
  const acroForm = ctx.lookup(acroFormRef, PDFDict)

  const isWidget = (d) => d.get(PDFName.of('Subtype'))?.asString() === '/Widget'

  const isTerminalFieldDict = (d) => {
    if (!d.get(PDFName.of('T'))) return false
    if (isWidget(d)) return true
    const kids = d.lookup(PDFName.of('Kids'))
    if (!(kids instanceof PDFArray)) return false
    if (kids.size() === 0) return false
    for (let i = 0; i < kids.size(); i++) {
      if (!isWidget(ctx.lookup(kids.get(i), PDFDict))) return false
    }
    return true
  }

  const oldFields = acroForm.lookup(PDFName.of('Fields'), PDFArray)
  const byName = new Map()
  const seenRef = new Set()
  for (let i = 0; i < oldFields.size(); i++) {
    const ref = oldFields.get(i)
    const key = ref.toString()
    if (seenRef.has(key)) continue
    seenRef.add(key)
    const d = ctx.lookup(ref, PDFDict)
    if (!isTerminalFieldDict(d)) continue
    const name = d.get(PDFName.of('T')).decodeText()
    if (/^(Text field \d+|Check Box \d+)$/.test(name)) continue
    if (!byName.has(name)) byName.set(name, ref)
  }

  const newFields = PDFArray.withContext(ctx)
  for (const ref of byName.values()) newFields.push(ref)
  acroForm.set(PDFName.of('Fields'), newFields)
}

/**
 * @param {PDFDocument} doc
 * @param {Record<string, string>} acroToSemantic
 * @param {Array<{ acro: string, yes: string, no: string }>} splits
 */
export function applyFt6600FieldRenames(doc, acroToSemantic, splits) {
  const form = doc.getForm()
  const map = { ...acroToSemantic }
  const splitAcros = new Set(splits.map((s) => s.acro))
  const splitSemantic = new Set(splits.flatMap((s) => [s.yes, s.no]))

  for (const split of splits) {
    splitYesNoCheckbox(doc, form, split.acro, split.yes, split.no)
    delete map[split.acro]
  }

  for (const field of form.getFields()) {
    const oldName = field.getName()
    if (splitAcros.has(oldName) || splitSemantic.has(oldName)) continue
    const semantic = map[oldName]
    if (!semantic) throw new Error(`no semantic rename for field: ${oldName}`)
    setTerminalFieldName(doc, field.acroField, semantic)
    delete map[oldName]
  }

  rebuildAcroFormRootFields(doc)

  if (Object.keys(map).length > 0) {
    throw new Error(`unmapped acro names: ${Object.keys(map).join(', ')}`)
  }
}

/**
 * List unique /T names from AcroForm /Fields (pdf-lib getFields() duplicates names on this template).
 * @param {PDFDocument} doc
 */
export function listFieldNames(doc) {
  const ctx = doc.context
  const acroFormRef = doc.catalog.get(PDFName.of('AcroForm'))
  if (!acroFormRef) return []
  const acroForm = ctx.lookup(acroFormRef, PDFDict)
  const fields = acroForm.lookup(PDFName.of('Fields'), PDFArray)
  const names = []
  for (let i = 0; i < fields.size(); i++) {
    const d = ctx.lookup(fields.get(i), PDFDict)
    const t = d.get(PDFName.of('T'))
    if (t) names.push(t.decodeText())
  }
  return names.sort()
}
