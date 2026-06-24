import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearProfileSectionDraft,
  readProfileSectionDraft,
  writeProfileSectionDraft,
} from './useProfileSectionDraft'

describe('useProfileSectionDraft storage', () => {
  const userId = 'user-1'
  const section = 'personal'
  const store = new Map<string, string>()

  beforeEach(() => {
    store.clear()
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value)
        },
        removeItem: (key: string) => {
          store.delete(key)
        },
      },
    })
  })

  it('round-trips draft JSON in sessionStorage', () => {
    clearProfileSectionDraft(userId, section)
    writeProfileSectionDraft(userId, section, { firstName: 'Sam', lastName: 'Patel' })
    expect(readProfileSectionDraft<{ firstName: string; lastName: string }>(userId, section)).toEqual({
      firstName: 'Sam',
      lastName: 'Patel',
    })
    clearProfileSectionDraft(userId, section)
    expect(readProfileSectionDraft(userId, section)).toBeNull()
  })
})
