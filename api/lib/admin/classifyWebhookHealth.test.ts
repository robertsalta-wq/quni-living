import { describe, expect, it } from 'vitest'
import { classifyWebhookHealth, type WebhookHealthRow } from './classifyWebhookHealth.js'

const NOW = new Date('2026-07-23T00:00:00.000Z')

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

function rows(partial: Partial<Record<'docuseal' | 'stripe' | 'resend', Partial<WebhookHealthRow>>>): WebhookHealthRow[] {
  const providers = ['docuseal', 'stripe', 'resend'] as const
  return providers.map((provider) => {
    const override = partial[provider]
    return {
      provider,
      last_received_at:
        override && 'last_received_at' in override ? (override.last_received_at ?? null) : daysAgo(1),
      last_error: override?.last_error ?? null,
    }
  })
}

describe('classifyWebhookHealth', () => {
  it('healthy recent events → ok rows, no attention', () => {
    const result = classifyWebhookHealth(
      rows({
        docuseal: { last_received_at: daysAgo(2) },
        stripe: { last_received_at: daysAgo(1) },
        resend: { last_received_at: daysAgo(1) },
      }),
      NOW,
    )
    expect(result.zoneRows.every((r) => r.tone === 'ok')).toBe(true)
    expect(result.attention).toEqual([])
    expect(result.zoneRows[0].text).toMatch(/DocuSeal healthy/)
  })

  it('null last_received_at → watch "no events", no attention escalate', () => {
    const result = classifyWebhookHealth(
      rows({
        docuseal: { last_received_at: daysAgo(1) },
        stripe: { last_received_at: null },
        resend: { last_received_at: daysAgo(1) },
      }),
      NOW,
    )
    const stripeRow = result.zoneRows.find((r) => r.text.includes('Stripe'))
    expect(stripeRow).toMatchObject({
      tone: 'watch',
      text: 'Stripe — no events recorded yet',
    })
    expect(result.attention).toEqual([])
  })

  it('last_error → action zone + attention item', () => {
    const result = classifyWebhookHealth(
      rows({
        docuseal: { last_error: 'signature verification failed' },
      }),
      NOW,
    )
    expect(result.zoneRows[0]).toMatchObject({
      tone: 'action',
      text: 'DocuSeal webhook error: signature verification failed',
    })
    expect(result.attention).toHaveLength(1)
    expect(result.attention[0]).toMatchObject({
      id: 'webhook-health',
      tone: 'action',
      fixHref: '/admin',
    })
  })

  it('docuseal stale 14d → watch + attention; 30d → action', () => {
    const watchResult = classifyWebhookHealth(
      rows({ docuseal: { last_received_at: daysAgo(14) } }),
      NOW,
    )
    expect(watchResult.zoneRows[0].tone).toBe('watch')
    expect(watchResult.attention).toHaveLength(1)
    expect(watchResult.attention[0].tone).toBe('watch')

    const actionResult = classifyWebhookHealth(
      rows({ docuseal: { last_received_at: daysAgo(30) } }),
      NOW,
    )
    expect(actionResult.zoneRows[0].tone).toBe('action')
    expect(actionResult.attention[0].tone).toBe('action')
  })

  it('resend stale 7d → watch; missing providers filled as null watch', () => {
    const result = classifyWebhookHealth(
      [{ provider: 'resend', last_received_at: daysAgo(7), last_error: null }],
      NOW,
    )
    expect(result.zoneRows).toHaveLength(3)
    const resend = result.zoneRows.find((r) => r.text.startsWith('Resend'))
    expect(resend?.tone).toBe('watch')
    const stripe = result.zoneRows.find((r) => r.text.includes('Stripe'))
    expect(stripe?.text).toMatch(/no events recorded yet/)
  })

  it('does not mention Sentry', () => {
    const result = classifyWebhookHealth(rows({}), NOW)
    expect(result.zoneRows.map((r) => r.text).join(' ')).not.toMatch(/Sentry/i)
  })
})
