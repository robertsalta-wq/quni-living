/**
 * FCM HTTP v1 — topic notification using a Firebase service account JSON (no firebase-admin SDK).
 */
import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5.9.6'

type ServiceAccount = {
  project_id: string
  private_key: string
  client_email: string
}

export async function sendFcmTopicNotification(
  serviceAccountJson: string,
  topic: string,
  title: string,
  body: string,
): Promise<void> {
  let sa: ServiceAccount
  try {
    sa = JSON.parse(serviceAccountJson) as ServiceAccount
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON')
  }
  if (!sa.private_key?.trim() || !sa.client_email?.trim() || !sa.project_id?.trim()) {
    throw new Error('Service account JSON missing project_id, private_key, or client_email')
  }

  const pk = await importPKCS8(sa.private_key.replace(/\\n/g, '\n'), 'RS256')
  const jwt = await new SignJWT({ scope: 'https://www.googleapis.com/auth/firebase.messaging' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
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

  const fcmRes = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        topic,
        notification: { title, body },
      },
    }),
  })
  if (!fcmRes.ok) {
    const err = await fcmRes.text()
    throw new Error(`FCM send failed (${fcmRes.status}): ${err.slice(0, 400)}`)
  }
}
