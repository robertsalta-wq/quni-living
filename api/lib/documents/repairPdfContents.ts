/**
 * DocuSeal inserts literal null tokens into page /Contents arrays.
 * Poppler then paints those pages blank. Drop null and non-stream entries
 * before the signed file is stored. A file that is already clean is returned unchanged.
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PDFArray, PDFDocument, PDFName, PDFNull, PDFObject, PDFRawStream } from 'pdf-lib'
import { captureSentryMessageEdge } from '../sentryEdgeCapture.js'

/** Warnings inherited from the QLD Form 18a template. They do not blank pages. */
export const KNOWN_QPDF_TEMPLATE_WARNING =
  /expected endstream|attempting to recover stream length|recovered stream length|error decoding stream data|stream inflate|incorrect header check|re-processed without filtering|operation succeeded with warnings/i

function isNullObject(value: unknown): boolean {
  if (value == null) return true
  if (value === PDFNull) return true
  return (value as { constructor?: { name?: string } }).constructor?.name === 'PDFNull'
}

function isContentStream(obj: PDFObject | undefined): boolean {
  if (!obj) return false
  const name = obj.constructor?.name ?? ''
  return obj instanceof PDFRawStream || name === 'PDFStream' || name === 'PDFRawStream'
}

export async function repairPdfContents(
  input: Uint8Array,
): Promise<{ bytes: Uint8Array; removed: number }> {
  const doc = await PDFDocument.load(input, { ignoreEncryption: true, updateMetadata: false })
  let removed = 0
  for (const page of doc.getPages()) {
    const looked = page.node.lookup(PDFName.of('Contents'))
    if (!(looked instanceof PDFArray)) continue
    for (let i = looked.size() - 1; i >= 0; i--) {
      let resolved: PDFObject | undefined
      try {
        resolved = looked.lookup(i)
      } catch {
        resolved = undefined
      }
      const direct = looked.get(i)
      const drop = isNullObject(direct) || isNullObject(resolved) || !isContentStream(resolved)
      if (!drop) continue
      looked.remove(i)
      removed += 1
    }
  }
  if (removed === 0) return { bytes: input, removed: 0 }
  const saved = await doc.save({ useObjectStreams: false, addDefaultPage: false })
  return { bytes: saved, removed }
}

export function countNonStreamContents(bytes: Uint8Array): Promise<number> {
  return repairPdfContents(bytes).then((result) => result.removed)
}

export type QpdfCheckResult = {
  available: boolean
  ok: boolean
  output: string
}

export function qpdfCheckBytes(bytes: Uint8Array): QpdfCheckResult {
  const dir = mkdtempSync(join(tmpdir(), 'quni-qpdf-'))
  const file = join(dir, 'in.pdf')
  try {
    writeFileSync(file, bytes)
    const result = spawnSync('qpdf', ['--check', file], { encoding: 'utf8' })
    if (result.error && (result.error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { available: false, ok: true, output: '' }
    }
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
    if (result.status === 0) return { available: true, ok: true, output }
    const warnings = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /WARNING|ERROR/i.test(line))
    const unknown = warnings.filter((line) => !KNOWN_QPDF_TEMPLATE_WARNING.test(line))
    const nullContents = /ignoring non-stream/i.test(output)
    return { available: true, ok: !nullContents && unknown.length === 0, output }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * Repair, then refuse to store a file that still fails qpdf (or still has non-streams
 * when qpdf is not installed, as on the Vercel runtime).
 */
export async function prepareSignedPdfForStorage(
  input: Uint8Array,
  context: { submissionId?: string; path?: string },
): Promise<Uint8Array> {
  const repaired = await repairPdfContents(input)
  const bytes = repaired.bytes
  const check = qpdfCheckBytes(bytes)
  if (check.available && !check.ok) {
    const detail = check.output.slice(0, 1500)
    console.error('[signed-pdf] qpdf check failed after repair', context, detail)
    await captureSentryMessageEdge('Signed PDF failed qpdf check after contents repair', {
      submission_id: context.submissionId ?? '',
      path: context.path ?? '',
      removed: String(repaired.removed),
      qpdf: detail,
    })
    throw new Error('Signed PDF failed qpdf check after repair')
  }
  if (!check.available) {
    const stillBad = (await repairPdfContents(bytes)).removed
    if (stillBad > 0) {
      console.error('[signed-pdf] non-stream contents remain and qpdf is unavailable', context, stillBad)
      await captureSentryMessageEdge('Signed PDF still has non-stream contents and qpdf is unavailable', {
        submission_id: context.submissionId ?? '',
        path: context.path ?? '',
        remaining: String(stillBad),
      })
      throw new Error('Signed PDF still has non-stream contents')
    }
  }
  return bytes
}
