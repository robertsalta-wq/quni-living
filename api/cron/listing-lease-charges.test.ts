import { beforeEach, describe, expect, it, vi } from 'vitest'

const settle = vi.fn(async () => ({ settled: 1 }))
const retry = vi.fn(async () => ({ retried: 0 }))
const quarters = vi.fn(async () => ({ opened: 0 }))

vi.mock('../lib/billing/listingLeaseCharge.js', () => ({
  settleStuckPendingLeaseCharges: (...args: unknown[]) => settle(...args),
  retryDueLeaseCharges: (...args: unknown[]) => retry(...args),
  chargeDueLeaseQuarters: (...args: unknown[]) => quarters(...args),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: () => ({}) }),
}))

type NodeRequest = { method: string; headers: { authorization?: string } }

function nodeResponse() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(payload: unknown) {
      res.body = payload
      return res
    },
    end(payload?: unknown) {
      res.body = payload
      return res
    },
  }
  return res
}

describe('listing lease charge cron', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'cron-secret'
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'
    settle.mockClear()
    retry.mockClear()
    quarters.mockClear()
  })

  async function call(request: NodeRequest) {
    const { default: handler } = await import('./listing-lease-charges.js')
    const res = nodeResponse()
    await handler(request, res)
    return res
  }

  it('accepts a Node request when the cron secret matches', async () => {
    const request: NodeRequest = {
      method: 'GET',
      headers: { authorization: 'Bearer cron-secret' },
    }
    expect('get' in request.headers).toBe(false)
    const res = await call(request)
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ ok: true, settled: 1, retried: 0, opened: 0 })
    expect(settle).toHaveBeenCalledOnce()
    expect(retry).toHaveBeenCalledOnce()
    expect(quarters).toHaveBeenCalledOnce()
  })

  it('rejects a Node request when the cron secret does not match', async () => {
    const res = await call({
      method: 'GET',
      headers: { authorization: 'Bearer wrong-secret' },
    })
    expect(res.statusCode).toBe(401)
    expect(res.body).toBe('Unauthorized')
    expect(settle).not.toHaveBeenCalled()
  })
})
