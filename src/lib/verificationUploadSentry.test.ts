import { describe, expect, it } from 'vitest'
import { buildVerificationUploadSentryMeta } from './verificationUploadSentry'

describe('buildVerificationUploadSentryMeta', () => {
  it('includes safe metadata only (no filename)', () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'John-Smith-licence.jpg', { type: 'image/jpeg' })
    const meta = buildVerificationUploadSentryMeta(file, 'id', 'student', 'user-123')

    expect(meta).toMatchObject({
      docType: 'id',
      route: 'student',
      userId: 'user-123',
      fileType: 'image/jpeg',
      fileSizeBytes: 3,
      extension: 'jpg',
      heicConversion: false,
    })
    expect(JSON.stringify(meta)).not.toContain('John-Smith')
    expect(JSON.stringify(meta)).not.toContain('licence')
  })

  it('marks HEIC conversion when applicable', () => {
    const file = new File([new Uint8Array([1])], 'scan.heic', { type: 'image/heic' })
    const meta = buildVerificationUploadSentryMeta(file, 'enrolment', 'non-student', 'user-456')

    expect(meta.heicConversion).toBe(true)
    expect(meta.extension).toBe('heic')
  })
})
