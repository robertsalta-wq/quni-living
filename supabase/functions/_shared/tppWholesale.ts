/**
 * TPP Wholesale HTTP API (official Domain Specs PDF §1.0, §3.4, §3.5).
 * Auth: GET auth.pl?AccountNo=&UserId=&Password= → "OK: <SessionID>" or "ERR: <code>"
 * Query: GET query.pl?SessionID=&Type=Domains&Object=Domain&Action=List|Details&...
 *
 * @see https://www.tppwholesale.com.au/wp-content/uploads/2023/10/2.7.4_TPPW_HTTP_API_Domain_Specs.pdf
 */

export const TPP_AUTH_URL = 'https://theconsole.tppwholesale.com.au/api/auth.pl'
export const TPP_QUERY_URL = 'https://theconsole.tppwholesale.com.au/api/query.pl'

export type TppEnv = {
  /** Maps to API Login Credentials → Login (UserId). */
  user: string
  password: string
  /** Maps to API Login Credentials → Account NO (AccountNo). Required for auth.pl. */
  accountNum: string
}

export type TppDomainRow = {
  domain: string
  expiryDate: string | null
  daysUntilExpiry: number | null
  status: string | null
  lockStatus: string | null
  nameservers: string[]
  autoRenew: boolean | null
}

export class TppApiError extends Error {
  readonly code: string
  readonly detail: string
  readonly rawBody: string

  constructor(code: string, detail: string, rawBody: string) {
    super(detail ? `${code}: ${detail}` : code)
    this.name = 'TppApiError'
    this.code = code
    this.detail = detail
    this.rawBody = rawBody
  }
}

function firstIgnoreCase(params: Map<string, string[]>, key: string): string | undefined {
  const k = key.toLowerCase()
  for (const [name, vals] of params) {
    if (name.toLowerCase() === k) {
      const s = vals[0]?.trim()
      if (s) return s
    }
  }
  return undefined
}

function allValuesIgnoreCase(params: Map<string, string[]>, key: string): string[] {
  const k = key.toLowerCase()
  const out: string[] = []
  for (const [name, vals] of params) {
    if (name.toLowerCase() === k) {
      for (const v of vals) {
        const t = v.trim()
        if (t) out.push(t)
      }
    }
  }
  return out
}

/** Parse "Key = Value" lines after an OK: header (domain details). */
export function parseTppDetailLines(body: string): Map<string, string[]> {
  const map = new Map<string, string[]>()
  const trimmed = body.trim()
  const afterOk = trimmed.replace(/^OK:\s*/i, '').trim()
  for (const line of afterOk.split(/\r?\n/)) {
    const t = line.trim()
    if (!t) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const rawKey = t.slice(0, eq).trim()
    const val = t.slice(eq + 1).trim()
    if (!rawKey) continue
    const list = map.get(rawKey)
    if (list) list.push(val)
    else map.set(rawKey, [val])
  }
  return map
}

export async function tppAuthenticate(env: TppEnv): Promise<string> {
  const accountNo = env.accountNum.trim()
  if (!accountNo) {
    throw new TppApiError('CONFIG', 'TPP_ACCOUNT_NUM (AccountNo) is required for TPP auth.pl', '')
  }

  const qs = new URLSearchParams({
    AccountNo: accountNo,
    UserId: env.user,
    Password: env.password,
  })

  const res = await fetch(`${TPP_AUTH_URL}?${qs.toString()}`, { method: 'GET' })
  const text = await res.text()
  const trimmed = text.trim()

  if (trimmed.startsWith('ERR:')) {
    const rest = trimmed.slice(4).trim()
    const code = rest.split(/\s+/)[0] ?? 'ERR'
    throw new TppApiError(
      code,
      rest || 'Authentication failed (see TPP error codes 102 / 105 in API spec)',
      text,
    )
  }

  const m = /^OK:\s*(.+)$/im.exec(trimmed)
  if (!m?.[1]?.trim()) {
    throw new TppApiError(
      'BAD_RESPONSE',
      'auth.pl did not return OK: <session> or ERR: <code> (check credentials, IP allowlist, and AccountNo/UserId field names per TPP API spec)',
      text.slice(0, 2000),
    )
  }

  const sessionId = m[1].trim().replace(/^\((.*)\)$/, '$1').trim()
  if (!sessionId) {
    throw new TppApiError('BAD_RESPONSE', 'Empty session id after OK:', text.slice(0, 2000))
  }

  if (!res.ok) {
    throw new TppApiError(String(res.status), res.statusText || 'HTTP error', text)
  }

  return sessionId
}

