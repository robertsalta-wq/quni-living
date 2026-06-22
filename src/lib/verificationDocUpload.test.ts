import { describe, expect, it } from 'vitest'
import {
  isAllowedVerificationFile,
  isVerificationHeicOrHeif,
  isVerificationPdf,
  fileLooksLikePdf,
  prepareVerificationDocForUpload,
  validateVerificationFileType,
  verificationExtensionFromFilename,
} from './verificationDocUpload'

describe('verificationExtensionFromFilename', () => {
  it('returns empty when there is no extension', () => {
    expect(verificationExtensionFromFilename('IMG_1234')).toBe('')
    expect(verificationExtensionFromFilename('image')).toBe('')
  })

  it('parses normal extensions', () => {
    expect(verificationExtensionFromFilename('passport.jpg')).toBe('jpg')
    expect(verificationExtensionFromFilename('statement.pdf')).toBe('pdf')
  })
})

describe('isAllowedVerificationFile', () => {
  it('accepts mobile camera roll files with empty MIME and no extension', () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'IMG_1234', { type: '' })
    expect(isAllowedVerificationFile(file)).toBe(true)
    expect(validateVerificationFileType(file)).toBeNull()
  })

  it('accepts JPEG with empty MIME when extension is present', () => {
    const file = new File([new Uint8Array([1])], 'photo.jpg', { type: '' })
    expect(isAllowedVerificationFile(file)).toBe(true)
  })

  it('accepts PDF with octet-stream MIME', () => {
    const file = new File([new Uint8Array([1])], 'bank.pdf', { type: 'application/octet-stream' })
    expect(isAllowedVerificationFile(file)).toBe(true)
    expect(isVerificationPdf(file)).toBe(true)
  })

  it('detects HEIC by extension even when MIME is empty', () => {
    const file = new File([new Uint8Array([1])], 'scan.heic', { type: '' })
    expect(isVerificationHeicOrHeif(file)).toBe(true)
    expect(isAllowedVerificationFile(file)).toBe(true)
  })

  it('accepts WebP from Android Chrome', () => {
    const file = new File([new Uint8Array([1])], 'photo.webp', { type: 'image/webp' })
    expect(isAllowedVerificationFile(file)).toBe(true)
    expect(validateVerificationFileType(file)).toBeNull()
  })

  it('detects PDF by magic bytes when MIME is octet-stream', async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])
    const file = new File([pdfBytes], 'statement', { type: 'application/octet-stream' })
    expect(isVerificationPdf(file)).toBe(false)
    expect(await fileLooksLikePdf(file)).toBe(true)
  })

  it('rejects unknown types with a misleading extension segment', () => {
    const file = new File([new Uint8Array([1])], 'notes.docx', { type: '' })
    expect(isAllowedVerificationFile(file)).toBe(false)
  })
})

describe('prepareVerificationDocForUpload', () => {
  it('uploads JPEG under 15 MB without re-encoding', async () => {
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'id.jpg', { type: 'image/jpeg' })
    const result = await prepareVerificationDocForUpload(file)
    expect(result.storageExt).toBe('jpg')
    expect(result.contentType).toBe('image/jpeg')
    expect(result.blob).toBe(file)
  })

  it('uploads PNG under 15 MB without converting to JPEG', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'scan.png', { type: 'image/png' })
    const result = await prepareVerificationDocForUpload(file)
    expect(result.storageExt).toBe('png')
    expect(result.contentType).toBe('image/png')
    expect(result.blob).toBe(file)
  })

  it('uploads WebP under 15 MB without forcing a decode pass', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'photo.webp', { type: 'image/webp' })
    const result = await prepareVerificationDocForUpload(file)
    expect(result.storageExt).toBe('jpg')
    expect(result.contentType).toBe('image/webp')
    expect(result.blob).toBe(file)
  })

  it('passes PDF through unchanged', async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])
    const file = new File([pdfBytes], 'stmt.pdf', { type: 'application/pdf' })
    const result = await prepareVerificationDocForUpload(file)
    expect(result.storageExt).toBe('pdf')
    expect(result.contentType).toBe('application/pdf')
    expect(result.blob).toBe(file)
  })
})
