import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}))

import { requireLandlordOrAdmin } from './placesCaller.js'

const ENV_KEYS = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] as const

afterEach(() => {
  mocks.createClient.mockReset()
  for (const key of ENV_KEYS) delete process.env[key]
})

function authedRequest(token = 'session-token') {
  return new Request('https://quni.test/api/places', {
    headers: { authorization: `Bearer ${token}` },
  })
}

function clientFor(user: { id: string; email?: string } | null, rows: Record<string, { id: string } | null>) {
  return {
    auth: {
      getUser: async () => ({ data: { user }, error: user ? null : { message: 'invalid' } }),
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

  it('rejects an invalid session', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'anon'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
    mocks.createClient.mockReturnValue(clientFor(null, {}))
    const result = await requireLandlordOrAdmin(authedRequest())
    expect(result).toEqual({ error: 'unauthorized', status: 401 })
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
    const result = await requireLandlordOrAdmin(authedRequest())
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
    const result = await requireLandlordOrAdmin(authedRequest())
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
    const result = await requireLandlordOrAdmin(authedRequest())
    expect(result).toEqual({ error: 'forbidden', status: 403 })
  })
})
