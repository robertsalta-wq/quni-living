/**
 * HEIC/HEIF handling.
 *
 * Most phone cameras (incl. the user's Android) shoot HEIC/HEIF by default.
 * Browsers outside Safari can't decode that format, so such photos upload but
 * can't be shown in an <img>, opened in a tab, or compressed via canvas
 * (createImageBitmap throws "Could not load image"). We convert HEIC/HEIF to
 * JPEG in the browser before upload so the stored file is viewable everywhere.
 *
 * `heic2any` (libheif WASM) is ~1.5MB, so it is lazy-loaded via dynamic import
 * and only reaches users who actually pick a HEIC/HEIF file.
 */

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
  if (!isHeicImage(file)) return file
  return convertHeicToJpeg(file)
}
