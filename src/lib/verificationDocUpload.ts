import { prepareProfilePhotoForUpload } from './prepareProfilePhotoForUpload'
import { ensureDisplayableImage } from './convertHeicImage'

export const MAX_VERIFICATION_DOC_BYTES = 15 * 1024 * 1024
/** Photo ID — images only; avoids Android Chrome bugs with mixed accept lists. */
export const VERIFICATION_ID_FILE_ACCEPT = 'image/*'
/**
 * Enrolment / supporting docs accept images AND PDFs. We intentionally set NO
 * `accept` filter here: a mixed `image/*,.pdf,application/pdf` list makes Android
 * Chrome silently drop the input's `change` event when the user picks a photo
 * (PDF picks still fire). With no filter the picker offers camera/gallery/files,
 * `change` fires for every type, and JS (`validateVerificationFileType` + the PDF
 * magic-byte check) rejects anything that isn't an image or PDF after selection.
 */
export const VERIFICATION_SUPPORTING_FILE_ACCEPT: string | undefined = undefined
export const CHOOSE_VERIFICATION_FILE_LABEL = 'Choose file (JPEG, PNG or PDF, max 15 MB)'

export type VerificationStorageExt = 'jpg' | 'png' | 'pdf'

export function verificationExtensionFromFilename(name: string): string {
  const trimmed = name.trim()
  const lastDot = trimmed.lastIndexOf('.')
  if (lastDot <= 0 || lastDot === trimmed.length - 1) return ''
  const ext = trimmed.slice(lastDot + 1).toLowerCase()
  return /^[a-z0-9]+$/i.test(ext) ? ext : ''
}

function isAllowedVerificationExtension(ext: string): boolean {
  return ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'pdf' || ext === 'heic' || ext === 'heif'
}

function isAllowedVerificationMime(file: File): boolean {
  return file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'application/pdf'
}

export function isVerificationHeicOrHeif(file: File): boolean {
  const ext = verificationExtensionFromFilename(file.name)
  return ext === 'heic' || ext === 'heif' || file.type === 'image/heic' || file.type === 'image/heif'
}

/** Mobile browsers often leave `file.type` empty and omit file extensions. */
export function isAllowedVerificationFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  if (isAllowedVerificationMime(file)) return true
  if (isVerificationHeicOrHeif(file)) return true

  const ext = verificationExtensionFromFilename(file.name)

  if (file.type === 'application/octet-stream') {
    return ext === '' || isAllowedVerificationExtension(ext)
  }

  if (!file.type) {
    if (isAllowedVerificationExtension(ext)) return true
    // Camera roll picks often have no extension (e.g. "IMG_1234").
    return ext === ''
  }

  return false
}

export function validateVerificationFileSize(file: File, maxBytes = MAX_VERIFICATION_DOC_BYTES): string | null {
  if (file.size > maxBytes) return 'File must be 15 MB or smaller.'
  return null
}

export function validateVerificationFileType(file: File): string | null {
  if (isAllowedVerificationFile(file)) return null
  return 'Use a photo (JPEG, PNG, etc.) or PDF file.'
}

function fileForVerificationImageUpload(file: File): File {
  if (file.type.startsWith('image/')) return file
  const ext = verificationExtensionFromFilename(file.name)
  const mime =
    ext === 'png'
      ? 'image/png'
      : ext === 'heic' || ext === 'heif'
        ? 'image/heic'
        : 'image/jpeg'
  return new File([file], file.name, { type: mime })
}

export function isVerificationPdf(file: File): boolean {
  const rawExt = verificationExtensionFromFilename(file.name)
  if (file.type === 'application/pdf') return true
  if (rawExt === 'pdf') return true
  return false
}

/** Mobile file pickers often label PDFs as octet-stream with no extension. */
export async function fileLooksLikePdf(file: File): Promise<boolean> {
  if (isVerificationPdf(file)) return true
  if (file.type.startsWith('image/')) return false
  try {
    const head = new Uint8Array(await file.slice(0, 4).arrayBuffer())
    return head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46
  } catch {
    return false
  }
}

function contentTypeForVerificationImage(file: File): string {
  if (file.type.startsWith('image/')) return file.type
  const ext = verificationExtensionFromFilename(file.name)
  if (ext === 'png') return 'image/png'
  if (ext === 'heic') return 'image/heic'
  if (ext === 'heif') return 'image/heif'
  if (ext === 'webp') return 'image/webp'
  return 'image/jpeg'
}

function storageExtForVerificationImage(file: File): VerificationStorageExt {
  const ext = verificationExtensionFromFilename(file.name)
  if (ext === 'png') return 'png'
  return 'jpg'
}

export async function prepareVerificationDocForUpload(
  file: File,
): Promise<{ blob: Blob; contentType: string; storageExt: VerificationStorageExt }> {
  if (await fileLooksLikePdf(file)) {
    return {
      blob: file,
      contentType: 'application/pdf',
      storageExt: 'pdf',
    }
  }

  // HEIC/HEIF can't be rendered by browsers — convert to JPEG so the stored
  // document is viewable (and so the resize path below can decode it).
  const displayable = await ensureDisplayableImage(file)
  const normalized = fileForVerificationImageUpload(displayable)

  // Under the 15 MB client cap, upload bytes as picked — same idea as profile photos under 2 MB.
  // Avoids decode/resize passes that fail on Android gallery picks (WebP, HEIC, screenshots).
  if (normalized.size <= MAX_VERIFICATION_DOC_BYTES) {
    return {
      blob: normalized,
      contentType: contentTypeForVerificationImage(normalized),
      storageExt: storageExtForVerificationImage(normalized),
    }
  }

  const prepared = await prepareProfilePhotoForUpload(normalized, MAX_VERIFICATION_DOC_BYTES)
  return {
    blob: prepared.blob,
    contentType: prepared.contentType,
    storageExt: prepared.ext === 'png' ? 'png' : 'jpg',
  }
}
