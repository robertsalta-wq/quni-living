/**
 * Local Supabase access-token check, plus a short-lived landlord pass.
 * The pass is HMAC-signed so any Edge instance can trust it without shared memory
 * and without another landlord_profiles read. Place Details and Confirm do not use it.
 */

const PASS_TTL_SEC = 15 * 60
const JWKS_TTL_MS = 10 * 60 * 1000

/** @type {{ expires: number, keys: JsonWebKey[] }} */
let jwksCache = { expires: 0, keys: [] }

export function clearPlacesAccessCache() {
  jwksCache = { expires: 0, keys: [] }
}

function passSecret() {
  return (process.env.SUPABASE_JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
}

function bytesToBase64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const binary = atob(padded + pad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function hmacKey(secret, usages) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, usages)
}

async function hmacSign(message, secret) {
  const key = await hmacKey(secret, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return bytesToBase64Url(new Uint8Array(sig))
}

async function hmacVerify(message, signature, secret) {
  try {
    const key = await hmacKey(secret, ['verify'])
    return crypto.subtle.verify('HMAC', key, base64UrlToBytes(signature), new TextEncoder().encode(message))
  } catch {
    return false
  }
}

/**
 * @param {string} token
 * @returns {Promise<{ ok: true, sub: string, email: string, exp: number } | { ok: false, reason: 'malformed' | 'expired' | 'signature' | 'role' | 'alg' | 'unconfigured' }>}
 */
export async function verifySupabaseAccessToken(token) {
  const parts = token.split('.')
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) return { ok: false, reason: 'malformed' }
  let header
  let payload
  try {
    header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0])))
    payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1])))
  } catch {
    return { ok: false, reason: 'malformed' }
  }
  const exp = typeof payload.exp === 'number' ? payload.exp : 0
  const sub = typeof payload.sub === 'string' ? payload.sub : ''
  if (!sub || payload.role !== 'authenticated') return { ok: false, reason: 'role' }
  if (!exp || exp * 1000 <= Date.now()) return { ok: false, reason: 'expired' }

  const signingInput = `${parts[0]}.${parts[1]}`
  if (header.alg === 'HS256') {
    const secret = (process.env.SUPABASE_JWT_SECRET || '').trim()
    if (!secret) return { ok: false, reason: 'unconfigured' }
    const valid = await hmacVerify(signingInput, parts[2], secret)
    return valid ? { ok: true, sub, email: typeof payload.email === 'string' ? payload.email : '', exp } : { ok: false, reason: 'signature' }
  }
  if (header.alg === 'ES256' || header.alg === 'RS256') {
    const verified = await verifyWithJwks(header, signingInput, parts[2])
    if (verified === 'unconfigured') return { ok: false, reason: 'unconfigured' }
    return verified ? { ok: true, sub, email: typeof payload.email === 'string' ? payload.email : '', exp } : { ok: false, reason: 'signature' }
  }
  return { ok: false, reason: 'alg' }
}

/**
 * @param {{ alg?: string, kid?: string }} header
 * @param {string} signingInput
 * @param {string} signature
 * @returns {Promise<boolean | 'unconfigured'>}
 */
async function verifyWithJwks(header, signingInput, signature) {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '')
  if (!supabaseUrl) return 'unconfigured'
  const now = Date.now()
  if (jwksCache.expires <= now) {
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/.well-known/jwks.json`)
      if (!res.ok) return 'unconfigured'
      const body = await res.json()
      jwksCache = { expires: now + JWKS_TTL_MS, keys: Array.isArray(body.keys) ? body.keys : [] }
    } catch {
      return 'unconfigured'
    }
  }
  const jwk = jwksCache.keys.find((key) => jwkMatchesHeader(key, header))
  if (!jwk) return false
  try {
    const signatureBytes = base64UrlToBytes(signature)
    const data = new TextEncoder().encode(signingInput)
    if (header.alg === 'RS256') {
      const key = await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify'],
      )
      return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signatureBytes, data)
    }
    // ECDSA import requires namedCurve. Passing only the hash throws, which used to
    // look like a bad signature and 401 every ECC (P-256) access token.
    const namedCurve = jwk.crv === 'P-384' ? 'P-384' : jwk.crv === 'P-521' ? 'P-521' : 'P-256'
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve }, false, ['verify'])
    return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, signatureBytes, data)
  } catch {
    return false
  }
}

/**
 * @param {JsonWebKey} key
 * @param {{ alg?: string, kid?: string }} header
 */
function jwkMatchesHeader(key, header) {
  if (header.kid && key.kid !== header.kid) return false
  if (header.alg === 'ES256') {
    return key.kty === 'EC' && (!key.alg || key.alg === 'ES256') && (!key.crv || key.crv === 'P-256')
  }
  if (header.alg === 'RS256') return key.kty === 'RSA' && (!key.alg || key.alg === 'RS256')
  return key.alg === header.alg
}

/** @param {string} sub */
export async function issueLandlordPass(sub) {
  const secret = passSecret()
  if (!secret || !sub) return ''
  const exp = Math.floor(Date.now() / 1000) + PASS_TTL_SEC
  const message = `${sub}.${exp}`
  return `${message}.${await hmacSign(message, secret)}`
}

/** @param {string | null | undefined} pass @param {string} sub */
export async function landlordPassMatches(pass, sub) {
  const secret = passSecret()
  if (!secret || !pass || !sub) return false
  const parts = pass.split('.')
  if (parts.length !== 3) return false
  const [passSub, expRaw, signature] = parts
  if (passSub !== sub) return false
  const exp = Number(expRaw)
  const now = Math.floor(Date.now() / 1000)
  if (!Number.isFinite(exp) || exp <= now || exp > now + PASS_TTL_SEC + 60) return false
  return hmacVerify(`${passSub}.${expRaw}`, signature, secret)
}
