import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { archiveDocusealSubmission, normalizeDocusealSubmissionId } from './docusealArchive.js'

describe('normalizeDocusealSubmissionId', () => {
  it('accepts numeric string ids from DocuSeal create response', () => {
    expect(normalizeDocusealSubmissionId('12345')).toBe('12345')
  })

  it('rejects non-numeric slugs', () => {
    expect(normalizeDocusealSubmissionId('abc-slug')).toBeNull()
  })
})

describe('archiveDocusealSubmission', () => {
  beforeEach(() => {
    process.env.DOCUSEAL_API_URL = 'https://docuseal.example'
    process.env.DOCUSEAL_API_TOKEN = 'token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('DELETEs /api/submissions/{numericId} with X-Auth-Token', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, text: async () => '' }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await archiveDocusealSubmission('99')

    expect(result).toEqual({ ok: true, outcome: 'archived' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://docuseal.example/api/submissions/99',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({ 'X-Auth-Token': 'token' }),
      }),
    )
  })

  it('treats 404 as already_gone', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404, text: async () => 'not found' })),
    )

    const result = await archiveDocusealSubmission('88')
    expect(result).toEqual({ ok: true, outcome: 'already_gone' })
  })

  it('skips when no submission id', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await archiveDocusealSubmission(null)
    expect(result).toEqual({ ok: true, outcome: 'skipped_no_id' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
