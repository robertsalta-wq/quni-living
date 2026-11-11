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

describe('listing lease charge cron', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'cron-secret'
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'
    settle.mockClear()
    retry.mockClear()
    quarters.mockClear()
  })

  async function call(request: NodeRequest): Promise<Response> {
    const { default: handler } = await import('./listing-lease-charges.js')
    return handler(request)
  }

  it('accepts a Node request when the cron secret matches', async () => {
    const request: NodeRequest = {
      method: 'GET',
      headers: { authorization: 'Bearer cron-secret' },
    }
    expect('get' in request.headers).toBe(false)
    const res = await call(request)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ ok: true, settled: 1, retried: 0, opened: 0 })
    expect(settle).toHaveBeenCalledOnce()
    expect(retry).toHaveBeenCalledOnce()
    expect(quarters).toHaveBeenCalledOnce()
  })

  it('rejects a Node request when the cron secret does not match', async () => {
    const res = await call({
      method: 'GET',
      headers: { authorization: 'Bearer wrong-secret' },
    })
    expect(res.status).toBe(401)
    expect(settle).not.toHaveBeenCalled()
  })
})
