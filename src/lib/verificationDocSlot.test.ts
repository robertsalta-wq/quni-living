import { describe, expect, it } from 'vitest'
import {
  completeVerificationUpload,
  dbPatchForVerificationDoc,
  docFromProfile,
  docStepComplete,
  failVerificationUpload,
  hasUploadedDoc,
  pickVerificationFile,
  resolveUploadedDoc,
  storagePathForVerificationDoc,
} from './verificationDocSlot'

const USER = 'user-abc'
const OLD_PATH = `${USER}/id-document.jpg`
const OLD_AT = '2026-01-01T00:00:00.000Z'

describe('verificationDocSlot', () => {
  it('resolveUploadedDoc prefers local state over profile', () => {
    const profile = docFromProfile(OLD_PATH, OLD_AT)
    const local = {
      filePath: `${USER}/id-document.png`,
      submittedAt: '2026-06-22T10:00:00.000Z',
      displayFileName: 'new.png',
      pending: false,
    }
    expect(resolveUploadedDoc(local, profile)).toEqual(local)
  })

  it('hasUploadedDoc is false while replace is pending', () => {
    const profileFields = { url: OLD_PATH, submittedAt: OLD_AT }
    const uploadedByKind = {
      id: {
        filePath: OLD_PATH,
        submittedAt: '2026-06-22T10:00:00.000Z',
        displayFileName: 'replace.jpg',
        previewUrl: 'blob:preview',
        pending: true,
      },
    }
    expect(hasUploadedDoc('id', uploadedByKind, profileFields)).toBe(false)
    expect(resolveUploadedDoc(uploadedByKind.id, docFromProfile(profileFields.url, profileFields.submittedAt))?.pending).toBe(true)
  })

  it('pickVerificationFile shows pending doc immediately on replace', () => {
    const profileFields = { url: OLD_PATH, submittedAt: OLD_AT }
    const picked = pickVerificationFile(
      {},
      {},
      'id',
      { name: 'passport-new.jpg' },
      profileFields,
      'blob:new-preview',
      '2026-06-22T12:00:00.000Z',
    )

    expect(picked.uploadedByKind.id).toMatchObject({
      filePath: OLD_PATH,
      displayFileName: 'passport-new.jpg',
      previewUrl: 'blob:new-preview',
      pending: true,
    })
    expect(picked.rollbackByKind.id).toMatchObject({
      filePath: OLD_PATH,
      submittedAt: OLD_AT,
    })
  })

  it('completeVerificationUpload clears pending and keeps preview', () => {
    const prev = {
      id: {
        filePath: OLD_PATH,
        submittedAt: '2026-06-22T12:00:00.000Z',
        displayFileName: 'passport-new.jpg',
        previewUrl: 'blob:new-preview',
        pending: true,
      },
    }
    const newPath = `${USER}/id-document.jpg`
    const newAt = '2026-06-22T12:01:00.000Z'
    const next = completeVerificationUpload(prev, 'id', { name: 'passport-new.jpg' }, newPath, newAt)

    expect(next.id).toEqual({
      filePath: newPath,
      submittedAt: newAt,
      displayFileName: 'passport-new.jpg',
      previewUrl: 'blob:new-preview',
      pending: false,
    })
    expect(docStepComplete(next.id ?? null)).toBe(true)
  })

  it('failVerificationUpload restores previous doc on replace failure', () => {
    const rollback = {
      id: {
        filePath: OLD_PATH,
        submittedAt: OLD_AT,
        displayFileName: 'id-document.jpg',
      },
    }
    const prev = {
      id: {
        filePath: OLD_PATH,
        submittedAt: '2026-06-22T12:00:00.000Z',
        displayFileName: 'bad.jpg',
        previewUrl: 'blob:bad',
        pending: true,
      },
    }
    const next = failVerificationUpload(prev, rollback, 'id')
    expect(next.id).toEqual(rollback.id)
    expect(next.id?.pending).toBeUndefined()
  })

  it('storage path changes extension when file type changes on replace', () => {
    expect(storagePathForVerificationDoc(USER, 'id', 'jpg')).toBe(`${USER}/id-document.jpg`)
    expect(storagePathForVerificationDoc(USER, 'id', 'pdf')).toBe(`${USER}/id-document.pdf`)
    expect(dbPatchForVerificationDoc('id', `${USER}/id-document.pdf`, '2026-06-22T12:00:00.000Z')).toEqual({
      id_document_url: `${USER}/id-document.pdf`,
      id_submitted_at: '2026-06-22T12:00:00.000Z',
    })
  })
})
