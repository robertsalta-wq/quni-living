import { beforeEach, describe, expect, it, vi } from 'vitest'

const captureException = vi.fn()

vi.mock('@sentry/react', () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}))

import { reportProfilePhotoUploadFailure } from './reportProfilePhotoUploadFailure'

describe('reportProfilePhotoUploadFailure', () => {
  beforeEach(() => {
    captureException.mockClear()
  })

  it('reports plain Storage-like objects and returns their message', () => {
    const msg = reportProfilePhotoUploadFailure(
      { message: 'The resource already exists', statusCode: '409' },
      { surface: 'test', file: { name: 'a.jpg', type: '', size: 12 } },
    )
    expect(msg).toBe('The resource already exists')
    expect(captureException).toHaveBeenCalledTimes(1)
  })

  it('reports Error instances', () => {
    const msg = reportProfilePhotoUploadFailure(new Error('Could not load image'), {
      surface: 'test',
    })
    expect(msg).toBe('Could not load image')
    expect(captureException).toHaveBeenCalledTimes(1)
  })
})
