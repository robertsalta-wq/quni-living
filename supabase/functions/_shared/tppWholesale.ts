/**
 * TPP Wholesale legacy HTTP API (application/x-www-form-urlencoded).
 * Spec: theconsole.tppwholesale.com.au — AUTHENTICATE/LOGIN, DOMAIN QUERYLIST & QUERY.
 */

export const TPP_API_URL = 'https://theconsole.tppwholesale.com.au/api/'

export type TppEnv = {
  user: string
  password: string
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

/** Parse duplicate keys (TPP may repeat DomainName=…). */
export function parseUrlEncodedBody(body: string): Map<string, string[]> {
  const map = new Map<string, string[]>()
  const trimmed = body.trim()
  if (!trimmed) return map

  for (const part of trimmed.split('&')) {
    if (!part) continue
    const eq = part.indexOf('=')
    const rawKey = eq === -1 ? part : part.slice(0, eq)
    const rawVal = eq === -1 ? '' : part.slice(eq + 1)
    const key = decodeURIComponent(rawKey.replace(/\+/g, ' '))
    const value = decodeURIComponent(rawVal.replace(/\+/g, ' '))
    const list = map.get(key)
    if (list) list.push(value)
    else map.set(key, [value])
  }
  return map
}

function first(params: Map<string, string[]>, key: string): string | undefined {
  const v = params.get(key)
  const s = v?.[0]?.trim()
  return s || undefined
}

function allValues(params: Map<string, string[]>, key: string): string[] {
  return (params.get(key) ?? []).map((s) => s.trim()).filter(Boolean)
}

function indicatesFailure(code: string | undefined): boolean {
  if (!code?.trim()) return false
  const u = code.trim().toUpperCase()
  // Common TPP / legacy API “success” tokens (avoid false positives on numeric HTTP-style codes).
  if (['0', 'OK', 'SUCCESS', 'TRUE', '200', 'PASS', 'PASSED'].includes(u)) return false
  return true
}

async function postTpp(form: Record<string, string>): Promise<Map<string, string[]>> {
  const body = new URLSearchParams(form).toString()
  const res = await fetch(TPP_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body,
  })

  const text = await res.text()
  const params = parseUrlEncodedBody(text)

  const errCode =
    first(params, 'ErrorCode') ??
    first(params, 'errorcode') ??
    first(params, 'ResultCode') ??
    first(params, 'FaultCode')
  const errMsg =
    first(params, 'ErrorMessage') ??
    first(params, 'errormessage') ??
    first(params, 'Message') ??
    first(params, 'FaultString') ??
    first(params, 'Error')

  if (errCode && indicatesFailure(errCode)) {
    throw new TppApiError(errCode, errMsg ?? '(no message)', text)
  }

  const result = first(params, 'Result') ?? first(params, 'ResultCode')
  if (result && /^(FAIL|ERROR|FAILED)$/i.test(result.trim())) {
    throw new TppApiError(result.trim(), errMsg ?? '', text)
  }

  if (!res.ok) {
    throw new TppApiError(String(res.status), res.statusText || 'HTTP error', text)
  }

  return params
}

export async function tppAuthenticate(env: TppEnv): Promise<string> {
  const form: Record<string, string> = {
    object: 'AUTHENTICATE',
    action: 'LOGIN',
    username: env.user,
    password: env.password,
  }
  if (env.accountNum.trim()) {
    form.AccountNum = env.accountNum.trim()
  }

  const params = await postTpp(form)
  const sid = first(params, 'SessionID') ?? first(params, 'SessionId')
  if (!sid?.trim()) {
    const raw = [...params.entries()]
      .map(([k, v]) => `${k}=${v.join(',')}`)
      .join('&')
    throw new TppApiError('NO_SESSION', 'LOGIN response had no SessionID', raw)
  }
  return sid.trim()
}

