import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5.9.6'

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
