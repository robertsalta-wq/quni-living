import { apiUrl } from './apiUrl'
import type { QldHouseRuleExtras, QldHouseRulesVariant } from './tenancy/qldHouseRules'

export type DownloadQldHouseRulesPdfInput = {
  variant: QldHouseRulesVariant
  commonAreas: string
  extras: QldHouseRuleExtras
  premisesLine?: string
}

export async function downloadQldHouseRulesPdf(input: DownloadQldHouseRulesPdfInput): Promise<void> {
  const res = await fetch(apiUrl('/api/documents/generate-qld-house-rules'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      variant: input.variant,
      commonAreas: input.commonAreas,
      extras: input.extras,
      premisesLine: input.premisesLine ?? '',
    }),
  })
  if (!res.ok) {
    let message = 'Could not generate the house rules PDF.'
    try {
      const body = (await res.json()) as { error?: string }
      if (typeof body.error === 'string' && body.error.trim()) message = body.error.trim()
    } catch {
      /* keep default */
    }
    throw new Error(message)
  }
  const blob = await res.blob()
  const filename =
    input.variant === 'wall' ? 'qld-house-rules-wall-display.pdf' : 'qld-house-rules-resident-copy.pdf'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