function extractDomainNames(params: Map<string, string[]>): string[] {
  const out: string[] = []
  const list =
    first(params, 'DomainList') ?? first(params, 'domainlist') ?? first(params, 'List') ?? first(params, 'list')
  if (list?.trim()) {
    for (const piece of list.split(/[,;|]/)) {
      const d = piece.trim().toLowerCase()
      if (d) out.push(d)
    }
  }

  for (const v of allValues(params, 'DomainName')) {
    const d = v.toLowerCase()
    if (d) out.push(d)
  }
  for (const v of allValues(params, 'Domain')) {
    const d = v.toLowerCase()
    if (d) out.push(d)
  }

  for (const [k, vals] of params) {
    const m = /^(?:Domain|DomainName)(\d+)$/i.exec(k)
    if (m) {
      for (const v of vals) {
        const d = v.toLowerCase()
        if (d) out.push(d)
      }
    }
  }

  return [...new Set(out)]
}

export async function tppQueryDomainList(sessionId: string, env: TppEnv): Promise<string[]> {
  const form: Record<string, string> = {
    object: 'DOMAIN',
    action: 'QUERYLIST',
    SessionID: sessionId,
  }
  if (env.accountNum.trim()) {
    form.AccountNum = env.accountNum.trim()
  }

  const params = await postTpp(form)
  return extractDomainNames(params)
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

function extractNameservers(params: Map<string, string[]>): string[] {
  const joined =
    first(params, 'Nameservers') ??
    first(params, 'NameServers') ??
    first(params, 'nameservers') ??
    first(params, 'NSList') ??
    first(params, 'NameServer')
  if (joined?.includes(',')) {
    return joined
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (joined?.trim()) {
    const parts = joined.split(/\s+/).filter(Boolean)
    if (parts.length > 1) return parts
    if (parts.length === 1) return parts
  }

  const out: string[] = []
  for (const [k, vals] of params) {
    if (/^ns\d*$/i.test(k) || /^nameserver\d*$/i.test(k)) {
      for (const v of vals) {
        if (v.trim()) out.push(v.trim())
      }
    }
  }
  return out
}

export async function tppQueryDomainDetail(sessionId: string, domain: string, env: TppEnv): Promise<TppDomainRow> {
  const form: Record<string, string> = {
    object: 'DOMAIN',
    action: 'QUERY',
    SessionID: sessionId,
    DomainName: domain,
  }
  if (env.accountNum.trim()) {
    form.AccountNum = env.accountNum.trim()
  }

  const params = await postTpp(form)
  const expiryRaw =
    first(params, 'ExpiryDate') ?? first(params, 'expirydate') ?? first(params, 'ExpireDate') ?? first(params, 'Expiry')
  const expiryDate = parseExpiryToIso(expiryRaw)

  const autoRenew =
    parseBoolLoose(first(params, 'AutoRenew') ?? first(params, 'AutoRenewal') ?? first(params, 'autorenew'))

  return {
    domain,
    expiryDate,
    daysUntilExpiry: daysUntilUtcDate(expiryDate),
    status: first(params, 'DomainStatus') ?? first(params, 'Status') ?? null,
    lockStatus: first(params, 'LockStatus') ?? first(params, 'DomainLock') ?? first(params, 'lockstatus') ?? null,
    nameservers: extractNameservers(params),
    autoRenew,
  }
}

export async function fetchTppDomainsWithDetails(env: TppEnv): Promise<TppDomainRow[]> {
  const sessionId = await tppAuthenticate(env)
  const names = await tppQueryDomainList(sessionId, env)
  const rows = await Promise.all(names.map((d) => tppQueryDomainDetail(sessionId, d, env)))
  return rows.sort((a, b) => a.domain.localeCompare(b.domain))
}

export function loadTppEnvFromDeno(): TppEnv | null {
  const user = Deno.env.get('TPP_API_USER')?.trim() ?? ''
  const password = Deno.env.get('TPP_API_PASSWORD')?.trim() ?? ''
  const accountNum = Deno.env.get('TPP_ACCOUNT_NUM')?.trim() ?? ''
  if (!user || !password) return null
  return { user, password, accountNum }
}