async function fetchQueryPl(params: Record<string, string>): Promise<string> {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${TPP_QUERY_URL}?${qs}`, { method: 'GET' })
  const text = await res.text()
  if (!res.ok) {
    throw new TppApiError(String(res.status), res.statusText || 'query.pl HTTP error', text)
  }
  return text
}

function parseDomainListResponse(text: string): string[] {
  const trimmed = text.trim()
  if (trimmed.startsWith('ERR:')) {
    const rest = trimmed.slice(4).trim()
    const code = rest.split(/\s+/)[0] ?? 'ERR'
    throw new TppApiError(code, 'Domain list query failed', text)
  }

  if (!trimmed.toUpperCase().startsWith('OK:')) {
    throw new TppApiError('BAD_RESPONSE', 'Expected OK: or ERR: from domain list', text.slice(0, 2000))
  }

  const rest = trimmed.replace(/^OK:\s*/i, '').trim()
  const lines = rest.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

  const domains: string[] = []
  for (const line of lines) {
    const parts = line.split(',')
    const domain = parts[0]?.trim().toLowerCase()
    if (domain) domains.push(domain)
  }
  return [...new Set(domains)]
}

export async function tppQueryDomainList(sessionId: string, _env: TppEnv): Promise<string[]> {
  const text = await fetchQueryPl({
    SessionID: sessionId,
    Type: 'Domains',
    Object: 'Domain',
    Action: 'List',
  })
  return parseDomainListResponse(text)
}

function parseBoolLoose(raw: string | undefined): boolean | null {
  if (raw == null || !String(raw).trim()) return null
  const t = String(raw).trim().toLowerCase()
  if (['1', 'true', 'yes', 'y', 'on', 'enabled'].includes(t)) return true
  if (['0', 'false', 'no', 'n', 'off', 'disabled'].includes(t)) return false
  return null
}

function parseExpiryToIso(raw: string | undefined): string | null {
  if (!raw?.trim()) return null
  const t = raw.trim()

  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    const day = t.slice(0, 10)
    return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null
  }

  const dmY = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(t)
  if (dmY) {
    const dd = dmY[1].padStart(2, '0')
    const mm = dmY[2].padStart(2, '0')
    const yyyy = dmY[3]
    return `${yyyy}-${mm}-${dd}`
  }

  const yMd = /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/.exec(t)
  if (yMd) {
    const yyyy = yMd[1]
    const mm = yMd[2].padStart(2, '0')
    const dd = yMd[3].padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const parsed = Date.parse(t)
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed)
    const yyyy = d.getUTCFullYear()
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(d.getUTCDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  return null
}

function daysUntilUtcDate(isoYmd: string | null): number | null {
  if (!isoYmd) return null
  const [y, m, d] = isoYmd.split('-').map((x) => Number(x))
  if (!y || !m || !d) return null
  const target = Date.UTC(y, m - 1, d)
  const now = new Date()
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.round((target - today) / 86_400_000)
}

function extractNameserversFromDetailMap(params: Map<string, string[]>): string[] {
  return allValuesIgnoreCase(params, 'Nameserver')
}

export async function tppQueryDomainDetail(sessionId: string, domain: string, env: TppEnv): Promise<TppDomainRow> {
  const q: Record<string, string> = {
    SessionID: sessionId,
    Type: 'Domains',
    Object: 'Domain',
    Action: 'Details',
    Domain: domain,
  }
  if (env.user.trim()) {
    q.UserID = env.user.trim()
  }

  const text = await fetchQueryPl(q)
  const trimmed = text.trim()

  if (trimmed.startsWith('ERR:')) {
    const rest = trimmed.slice(4).trim()
    const code = rest.split(/\s+/)[0] ?? 'ERR'
    throw new TppApiError(code, `Details for ${domain}: ${rest}`, text)
  }

  if (!trimmed.toUpperCase().startsWith('OK:')) {
    throw new TppApiError('BAD_RESPONSE', `Details for ${domain}`, text.slice(0, 2000))
  }

  const params = parseTppDetailLines(text)
  const expiryRaw =
    firstIgnoreCase(params, 'ExpiryDate') ??
    firstIgnoreCase(params, 'ExpireDate') ??
    firstIgnoreCase(params, 'Expiry')

  const expiryDate = parseExpiryToIso(expiryRaw)

  const autoRenew =
    parseBoolLoose(
      firstIgnoreCase(params, 'AutoRenew') ??
        firstIgnoreCase(params, 'AutoRenewal') ??
        firstIgnoreCase(params, 'autorenew'),
    )

  return {
    domain,
    expiryDate,
    daysUntilExpiry: daysUntilUtcDate(expiryDate),
    status: firstIgnoreCase(params, 'DomainStatus') ?? firstIgnoreCase(params, 'Status') ?? null,
    lockStatus:
      firstIgnoreCase(params, 'LockStatus') ?? firstIgnoreCase(params, 'DomainLock') ?? null,
    nameservers: extractNameserversFromDetailMap(params),
    autoRenew,
  }
}

export async function fetchTppDomainsWithDetails(env: TppEnv): Promise<TppDomainRow[]> {
  const sessionId = await tppAuthenticate(env)
  const names = (await tppQueryDomainList(sessionId, env)).filter((d) => d.includes('quni'))
  const rows = await Promise.all(names.map((d) => tppQueryDomainDetail(sessionId, d, env)))
  return rows.sort((a, b) => a.domain.localeCompare(b.domain))
}

export function loadTppEnvFromDeno(): TppEnv | null {
  const user = Deno.env.get('TPP_API_USER')?.trim() ?? ''
  const password = Deno.env.get('TPP_API_PASSWORD')?.trim() ?? ''
  const accountNum = Deno.env.get('TPP_ACCOUNT_NUM')?.trim() ?? ''
  if (!user || !password || !accountNum) return null
  return { user, password, accountNum }
}
