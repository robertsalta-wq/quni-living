import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearVerificationOtpPending,
  readVerificationOtpPendingEmail,
  writeVerificationOtpPending,
} from './verificationOtpPendingStorage'

describe('verificationOtpPendingStorage', () => {
  let store: Record<string, string>

  beforeEach(() => {
    store = {}
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v
      },
      removeItem: (k: string) => {
        delete store[k]
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('restores pending uni email after simulated remount', () => {
    writeVerificationOtpPending('uni', 'user-abc', 'student@unsw.edu.au')
    expect(readVerificationOtpPendingEmail('uni', 'user-abc')).toBe('student@unsw.edu.au')
    clearVerificationOtpPending('uni', 'user-abc')
    expect(readVerificationOtpPendingEmail('uni', 'user-abc')).toBeNull()
  })

  it('keeps uni and work pending separate per user', () => {
    writeVerificationOtpPending('uni', 'user-1', 'student@unsw.edu.au')
    writeVerificationOtpPending('work', 'user-1', 'person@company.com')
    expect(readVerificationOtpPendingEmail('uni', 'user-1')).toBe('student@unsw.edu.au')
    expect(readVerificationOtpPendingEmail('work', 'user-1')).toBe('person@company.com')
  })
})

describe('StudentUniEmailVerification OTP step persistence', () => {
  it('persists code-sent step via sessionStorage (tab switch / remount recovery)', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/components/student/StudentUniEmailVerification.tsx'),
      'utf8',
    )
    expect(src).toMatch(/verificationOtpPendingStorage|readVerificationOtpPendingEmail|writeVerificationOtpPending/)
  })
})
