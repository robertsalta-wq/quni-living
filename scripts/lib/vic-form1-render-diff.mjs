/**
 * Layout determinism gate for VIC Form 1 blank PDF: pdftoppm raster compare (not pdfjs).
 */
import fs from 'node:fs'
import path from 'node:path'
import { bytesToBuffer, measurePngInkRatio, pdftoppmPagesDocker, VIC_FORM1_RASTER_DPI } from './vic-form1-pdftoppm-raster.mjs'

/**
 * @param {Uint8Array | Buffer} a
 * @param {Uint8Array | Buffer} b
 */
async function comparePngBuffers(a, b) {
  const sharp = (await import('sharp')).default
  const imgA = await sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const imgB = await sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  if (imgA.info.width !== imgB.info.width || imgA.info.height !== imgB.info.height) {
    return {
      ok: false,
      reason: `size ${imgA.info.width}x${imgA.info.height} vs ${imgB.info.width}x${imgB.info.height}`,
      maxDiffPixels: null,
    }
  }
  let maxDiffPixels = 0
  const channels = Math.min(imgA.info.channels, 3)
  for (let i = 0; i < imgA.data.length; i += imgA.info.channels) {
    for (let c = 0; c < channels; c++) {
      if (imgA.data[i + c] !== imgB.data[i + c]) {
        maxDiffPixels++
        break
      }
    }
  }
  return { ok: maxDiffPixels === 0, reason: maxDiffPixels === 0 ? null : `${maxDiffPixels} pixels differ`, maxDiffPixels }
}

/**
 * @param {Uint8Array | Buffer} officialBytes
 * @param {Uint8Array | Buffer} renamedBytes
 * @param {{ imageRef: string, runDocker: Function, repoRoot: string }} docker
 */
export async function renderDiffVicForm1Pair(officialBytes, renamedBytes, docker) {
  const tmpRoot = path.join(docker.repoRoot, 'tmp', 'vic-form1-freeze', `render-diff-${Date.now()}`)
  const dirA = path.join(tmpRoot, 'a')
  const dirB = path.join(tmpRoot, 'b')
  fs.mkdirSync(dirA, { recursive: true })
  fs.mkdirSync(dirB, { recursive: true })

  const pdfA = path.join(dirA, 'input.pdf')
  const pdfB = path.join(dirB, 'input.pdf')
  fs.writeFileSync(pdfA, bytesToBuffer(officialBytes))
  fs.writeFileSync(pdfB, bytesToBuffer(renamedBytes))

  try {
    const pngsA = pdftoppmPagesDocker({
      imageRef: docker.imageRef,
      runDocker: docker.runDocker,
      hostPdfPath: pdfA,
      hostOutDir: dirA,
      repoRoot: docker.repoRoot,
      dpi: VIC_FORM1_RASTER_DPI,
    })
    const pngsB = pdftoppmPagesDocker({
      imageRef: docker.imageRef,
      runDocker: docker.runDocker,
      hostPdfPath: pdfB,
      hostOutDir: dirB,
      repoRoot: docker.repoRoot,
      dpi: VIC_FORM1_RASTER_DPI,
    })

    if (pngsA.length !== pngsB.length) {
      return {
        attempted: true,
        ok: false,
        rasterizer: 'pdftoppm',
        reason: `page count ${pngsA.length} vs ${pngsB.length}`,
        maxDiffPixels: null,
        pagesCompared: 0,
        dpi: VIC_FORM1_RASTER_DPI,
      }
    }

    let maxDiffPixels = 0
    let pagesCompared = 0
    let failReason = null

    for (let p = 0; p < pngsA.length; p++) {
      const inkA = await measurePngInkRatio(fs.readFileSync(pngsA[p]))
      const inkB = await measurePngInkRatio(fs.readFileSync(pngsB[p]))
      if (inkA.inkRatio === 0 || inkB.inkRatio === 0) {
        return {
          attempted: true,
          ok: false,
          rasterizer: 'pdftoppm',
          reason: `page ${p + 1} blank raster (inkA=${inkA.inkRatio} inkB=${inkB.inkRatio})`,
          maxDiffPixels: null,
          pagesCompared: p,
          dpi: VIC_FORM1_RASTER_DPI,
        }
      }
      const cmp = await comparePngBuffers(fs.readFileSync(pngsA[p]), fs.readFileSync(pngsB[p]))
      if (!cmp.ok) {
        failReason = `page ${p + 1}: ${cmp.reason}`
        maxDiffPixels = Math.max(maxDiffPixels, cmp.maxDiffPixels ?? 0)
        break
      }
      maxDiffPixels = Math.max(maxDiffPixels, cmp.maxDiffPixels ?? 0)
      pagesCompared++
    }

    return {
      attempted: true,
      ok: failReason == null && maxDiffPixels === 0,
      rasterizer: 'pdftoppm',
      reason: failReason ?? (maxDiffPixels === 0 ? null : `${maxDiffPixels} pixels differ`),
      maxDiffPixels,
      pagesCompared,
      dpi: VIC_FORM1_RASTER_DPI,
    }
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  }
}
