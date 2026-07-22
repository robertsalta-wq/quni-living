/**
 * Living Console platform tile: classify `provider_webhook_health` rows.
 *
 * Never invents a green "all providers" stub. Handles `last_received_at = null`
 * as "no events recorded yet" (Stripe's current state) — watch, not alarm.
 */

export type WebhookHealthRow = {
  provider: string
  last_received_at: string | null
  last_error: string | null
}

export type WebhookZoneRow = {
  tone: 'critical' | 'action' | 'watch' | 'ok'
  text: string
}

export type WebhookAttentionItem = {
  id: string
  tone: 'action' | 'watch'
  text: string
  fixHref: string
}

/** Thresholds in days. Sparse event-driven feeds — DocuSeal can be quiet for weeks. */
export const WEBHOOK_THRESHOLDS_DAYS = {
  docuseal: { watch: 14, action: 30 },
  resend: { watch: 7, action: 14 },
  /** Until Stripe populates the table, null stays watch-only; aged data uses these. */
  stripe: { watch: 7, action: 14 },
} as const

type ProviderKey = keyof typeof WEBHOOK_THRESHOLDS_DAYS

const PROVIDER_ORDER: ProviderKey[] = ['docuseal', 'stripe', 'resend']

function titleCaseProvider(provider: string): string {
  if (provider === 'docuseal') return 'DocuSeal'
  if (provider === 'stripe') return 'Stripe'
  if (provider === 'resend') return 'Resend'
  if (!provider) return 'Provider'
  return provider.charAt(0).toUpperCase() + provider.slice(1)
}

function daysBetween(nowMs: number, iso: string): number {
  return Math.floor((nowMs - new Date(iso).getTime()) / (24 * 60 * 60 * 1000))
}

function formatRelativeAgo(days: number): string {
  if (days <= 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1mo ago' : `${months}mo ago`
}

type ClassifiedProvider = {
  provider: string
  tone: WebhookZoneRow['tone']
  text: string
  escalate: boolean
}

function classifyOne(row: WebhookHealthRow, nowMs: number): ClassifiedProvider {
  const label = titleCaseProvider(row.provider)
  const key = row.provider as ProviderKey
  const thresholds =
    key in WEBHOOK_THRESHOLDS_DAYS
      ? WEBHOOK_THRESHOLDS_DAYS[key]
      : { watch: 7, action: 14 }

  if (row.last_error != null && String(row.last_error).trim() !== '') {
    return {
      provider: row.provider,
      tone: 'action',
      text: `${label} webhook error: ${String(row.last_error).trim()}`,
      escalate: true,
    }
  }

  if (row.last_received_at == null || String(row.last_received_at).trim() === '') {
    return {
      provider: row.provider,
      tone: 'watch',
      text: `${label} — no events recorded yet`,
      // null is not an alarm (Stripe never wired); do not raise AttentionItem
      escalate: false,
    }
  }

  const days = daysBetween(nowMs, row.last_received_at)
  const ago = formatRelativeAgo(days)

  if (days >= thresholds.action) {
    return {
      provider: row.provider,
      tone: 'action',
      text: `${label} last event ${ago}`,
      escalate: true,
    }
  }
  if (days >= thresholds.watch) {
    return {
      provider: row.provider,
      tone: 'watch',
      text: `${label} last event ${ago}`,
      escalate: true,
    }
  }

  return {
    provider: row.provider,
    tone: 'ok',
    text: `${label} healthy · last event ${ago}`,
    escalate: false,
  }
}

export type ClassifyWebhookHealthResult = {
  zoneRows: WebhookZoneRow[]
  attention: WebhookAttentionItem[]
}

/**
 * @param rows — rows from `provider_webhook_health`
 * @param now — injectable clock for tests (Date or ms)
 */
export function classifyWebhookHealth(
  rows: WebhookHealthRow[],
  now: Date | number = Date.now(),
): ClassifyWebhookHealthResult {
  const nowMs = typeof now === 'number' ? now : now.getTime()
  const byProvider = new Map<string, WebhookHealthRow>()
  for (const row of rows) {
    byProvider.set(row.provider, row)
  }

  const classified: ClassifiedProvider[] = []
  for (const provider of PROVIDER_ORDER) {
    const row = byProvider.get(provider) ?? {
      provider,
      last_received_at: null,
      last_error: null,
    }
    classified.push(classifyOne(row, nowMs))
  }

  // Any unexpected providers after the known three
  for (const row of rows) {
    if ((PROVIDER_ORDER as readonly string[]).includes(row.provider)) continue
    classified.push(classifyOne(row, nowMs))
  }

  const zoneRows: WebhookZoneRow[] = classified.map(({ tone, text }) => ({ tone, text }))

  const escalated = classified.filter((c) => c.escalate)
  const attention: WebhookAttentionItem[] = []
  if (escalated.length > 0) {
    const names = escalated.map((c) => titleCaseProvider(c.provider)).join(', ')
    const anyAction = escalated.some((c) => c.tone === 'action')
    attention.push({
      id: 'webhook-health',
      tone: anyAction ? 'action' : 'watch',
      text:
        escalated.length === 1
          ? `${names} webhook needs attention`
          : `Webhook health: ${names}`,
      // No dedicated webhook-health admin page yet — land on Living Console.
      fixHref: '/admin',
    })
  }

  return { zoneRows, attention }
}
