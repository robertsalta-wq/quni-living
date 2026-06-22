import { describe, expect, it } from 'vitest'
import {
  isAllowedVerificationFile,
  isVerificationHeicOrHeif,
  isVerificationPdf,
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

  it('rejects unknown types with a misleading extension segment', () => {
    const file = new File([new Uint8Array([1])], 'notes.docx', { type: '' })
    expect(isAllowedVerificationFile(file)).toBe(false)
  })
})
