import { describe, expect, it } from 'vitest'
import { isStaleChunkLoadError } from './chunkLoadRecovery'

describe('isStaleChunkLoadError', () => {
  it('detects MIME type failures from HTML chunk responses', () => {
    expect(
      isStaleChunkLoadError(
        new TypeError("'text/html' is not a valid JavaScript MIME type."),
      ),
    ).toBe(true)
  })

  it('detects failed dynamic import messages', () => {
    expect(
      isStaleChunkLoadError(
        new TypeError(
          'Failed to fetch dynamically imported module: https://quni.com.au/assets/AdminLayout-Bck3c5s4.js',
        ),
      ),
    ).toBe(true)
  })

  it('ignores unrelated errors', () => {
    expect(isStaleChunkLoadError(new Error('Network request failed'))).toBe(false)
  })
})
