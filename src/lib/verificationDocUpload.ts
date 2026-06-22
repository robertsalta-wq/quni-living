import { prepareProfilePhotoForUpload } from './prepareProfilePhotoForUpload'

export const MAX_VERIFICATION_DOC_BYTES = 15 * 1024 * 1024
export const VERIFICATION_FILE_ACCEPT = 'image/*,application/pdf'
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

  const normalized = fileForVerificationImageUpload(file)
  const prepared = await prepareProfilePhotoForUpload(normalized, MAX_VERIFICATION_DOC_BYTES)

  const keepPng =
    (normalized.type === 'image/png' || verificationExtensionFromFilename(normalized.name) === 'png') &&
    prepared.ext === 'png' &&
    prepared.contentType === 'image/png'

  if (keepPng) {
    return { blob: prepared.blob, contentType: 'image/png', storageExt: 'png' }
  }

  if (prepared.contentType === 'image/jpeg' || prepared.ext === 'jpg' || prepared.ext === 'jpeg') {
    return { blob: prepared.blob, contentType: 'image/jpeg', storageExt: 'jpg' }
  }

  const convertMaxBytes = normalized.size > 1 ? normalized.size - 1 : 0
  const jpegPrepared = await prepareProfilePhotoForUpload(normalized, convertMaxBytes)
  if (jpegPrepared.ext === 'heic' || jpegPrepared.ext === 'heif') {
    throw new Error('Could not convert HEIC image. Save as JPEG in Photos and try again.')
  }
  return { blob: jpegPrepared.blob, contentType: 'image/jpeg', storageExt: 'jpg' }
}
