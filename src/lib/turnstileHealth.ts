/** Cloudflare Turnstile errors that mean the widget cannot work for real visitors. */
const CONFIG_ERROR_CODES = new Set(['110100', '110110', '110200', '400020'])

const DAY_MS = 24 * 60 * 60 * 1000

export function isTurnstileConfigError(code: unknown): code is string {
  return typeof code === 'string' && CONFIG_ERROR_CODES.has(code.trim())
}

export function turnstileReportPage(raw: unknown): string {
  if (typeof raw !== 'string') return '/'
  const path = raw.trim().split('?')[0]?.split('#')[0] ?? ''
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || path.length > 200) return '/'
  return path
}

export function turnstileAlertDue(
  existing: { status: string; message: string | null; checked_at: string } | null,
  code: string,
  nowMs: number,
): boolean {
  if (!existing || existing.status !== 'down' || existing.message !== code) return true
  const checked = Date.parse(existing.checked_at)
  if (!Number.isFinite(checked)) return true
  return nowMs - checked >= DAY_MS
}

const reportedThisTab = new Set<string>()

/** Fire-and-forget. Only configuration failures (for example hostname 110200) are sent. */
export function reportTurnstileWidgetError(code: unknown): void {
  if (!isTurnstileConfigError(code)) return
  const trimmed = code.trim()
  if (reportedThisTab.has(trimmed)) return
  reportedThisTab.add(trimmed)
  const page = typeof window !== 'undefined' ? window.location.pathname : '/'
  void fetch('/api/turnstile-health', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: trimmed, page }),
    keepalive: true,
  }).catch(() => {})
}
