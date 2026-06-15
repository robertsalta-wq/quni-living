/**
 * Rasterize VIC Form 1 PDFs via pdftoppm (poppler). Host pdftoppm first; Docker fallback when available.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

/** Matches prior pdfjs scale=2 gate (72dpi × 2). */
export const VIC_FORM1_RASTER_DPI = 144

const LO_DOCKER_IMAGE =
  'lankalana/libreoffice-headless@sha256:73910b51dabfbc32234f0d14d7f64751e8c5414e380d191647a41e7f81975c7b'

export function pdftoppmAvailable(): boolean {
  try {
    execFileSync('pdftoppm', ['-v'], { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

function dockerAvailable(): boolean {
  try {
    execFileSync('docker', ['--version'], { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

function runDocker(repoRoot: string, imageRef: string, inner: string): void {
  const r = spawnSync(
    'docker',
    ['run', '--rm', '-v', `${repoRoot}:/work`, '-w', '/work', imageRef, 'bash', '-lc', inner],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  )
  if (r.status !== 0) {
    throw new Error(`docker pdftoppm failed (${r.status}): ${r.stderr || r.stdout}`)
  }
}

function listPdftoppmPngs(outDir: string, prefixBase: string): string[] {
  const base = path.basename(prefixBase)
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

export type RasterizePdfOptions = {
  repoRoot: string
  dpi?: number
  firstPage?: number
  lastPage?: number
}

/** Rasterize PDF bytes to PNG file paths (page order). Caller should rm tmpDir when done. */
export function rasterizePdfBytesToPngPaths(
  pdfBytes: Uint8Array,
  opts: RasterizePdfOptions,
): { tmpDir: string; pngPaths: string[] } {
  const dpi = opts.dpi ?? VIC_FORM1_RASTER_DPI
  const repoRoot = opts.repoRoot
  const tmpDir = path.join(repoRoot, 'tmp', 'vic-form1-verify', `pdftoppm-${crypto.randomUUID()}`)
  fs.mkdirSync(tmpDir, { recursive: true })

  const pdfPath = path.join(tmpDir, 'input.pdf')
  fs.writeFileSync(pdfPath, Buffer.from(pdfBytes))
  const outPrefix = path.join(tmpDir, 'page')

  const first = opts.firstPage ?? 1
  const last = opts.lastPage ?? first
  const rangeArgs =
    opts.firstPage != null ? ['-f', String(first), '-l', String(last)] : []

  if (pdftoppmAvailable()) {
    execFileSync(
      'pdftoppm',
      ['-png', '-r', String(dpi), ...rangeArgs, pdfPath, outPrefix],
      { stdio: 'pipe' },
    )
  } else if (dockerAvailable()) {
    const relPdf = path.relative(repoRoot, pdfPath).split(path.sep).join('/')
    const relPrefix = path.relative(repoRoot, outPrefix).split(path.sep).join('/')
    const range = opts.firstPage != null ? `-f ${first} -l ${last} ` : ''
    runDocker(
      repoRoot,
      LO_DOCKER_IMAGE,
      `pdftoppm -png -r ${dpi} ${range}/work/${relPdf} /work/${relPrefix}`,
    )
  } else {
    fs.rmSync(tmpDir, { recursive: true, force: true })
    throw new Error('pdftoppm not on PATH and Docker unavailable — cannot rasterize for verification gates')
  }

  const pngPaths = listPdftoppmPngs(tmpDir, outPrefix)
  if (pngPaths.length === 0) {
    fs.rmSync(tmpDir, { recursive: true, force: true })
    throw new Error('pdftoppm produced no PNG output')
  }

  return { tmpDir, pngPaths }
}

export function cleanupRasterTmp(tmpDir: string): void {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  } catch {
    /* ignore */
  }
}
