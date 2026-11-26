import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}))

import { clearPlacesAccessCache } from './placesAccess.js'
import { requireLandlordOrAdmin } from './placesCaller.js'

const ENV_KEYS = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_JWT_SECRET'] as const

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function signAccessToken(payload: Record<string, unknown>, secret = 'jwt-secret') {
  const header = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`)))
  return `${header}.${body}.${bytesToBase64Url(sig)}`
}

function accessToken(sub: string, email: string, expSecondsFromNow = 3600) {
  return signAccessToken({
    sub,
    email,
    role: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + expSecondsFromNow,
  })
}

afterEach(() => {
  mocks.createClient.mockReset()
  clearPlacesAccessCache()
  vi.unstubAllGlobals()
  for (const key of ENV_KEYS) delete process.env[key]
})

/** HS256 token with no JWT secret configured, so the local check defers to Auth. */
function unverifiedAccessToken() {
  return signAccessToken(
    {
      sub: 'user-1',
      email: 'land@quni.test',
      role: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    'not-the-configured-secret',
  )
}

function authedRequest(token = 'session-token') {
  return new Request('https://quni.test/api/places', {
    headers: { authorization: `Bearer ${token}` },
  })
}

function clientFor(user: { id: string; email?: string } | null, rows: Record<string, { id: string } | null>) {
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user }, error: user ? null : { message: 'invalid' } })),
    },
    from(table: string) {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({ data: rows[table] ?? null, error: null }),
              }
            },
          }
        },
      }
    },
  }
}

describe('requireLandlordOrAdmin', () => {
  it('rejects a signed-out caller before Supabase or Google', async () => {
    const result = await requireLandlordOrAdmin(new Request('https://quni.test/api/places'))
    expect(result).toEqual({ error: 'unauthorized', status: 401 })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('rejects a token that is not a JWT without calling Auth', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'anon'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
    mocks.createClient.mockReturnValue(clientFor(null, {}))
    const result = await requireLandlordOrAdmin(authedRequest('not-a-jwt'))
    expect(result).toEqual({ error: 'unauthorized', status: 401 })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('rejects a well-formed token when Auth also rejects it', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'anon'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
    const client = clientFor(null, {})
    mocks.createClient.mockReturnValue(client)
    const result = await requireLandlordOrAdmin(authedRequest(await unverifiedAccessToken()))
    expect(result).toEqual({ error: 'unauthorized', status: 401 })
    expect(client.auth.getUser).toHaveBeenCalled()
  })

  it('allows a landlord profile', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'anon'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
    mocks.createClient.mockImplementation((_url: string, key: string) =>
      clientFor(key === 'anon' ? { id: 'user-1', email: 'land@quni.test' } : { id: 'user-1', email: 'land@quni.test' }, {
        landlord_profiles: { id: 'lp-1' },
      }),
    )
    const result = await requireLandlordOrAdmin(authedRequest(await unverifiedAccessToken()))
    expect(result.user?.id).toBe('user-1')
  })

  it('allows a platform admin who is not a landlord', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'anon'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
    const user = { id: 'admin-1', email: 'rob@quni.test' }
    mocks.createClient.mockImplementation((_url: string, key: string) =>
      clientFor(key === 'anon' ? user : user, {
        platform_staff: { id: 'staff-1' },
      }),
    )
    const result = await requireLandlordOrAdmin(authedRequest(await unverifiedAccessToken()))
    expect(result.user?.id).toBe('admin-1')
  })

  it('rejects a signed-in account that is neither landlord nor admin', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'anon'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
    const user = { id: 'student-1', email: 'student@quni.test' }
    mocks.createClient.mockImplementation((_url: string, key: string) =>
      clientFor(key === 'anon' ? user : user, {}),
    )
    const result = await requireLandlordOrAdmin(authedRequest(await unverifiedAccessToken()))
    expect(result).toEqual({ error: 'forbidden', status: 403 })
  })

  it('verifies a Supabase JWT locally and skips the auth server', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'anon'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
    process.env.SUPABASE_JWT_SECRET = 'jwt-secret'
    const client = clientFor({ id: 'user-1', email: 'land@quni.test' }, { landlord_profiles: { id: 'lp-1' } })
    mocks.createClient.mockReturnValue(client)
    const token = await accessToken('user-1', 'land@quni.test')
    const result = await requireLandlordOrAdmin(authedRequest(token))
    expect(result.user?.id).toBe('user-1')
    expect(result.pass).toEqual(expect.any(String))
    expect(client.auth.getUser).not.toHaveBeenCalled()
  })

  it('asks Auth when a well-formed token fails the local check', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'anon'
    process.env.SUPABASE_JWT_SECRET = 'jwt-secret'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
    const client = clientFor({ id: 'user-1', email: 'land@quni.test' }, { landlord_profiles: { id: 'lp-1' } })
    mocks.createClient.mockReturnValue(client)
    const forged = await accessToken('user-1', 'land@quni.test')
    const [header, body] = forged.split('.')
    const bad = await requireLandlordOrAdmin(authedRequest(`${header}.${body}.not-a-signature`))
    expect(bad.user?.id).toBe('user-1')
    expect(client.auth.getUser).toHaveBeenCalled()

    const rejected = clientFor(null, {})
    mocks.createClient.mockReturnValue(rejected)
    const expired = await accessToken('user-1', 'land@quni.test', -60)
    const stale = await requireLandlordOrAdmin(authedRequest(expired))
    expect(stale).toEqual({ error: 'unauthorized', status: 401 })
    expect(rejected.auth.getUser).toHaveBeenCalled()
  })

  it('skips the landlord lookup on a later suggestion that carries a fresh pass', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'anon'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
    process.env.SUPABASE_JWT_SECRET = 'jwt-secret'
    mocks.createClient.mockReturnValue(
      clientFor({ id: 'user-1', email: 'land@quni.test' }, { landlord_profiles: { id: 'lp-1' } }),
    )
    const token = await accessToken('user-1', 'land@quni.test')
    const first = await requireLandlordOrAdmin(authedRequest(token))
    expect(first.pass).toEqual(expect.any(String))
    mocks.createClient.mockClear()
    const suggestion = new Request('https://quni.test/api/places?input=buffalo', {
      headers: { authorization: `Bearer ${token}`, 'x-quni-places-pass': first.pass ?? '' },
    })
    const second = await requireLandlordOrAdmin(suggestion, { allowPass: true })
    expect(second.user?.id).toBe('user-1')
    expect(mocks.createClient).not.toHaveBeenCalled()

    const confirm = await requireLandlordOrAdmin(suggestion, { allowPass: false })
    expect(confirm.user?.id).toBe('user-1')
    expect(mocks.createClient).toHaveBeenCalled()
  })

  it('does not treat another user pass as this caller', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'anon'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
    process.env.SUPABASE_JWT_SECRET = 'jwt-secret'
    mocks.createClient.mockReturnValue(clientFor({ id: 'user-1', email: 'land@quni.test' }, { landlord_profiles: { id: 'lp-1' } }))
    const landlordToken = await accessToken('user-1', 'land@quni.test')
    const landlord = await requireLandlordOrAdmin(authedRequest(landlordToken))
    const studentToken = await accessToken('student-1', 'student@quni.test')
    mocks.createClient.mockReturnValue(clientFor({ id: 'student-1', email: 'student@quni.test' }, {}))
    const result = await requireLandlordOrAdmin(
      new Request('https://quni.test/api/places?input=buffalo', {
        headers: { authorization: `Bearer ${studentToken}`, 'x-quni-places-pass': landlord.pass ?? '' },
      }),
      { allowPass: true },
    )
    expect(result).toEqual({ error: 'forbidden', status: 403 })
  })

  it('verifies an ES256 access token from the JWKS and skips Auth', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'anon'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
    const { token, jwk } = await signEs256AccessToken({
      sub: 'user-1',
      email: 'land@quni.test',
      role: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ keys: [jwk] }), { status: 200 })),
    )
    const client = clientFor({ id: 'user-1', email: 'land@quni.test' }, { landlord_profiles: { id: 'lp-1' } })
    mocks.createClient.mockReturnValue(client)
    const result = await requireLandlordOrAdmin(authedRequest(token))
    expect(result.user?.id).toBe('user-1')
    expect(result.pass).toEqual(expect.any(String))
    expect(client.auth.getUser).not.toHaveBeenCalled()
  })

  it('falls back to Auth when an ES256 token does not match the JWKS', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'anon'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
    const { token } = await signEs256AccessToken({
      sub: 'user-1',
      email: 'land@quni.test',
      role: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
    const other = await signEs256AccessToken({
      sub: 'other',
      email: 'other@quni.test',
      role: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ keys: [other.jwk] }), { status: 200 })),
    )
    const client = clientFor({ id: 'user-1', email: 'land@quni.test' }, { landlord_profiles: { id: 'lp-1' } })
    mocks.createClient.mockReturnValue(client)
    const result = await requireLandlordOrAdmin(authedRequest(token))
    expect(result.user?.id).toBe('user-1')
    expect(client.auth.getUser).toHaveBeenCalled()
  })
})

async function signEs256AccessToken(payload: Record<string, unknown>, kid = 'ecc-test') {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey)
  jwk.alg = 'ES256'
  jwk.kid = kid
  jwk.use = 'sig'
  jwk.key_ops = ['verify']
  jwk.ext = true
  const header = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ alg: 'ES256', kid, typ: 'JWT' })))
  const body = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, new TextEncoder().encode(`${header}.${body}`)),
  )
  return { token: `${header}.${body}.${bytesToBase64Url(sig)}`, jwk }
}
