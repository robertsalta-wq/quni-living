import { describe, expect, it, vi } from 'vitest'
import { runVerificationDocUpload } from './runVerificationDocUpload'

function makeClient(handlers: {
  upload?: () => Promise<{ error: { message: string } | null }>
  update?: () => Promise<{ error: { message: string } | null }>
}) {
  return {
    storage: {
      from: () => ({
        upload: handlers.upload ?? (async () => ({ error: null })),
      }),
    },
    from: () => ({
      update: () => ({
        eq: handlers.update ?? (async () => ({ error: null })),
      }),
    }),
  } as never
}

describe('runVerificationDocUpload', () => {
  it('uploads to storage then updates student_profiles', async () => {
    const upload = vi.fn(async () => ({ error: null }))
    const updateEq = vi.fn(async () => ({ error: null }))
    const client = {
      storage: { from: () => ({ upload }) },
      from: () => ({ update: () => ({ eq: updateEq }) }),
    } as never

    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'id.jpg', { type: 'image/jpeg' })
    const result = await runVerificationDocUpload(client, 'user-1', 'id', file)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.filePath).toBe('user-1/id-document.jpg')
    expect(upload).toHaveBeenCalledWith(
      'user-1/id-document.jpg',
      expect.any(Blob),
      expect.objectContaining({ upsert: true, contentType: 'image/jpeg' }),
    )
    expect(updateEq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('returns storage error without touching db', async () => {
    const upload = vi.fn(async () => ({ error: { message: 'RLS denied' } }))
    const updateEq = vi.fn(async () => ({ error: null }))
    const client = makeClient({ upload, update: updateEq })

    const file = new File([new Uint8Array([1])], 'id.jpg', { type: 'image/jpeg' })
    const result = await runVerificationDocUpload(client, 'user-1', 'id', file)

    expect(result).toEqual({ ok: false, message: 'RLS denied' })
    expect(updateEq).not.toHaveBeenCalled()
  })

  it('rejects oversize files before network', async () => {
    const upload = vi.fn(async () => ({ error: null }))
    const client = makeClient({ upload })
    const big = new File([new Uint8Array(16 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' })

    const result = await runVerificationDocUpload(client, 'user-1', 'id', big)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toContain('15 MB')
    expect(upload).not.toHaveBeenCalled()
  })
})
