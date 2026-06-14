import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5.9.6'

type ServiceAccountJson = {
  client_email?: string
  private_key?: string
}

export type GoogleServiceAccountCreds = {
  clientEmail: string
  privateKey: string
  source: 'GOOGLE_SERVICE_ACCOUNT' | 'FIREBASE_SERVICE_ACCOUNT_JSON'
}

function normalizePrivateKey(raw: string): string {
  return raw.trim().replace(/\\n/g, '\n')
}

function isValidServiceAccount(value: ServiceAccountJson | null | undefined): value is ServiceAccountJson {
  return Boolean(value?.client_email?.trim() && value?.private_key?.trim())
}

function tryParseJson(raw: string): ServiceAccountJson | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed === 'string') {
      return tryParseJson(parsed)
    }
    return parsed as ServiceAccountJson
  } catch {
    return null
  }
}

function extractServiceAccountFields(raw: string): ServiceAccountJson | null {
  const emailMatch = raw.match(/"client_email"\s*:\s*"([^"\\]+(?:\\.[^"\\]*)*)"/)
  if (!emailMatch) return null

  const escapedKeyMatch = raw.match(/"private_key"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  if (escapedKeyMatch) {
    return {
      client_email: emailMatch[1],
      private_key: normalizePrivateKey(escapedKeyMatch[1]),
    }
  }

  const pemMatch = raw.match(/"private_key"\s*:\s*"(\s*-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----\s*)"/)
  if (pemMatch) {
    return {
      client_email: emailMatch[1],
      private_key: normalizePrivateKey(pemMatch[1]),
    }
  }

  return null
}

function parseServiceAccountJson(raw: string): ServiceAccountJson | null {
  let candidate = raw.trim()
  if (!candidate) return null

  if (candidate.charCodeAt(0) === 0xfeff) {
    candidate = candidate.slice(1).trim()
  }

  const attempts = new Set<string>([candidate])
  if (
    (candidate.startsWith('"') && candidate.endsWith('"')) ||
    (candidate.startsWith("'") && candidate.endsWith("'"))
  ) {
    const unwrapped = tryParseJson(candidate)
    if (typeof unwrapped === 'string') attempts.add(unwrapped)
  }

  try {
    attempts.add(atob(candidate))
  } catch {
    // not base64
  }

  for (const attempt of attempts) {
    const parsed = tryParseJson(attempt)
    if (isValidServiceAccount(parsed)) return parsed
  }

  return extractServiceAccountFields(candidate)
}

export function describeInvalidFirebaseServiceAccountJson(raw: string): string {
  const trimmed = raw.trim()
  if (/^[a-f0-9]{32,128}$/i.test(trimmed)) {
    return 'The FIREBASE_SERVICE_ACCOUNT_JSON value looks like a hash, not JSON. Download the service account JSON from Firebase Console and set GOOGLE_SERVICE_ACCOUNT_EMAIL plus GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY instead (see scripts/set-drive-service-account-secrets.mjs).'
  }
  if (!trimmed.startsWith('{')) {
    return `FIREBASE_SERVICE_ACCOUNT_JSON must be JSON starting with "{". Current value length is ${trimmed.length} characters and does not look like JSON.`
  }
  return `FIREBASE_SERVICE_ACCOUNT_JSON could not be parsed (${trimmed.length} characters). Download a fresh service account key from Firebase Console, then run: node scripts/set-drive-service-account-secrets.mjs path/to/key.json`
}

export function loadGoogleServiceAccountCreds(): GoogleServiceAccountCreds | null {
  const serviceEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')?.trim()
  const serviceKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')?.trim()
  if (serviceEmail && serviceKey) {
    return {
      clientEmail: serviceEmail,
      privateKey: serviceKey,
      source: 'GOOGLE_SERVICE_ACCOUNT',
    }
  }

  const firebaseJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')?.trim()
  if (!firebaseJson) return null

  const sa = parseServiceAccountJson(firebaseJson)
  if (!isValidServiceAccount(sa)) return null

  return {
    clientEmail: sa.client_email!.trim(),
    privateKey: sa.private_key!,
    source: 'FIREBASE_SERVICE_ACCOUNT_JSON',
  }
}

export async function getGoogleServiceAccountAccessToken(
  clientEmail: string,
  privateKeyRaw: string,
  scope: string,
): Promise<string> {
  const email = clientEmail.trim()
  const privateKey = normalizePrivateKey(privateKeyRaw)
  if (!email || !privateKey) {
    throw new Error('Google service account email and private key are required.')
  }

  const pk = await importPKCS8(privateKey, 'RS256')
  const jwt = await new SignJWT({ scope })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(email)
    .setSubject(email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(pk)

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    throw new Error(`Google OAuth failed (${tokenRes.status}): ${err.slice(0, 400)}`)
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string }
  const accessToken = tokenJson.access_token
  if (!accessToken) {
    throw new Error('Google OAuth response had no access_token')
  }
  return accessToken
}

export async function getGoogleDriveReadonlyAccessToken(): Promise<{
  accessToken: string
  serviceAccountEmail: string
  source: GoogleServiceAccountCreds['source']
}> {
  const creds = loadGoogleServiceAccountCreds()
  if (!creds) {
    const firebaseJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')?.trim()
    if (firebaseJson) {
      throw new Error(describeInvalidFirebaseServiceAccountJson(firebaseJson))
    }
    throw new Error(
      'Document register is not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY on Supabase.',
    )
  }

  try {
    const accessToken = await getGoogleServiceAccountAccessToken(
      creds.clientEmail,
      creds.privateKey,
      'https://www.googleapis.com/auth/drive.readonly',
    )
    return { accessToken, serviceAccountEmail: creds.clientEmail, source: creds.source }
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    throw new Error(
      `Google service account auth failed (${creds.source}, ${creds.clientEmail}): ${detail}`,
    )
  }
}
