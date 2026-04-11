/**
 * Lists files in the Quni Living Google Drive folder (public folder + API key).
 * Deploy: supabase functions deploy drive-documents
 *
 * Secrets (Supabase Dashboard → Edge Functions → Secrets, or `supabase secrets set`):
 *   GOOGLE_DRIVE_API_KEY
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { isAdminUser } from '../_shared/adminEmails.ts'

const QUNI_LIVING_FOLDER_ID = '13u7rROY2ztVnvxqSpVESGEE74TgsqQOy'

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

async function listAllFilesInFolder(apiKey: string, folderId: string): Promise<DriveFile[]> {
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
      `key=${encodeURIComponent(apiKey)}`,
      ...(pageToken ? [`pageToken=${encodeURIComponent(pageToken)}`] : []),
    ].join('&')

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${qs}`)

    const data = (await res.json()) as DriveListResponse & { error?: { message?: string } }
    if (!res.ok) {
      console.error('drive files list error', data)
      throw new Error(data.error?.message || 'Google Drive request failed.')
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

  if (userErr || !user || !isAdminUser(user)) {
    const msg =
      userErr?.message?.includes('Invalid JWT') || userErr?.message?.includes('invalid JWT')
        ? 'Your session could not be verified. Sign out, sign in again, then retry.'
        : user && !isAdminUser(user)
          ? 'Forbidden.'
          : (userErr?.message ?? 'Please sign in again.')
    return json({ error: msg }, user && !isAdminUser(user) ? 403 : 401)
  }

  const driveApiKey = Deno.env.get('GOOGLE_DRIVE_API_KEY')?.trim()
  if (!driveApiKey) {
    console.error('Missing GOOGLE_DRIVE_API_KEY')
    return json({ error: 'Document register is not configured.' }, 500)
  }

  try {
    let files = await listAllFilesInFolder(driveApiKey, QUNI_LIVING_FOLDER_ID)

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
