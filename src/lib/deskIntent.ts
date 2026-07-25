/**
 * Deterministic intent parsing v1 for the desk-shell search field.
 * No LLM — keyword routes only.
 */

export type DeskIntent =
  | { kind: 'listings'; params: URLSearchParams }
  | { kind: 'landlord'; to: '/signup?role=landlord' }
  | { kind: 'university'; to: '/for-universities' }

const LANDLORD_RE =
  /\b(list my|list a|landlord|spare room|rent out|my (room|property|place|house|flat)|granny flat)\b/i
const UNI_RE = /\b(university|universities|partnership|student housing partner|for (our )?students)\b/i

const UNI_ALIASES: { re: RegExp; q: string }[] = [
  { re: /\b(usyd|uni(versity)? of sydney)\b/i, q: 'University of Sydney' },
  { re: /\b(unsw)\b/i, q: 'UNSW' },
  { re: /\b(uts)\b/i, q: 'UTS' },
  { re: /\b(macquarie|mq)\b/i, q: 'Macquarie' },
  { re: /\b(wsu|western sydney)\b/i, q: 'Western Sydney' },
]

const BUDGET_RE = /\$?\s*(\d{2,4})\s*(?:\/?\s*w(?:ee)?k)?/i

export function parseDeskIntent(raw: string): DeskIntent {
  const text = raw.trim()
  if (LANDLORD_RE.test(text)) return { kind: 'landlord', to: '/signup?role=landlord' }
  if (UNI_RE.test(text) && !/\b(near|at|by)\b/i.test(text)) {
    return { kind: 'university', to: '/for-universities' }
  }

  const params = new URLSearchParams()
  if (text) params.set('q', text)

  for (const { re, q } of UNI_ALIASES) {
    if (re.test(text)) {
      params.set('q', q)
      break
    }
  }

  const budget = text.match(BUDGET_RE)
  if (budget?.[1]) {
    const n = Number(budget[1])
    if (n >= 100 && n <= 2000) params.set('max_rent', String(n))
  }

  if (/\bfurnished\b/i.test(text)) params.set('furnished', '1')

  return { kind: 'listings', params }
}

export function deskIntentToPath(intent: DeskIntent): string {
  if (intent.kind === 'listings') {
    const qs = intent.params.toString()
    return qs ? `/listings?${qs}` : '/listings'
  }
  return intent.to
}
