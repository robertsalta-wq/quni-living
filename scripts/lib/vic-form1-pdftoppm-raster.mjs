/**
 * Rasterize PDF pages via pdftoppm (poppler) inside the pinned LO Docker container.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { dockerContainerSetupScript } from './vic-form1-container-packages.mjs'

/** Matches prior pdfjs scale=2 gate (72dpi × 2). */
export const VIC_FORM1_RASTER_DPI = 144

/**
 * @param {Uint8Array | Buffer} bytes
 * @returns {Buffer}
 */
export function bytesToBuffer(bytes) {
  if (Buffer.isBuffer(bytes)) return bytes
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

/**
 * @param {string} outDir host directory containing pdftoppm output
 * @param {string} prefix basename prefix passed to pdftoppm
 */
export function listPdftoppmPngs(outDir, prefix) {
  const base = path.basename(prefix)
  return fs
    .readdirSync(outDir)
    .filter((f) => f.startsWith(`${base}-`) && f.endsWith('.png'))
    .sort((a, b) => {
      const na = Number.parseInt(a.match(/-(\d+)\.png$/)?.[1] ?? '0', 10)
      const nb = Number.parseInt(b.match(/-(\d+)\.png$/)?.[1] ?? '0', 10)
      return na - nb
    })
    .map((f) => path.join(outDir, f))
}

/**
 * @param {Buffer} pngBuf
 */
export async function measurePngInkRatio(pngBuf) {
  const sharp = (await import('sharp')).default
  const { data, info } = await sharp(pngBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let dark = 0
  const total = info.width * info.height
  for (let i = 0; i < data.length; i += info.channels) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    if (lum < 200) dark++
  }
  return { inkRatio: total > 0 ? dark / total : 0, width: info.width, height: info.height }
}

/**
 * @param {object} opts
 * @param {string} opts.imageRef
 * @param {(imageRef: string, args: string[]) => { stdout: string, stderr: string }} opts.runDocker
 * @param {string} opts.hostPdfPath absolute path under repo root (mounted at /work)
 * @param {string} opts.hostOutDir output directory on host
 * @param {string} opts.repoRoot
 * @param {number} [opts.firstPage] 1-based inclusive
 * @param {number} [opts.lastPage] 1-based inclusive
 * @param {number} [opts.dpi]
 * @returns {string[]} host paths to PNGs in page order
 */
export function pdftoppmPagesDocker(opts) {
  const dpi = opts.dpi ?? VIC_FORM1_RASTER_DPI
  const repoRoot = opts.repoRoot
  const relPdf = path.relative(repoRoot, opts.hostPdfPath).split(path.sep).join('/')
  const relOutDir = path.relative(repoRoot, opts.hostOutDir).split(path.sep).join('/')
  const containerPdf = `/work/${relPdf}`
  const containerOutPrefix = `/work/${relOutDir}/page`
  fs.mkdirSync(opts.hostOutDir, { recursive: true })

  let range = ''
  if (opts.firstPage != null) {
    const last = opts.lastPage ?? opts.firstPage
    range = `-f ${opts.firstPage} -l ${last} `
  }

  const inner = dockerContainerSetupScript(
    `pdftoppm -png -r ${dpi} ${range}${containerPdf} ${containerOutPrefix}`,
  )
  opts.runDocker(opts.imageRef, ['bash', '-lc', inner])

  return listPdftoppmPngs(opts.hostOutDir, path.join(opts.hostOutDir, 'page'))
}

/**
 * @param {object} opts
 * @param {Uint8Array | Buffer} opts.pdfBytes
 * @param {string} opts.imageRef
 * @param {(imageRef: string, args: string[]) => { stdout: string, stderr: string }} opts.runDocker
 * @param {string} opts.repoRoot
 * @param {number} [opts.firstPage]
 * @param {number} [opts.lastPage]
 * @param {number} [opts.dpi]
 */
export function rasterizePdfBytesToPngs(opts) {
  const tmpDir = path.join(opts.repoRoot, 'tmp', 'vic-form1-freeze', `pdftoppm-${crypto.randomUUID()}`)
  fs.mkdirSync(tmpDir, { recursive: true })
  const pdfPath = path.join(tmpDir, 'input.pdf')
  fs.writeFileSync(pdfPath, bytesToBuffer(opts.pdfBytes))
  try {
    return pdftoppmPagesDocker({
      imageRef: opts.imageRef,
      runDocker: opts.runDocker,
      hostPdfPath: pdfPath,
      hostOutDir: tmpDir,
      repoRoot: opts.repoRoot,
      firstPage: opts.firstPage,
      lastPage: opts.lastPage,
      dpi: opts.dpi,
    })
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}
