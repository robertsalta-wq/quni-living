/**
 * Lists files in the Quni Living Google Drive folder.
 * Deploy: supabase functions deploy drive-documents
 *
 * Secrets (Supabase Dashboard → Edge Functions → Secrets, or `supabase secrets set`):
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (preferred), or
 *   FIREBASE_SERVICE_ACCOUNT_JSON (reuses Firebase service account if folder is shared with it).
 * Share the Drive folder with the service account email (Viewer).
 *
 * Legacy fallback (public folder only):
 *   GOOGLE_DRIVE_API_KEY
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { getGoogleServiceAccountAccessToken } from '../_shared/googleAccessToken.ts'
import { isPlatformAdminUser } from '../_shared/platformStaff.ts'

const QUNI_LIVING_FOLDER_ID = '13u7rROY2ztVnvxqSpVESGEE74TgsqQOy'
const DRIVE_READONLY_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

type DriveFile = {
  id?: string
  name?: string
  mimeType?: string
  modifiedTime?: string
  size?: string
  webViewLink?: string
}

type DriveListResponse = {
  files?: DriveFile[]
  nextPageToken?: string
}

type DriveAuth =
  | { kind: 'oauth'; accessToken: string }
  | { kind: 'apiKey'; apiKey: string }

type ServiceAccountCreds = {
  client_email?: string
  private_key?: string
}

function parseServiceAccountJson(raw: string): ServiceAccountCreds | null {
  try {
    return JSON.parse(raw) as ServiceAccountCreds
  } catch {
    return null
  }
}

async function resolveDriveAuth(): Promise<DriveAuth> {
  const serviceEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')?.trim()
  const serviceKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')?.trim()
  if (serviceEmail && serviceKey) {
    const accessToken = await getGoogleServiceAccountAccessToken(serviceEmail, serviceKey, DRIVE_READONLY_SCOPE)
    return { kind: 'oauth', accessToken }
  }

  const firebaseJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')?.trim()
  if (firebaseJson) {
    const sa = parseServiceAccountJson(firebaseJson)
    if (sa?.client_email?.trim() && sa.private_key?.trim()) {
      const accessToken = await getGoogleServiceAccountAccessToken(sa.client_email, sa.private_key, DRIVE_READONLY_SCOPE)
      return { kind: 'oauth', accessToken }
    }
  }

  const driveApiKey = Deno.env.get('GOOGLE_DRIVE_API_KEY')?.trim()
  if (driveApiKey) {
    return { kind: 'apiKey', apiKey: driveApiKey }
  }

  throw new Error(
    'Document register is not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY on Supabase, or share the Drive folder with the Firebase service account email.',
  )
}

async function listAllFilesInFolder(auth: DriveAuth, folderId: string): Promise<DriveFile[]> {
  const all: DriveFile[] = []
  let pageToken: string | undefined

  const fields = encodeURIComponent('nextPageToken, files(id, name, mimeType, modifiedTime, size, webViewLink)')
  const qEnc = encodeURIComponent(`'${folderId}' in parents and trashed=false`)
  const orderBy = encodeURIComponent('modifiedTime desc')

  do {
    const qs = [
      `q=${qEnc}`,
      `fields=${fields}`,
      `orderBy=${orderBy}`,
      'pageSize=100',
      'supportsAllDrives=true',
      'includeItemsFromAllDrives=true',
      ...(auth.kind === 'apiKey' ? [`key=${encodeURIComponent(auth.apiKey)}`] : []),
      ...(pageToken ? [`pageToken=${encodeURIComponent(pageToken)}`] : []),
    ].join('&')

    const headers: Record<string, string> = {}
    if (auth.kind === 'oauth') {
      headers.Authorization = `Bearer ${auth.accessToken}`
    }

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${qs}`, { headers })

    const data = (await res.json()) as DriveListResponse & { error?: { message?: string } }
    if (!res.ok) {
      console.error('drive files list error', data)
      const message = data.error?.message || 'Google Drive request failed.'
      if (auth.kind === 'oauth' && res.status === 403) {
        throw new Error(
          'Google Drive denied access. In Google Drive, share the Quni Living folder with the Firebase service account email (Project settings → Service accounts) as Viewer.',
        )
      }
      if (auth.kind === 'apiKey' && /api key not valid/i.test(message)) {
        throw new Error(
          'Google Drive API key is invalid. Configure GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY on Supabase instead, and share the Quni Living folder with that service account.',
        )
      }
      throw new Error(message)
    }

    for (const f of data.files ?? []) {
      if (f?.id && f?.name && f?.mimeType) {
        all.push({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          modifiedTime: f.modifiedTime,
          size: f.size,
          webViewLink: f.webViewLink,
        })
      }
    }
    pageToken = data.nextPageToken
  } while (pageToken)

  return all
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !anonKey) {
    return json({ error: 'Server misconfigured' }, 500)
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser()

  const isAdmin = !userErr && user != null && (await isPlatformAdminUser(userClient, user))
  if (userErr || !user || !isAdmin) {
    const msg =
      userErr?.message?.includes('Invalid JWT') || userErr?.message?.includes('invalid JWT')
        ? 'Your session could not be verified. Sign out, sign in again, then retry.'
        : user && !isAdmin
          ? 'Forbidden.'
          : (userErr?.message ?? 'Please sign in again.')
    return json({ error: msg }, user && !isAdmin ? 403 : 401)
  }

  try {
    const driveAuth = await resolveDriveAuth()
    let files = await listAllFilesInFolder(driveAuth, QUNI_LIVING_FOLDER_ID)

    files = files.sort((a, b) => {
      const ta = a.modifiedTime ? Date.parse(a.modifiedTime) : 0
      const tb = b.modifiedTime ? Date.parse(b.modifiedTime) : 0
      return tb - ta
    })

    return json({ files })
  } catch (e) {
    console.error('drive-documents', e)
    const message = e instanceof Error ? e.message : 'Could not load documents.'
    return json({ error: message }, 500)
  }
})
