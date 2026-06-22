import { prepareProfilePhotoForUpload } from './prepareProfilePhotoForUpload'

export const MAX_VERIFICATION_DOC_BYTES = 15 * 1024 * 1024
export const VERIFICATION_FILE_ACCEPT = 'image/*,application/pdf,.heic,.heif,.jpg,.jpeg,.png'
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
  return 'Use a JPEG, PNG, or PDF file.'
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
  return file.type === 'application/pdf' || (rawExt === 'pdf' && !file.type.startsWith('image/'))
}

function contentTypeForVerificationUpload(file: File, storageExt: VerificationStorageExt): string {
  if (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'application/pdf') {
    return file.type
  }
  if (file.type.startsWith('image/')) return file.type
  if (storageExt === 'png') return 'image/png'
  if (storageExt === 'pdf') return 'application/pdf'
  if (storageExt === 'jpg') return 'image/jpeg'
  return 'application/octet-stream'
}

function inferRasterStorageExt(file: File): VerificationStorageExt {
  const rawExt = verificationExtensionFromFilename(file.name)
  if (rawExt === 'png' || file.type === 'image/png') return 'png'
  if (rawExt === 'jpeg' || rawExt === 'jpg' || file.type === 'image/jpeg') return 'jpg'
  // Empty MIME / no extension: treat as JPEG (typical mobile camera roll).
  return 'jpg'
}

export async function prepareVerificationDocForUpload(
  file: File,
): Promise<{ blob: Blob; contentType: string; storageExt: VerificationStorageExt }> {
  if (isVerificationPdf(file)) {
    return {
      blob: file,
      contentType: file.type || 'application/pdf',
      storageExt: 'pdf',
    }
  }

  if (isVerificationHeicOrHeif(file)) {
    const normalized = fileForVerificationImageUpload(file)
    const convertMaxBytes = normalized.size > 1 ? normalized.size - 1 : 0
    const prepared = await prepareProfilePhotoForUpload(normalized, convertMaxBytes)
    if (prepared.ext === 'heic' || prepared.ext === 'heif') {
      throw new Error('Could not convert HEIC image. Save as JPEG in Photos and try again.')
    }
    return {
      blob: prepared.blob,
      contentType: 'image/jpeg',
      storageExt: 'jpg',
    }
  }

  const storageExt = inferRasterStorageExt(file)
  return {
    blob: file,
    contentType: contentTypeForVerificationUpload(file, storageExt),
    storageExt,
  }
}
