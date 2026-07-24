/**
 * HEIC/HEIF handling.
 *
 * Most phone cameras (incl. the user's Android) shoot HEIC/HEIF by default.
 * Browsers outside Safari can't decode that format, so such photos upload but
 * can't be shown in an <img>, opened in a tab, or compressed via canvas
 * (createImageBitmap throws "Could not load image"). We convert HEIC/HEIF to
 * JPEG in the browser before upload so the stored file is viewable everywhere.
 *
 * `heic2any` (libheif WASM) is ~1.3MB, so it is lazy-loaded via dynamic import
 * and only reaches users who actually pick a HEIC/HEIF file.
 */

const HEIC_BRANDS = new Set(['heic', 'heif', 'heix', 'hevc', 'mif1', 'msf1'])

export function isHeicImage(file: File): boolean {
  const type = file.type.toLowerCase()
  if (
    type === 'image/heic' ||
    type === 'image/heif' ||
    type === 'image/heic-sequence' ||
    type === 'image/heif-sequence'
  ) {
    return true
  }
  const name = file.name.toLowerCase()
  return name.endsWith('.heic') || name.endsWith('.heif')
}

/** ISO BMFF `ftyp` brand sniff — Android gallery often clears MIME and uses .jpg. */
export async function fileLooksLikeHeic(file: File): Promise<boolean> {
  if (isHeicImage(file)) return true
  try {
    const buf = new Uint8Array(await file.slice(0, 12).arrayBuffer())
    if (buf.length < 12) return false
    const ftyp = String.fromCharCode(buf[4], buf[5], buf[6], buf[7])
    if (ftyp !== 'ftyp') return false
    const brand = String.fromCharCode(buf[8], buf[9], buf[10], buf[11]).toLowerCase()
    return HEIC_BRANDS.has(brand)
  } catch {
    return false
  }
}

export async function convertHeicToJpeg(file: File, quality = 0.85): Promise<File> {
  const { default: heic2any } = await import('heic2any')
  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality })
  const blob = Array.isArray(out) ? out[0] : out
  const baseName = file.name.replace(/\.(heic|heif|heic-sequence|heif-sequence)$/i, '').trim() || 'photo'
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
}

/**
 * Returns a display-safe image File: HEIC/HEIF is converted to JPEG; any other
 * file is returned unchanged. Safe to call on PDFs/JPEGs/PNGs — it only acts on
 * HEIC/HEIF input.
 */
export async function ensureDisplayableImage(file: File): Promise<File> {
  const looksHeic = await fileLooksLikeHeic(file)
  if (!looksHeic) return file
  const typed =
    file.type.startsWith('image/')
      ? file
      : new File([file], file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')
          ? file.name
          : `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.heic`, { type: 'image/heic' })
  return convertHeicToJpeg(typed)
}
