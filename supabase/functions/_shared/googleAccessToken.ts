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

function parseServiceAccountJson(raw: string): ServiceAccountJson | null {
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed) as ServiceAccountJson
  } catch {
    try {
      return JSON.parse(atob(trimmed)) as ServiceAccountJson
    } catch {
      return null
    }
  }
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
  const clientEmail = sa?.client_email?.trim()
  const privateKey = sa?.private_key?.trim()
  if (!clientEmail || !privateKey) return null

  return {
    clientEmail,
    privateKey,
    source: 'FIREBASE_SERVICE_ACCOUNT_JSON',
  }
}

export async function getGoogleServiceAccountAccessToken(
  clientEmail: string,
  privateKeyRaw: string,
  scope: string,
): Promise<string> {
  const email = clientEmail.trim()
  const privateKey = privateKeyRaw.trim().replace(/\\n/g, '\n')
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
    const hasFirebase = Boolean(Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')?.trim())
    if (hasFirebase) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_JSON is set but could not be parsed. Re-paste the full Firebase service account JSON in Supabase → Edge Functions → Secrets.',
      )
    }
    throw new Error(
      'Document register is not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY on Supabase, or set FIREBASE_SERVICE_ACCOUNT_JSON.',
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
