import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CHUNK_RELOAD_COOLDOWN_MS,
  CHUNK_RELOAD_QUERY_PARAM,
  CHUNK_RELOAD_SESSION_KEY,
  clearChunkReloadSessionFlag,
  isChunkReloadInCooldown,
  isStaleChunkLoadError,
  recoverFromStaleChunkLoad,
  stripChunkReloadQueryParam,
} from './chunkLoadRecovery'

function stubSessionStorage(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial))
  const api = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v))
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
    clear: () => store.clear(),
  }
  vi.stubGlobal('sessionStorage', api)
  return store
}

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

describe('recoverFromStaleChunkLoad cooldown', () => {
  afterEach(() => {
    clearChunkReloadSessionFlag()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('reloads once then blocks further reloads inside the cooldown window', () => {
    const store = stubSessionStorage()
    const reload = vi.fn()
    vi.stubGlobal('window', {
      location: { href: 'https://quni.com.au/landlord/dashboard', reload },
      history: { state: null, replaceState: vi.fn() },
    })
    const t0 = 1_700_000_000_000

    expect(recoverFromStaleChunkLoad(new TypeError('Loading chunk 12 failed'), t0)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(store.get(CHUNK_RELOAD_SESSION_KEY)).toBe(String(t0))
    expect(isChunkReloadInCooldown(t0 + 1_000)).toBe(true)

    expect(
      recoverFromStaleChunkLoad(
        new TypeError('Failed to fetch dynamically imported module: https://x/a.js'),
        t0 + 5_000,
      ),
    ).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('allows another reload after the cooldown elapses (later deploy same tab)', () => {
    stubSessionStorage()
    const reload = vi.fn()
    vi.stubGlobal('window', {
      location: { href: 'https://quni.com.au/landlord/dashboard', reload },
      history: { state: null, replaceState: vi.fn() },
    })
    const t0 = 1_700_000_000_000

    expect(recoverFromStaleChunkLoad(new TypeError('ChunkLoadError'), t0)).toBe(true)
    expect(
      recoverFromStaleChunkLoad(new TypeError('ChunkLoadError'), t0 + CHUNK_RELOAD_COOLDOWN_MS),
    ).toBe(true)
    expect(reload).toHaveBeenCalledTimes(2)
  })

  it('treats legacy flag value "1" as already in cooldown', () => {
    stubSessionStorage({ [CHUNK_RELOAD_SESSION_KEY]: '1' })
    vi.stubGlobal('window', {
      location: { href: 'https://quni.com.au/' },
      history: { state: null, replaceState: vi.fn() },
    })
    expect(isChunkReloadInCooldown(Date.now())).toBe(true)
  })

  it('uses ?_qcr= when sessionStorage cannot persist across reloads', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    })
    const replace = vi.fn()
    const t0 = 1_700_000_000_000
    vi.stubGlobal('window', {
      location: {
        href: 'https://quni.com.au/landlord/dashboard',
        reload: vi.fn(),
        replace,
      },
      history: { state: null, replaceState: vi.fn() },
    })

    expect(recoverFromStaleChunkLoad(new TypeError('ChunkLoadError'), t0)).toBe(true)
    expect(replace).toHaveBeenCalledWith(
      `https://quni.com.au/landlord/dashboard?${CHUNK_RELOAD_QUERY_PARAM}=${t0}`,
    )

    vi.stubGlobal('window', {
      location: {
        href: `https://quni.com.au/landlord/dashboard?${CHUNK_RELOAD_QUERY_PARAM}=${t0}`,
        reload: vi.fn(),
        replace: vi.fn(),
      },
      history: { state: null, replaceState: vi.fn() },
    })
    expect(isChunkReloadInCooldown(t0 + 1_000)).toBe(true)
    expect(recoverFromStaleChunkLoad(new TypeError('ChunkLoadError'), t0 + 1_000)).toBe(false)
  })

  it('stripChunkReloadQueryParam removes the marker without clearing storage cooldown', () => {
    const store = stubSessionStorage({ [CHUNK_RELOAD_SESSION_KEY]: '1700000000000' })
    const replaceState = vi.fn()
    vi.stubGlobal('window', {
      location: {
        href: `https://quni.com.au/landlord/dashboard?tab=overview&${CHUNK_RELOAD_QUERY_PARAM}=1700000000000`,
      },
      history: { state: { x: 1 }, replaceState },
    })

    stripChunkReloadQueryParam()
    expect(replaceState).toHaveBeenCalledWith(
      { x: 1 },
      '',
      '/landlord/dashboard?tab=overview',
    )
    expect(store.get(CHUNK_RELOAD_SESSION_KEY)).toBe('1700000000000')
  })

  it('does not reload for non-chunk errors', () => {
    stubSessionStorage()
    const reload = vi.fn()
    vi.stubGlobal('window', {
      location: { href: 'https://quni.com.au/', reload },
      history: { state: null, replaceState: vi.fn() },
    })
    expect(recoverFromStaleChunkLoad(new Error('boom'), 1_700_000_000_000)).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })
})
