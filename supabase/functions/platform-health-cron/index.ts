/**
 * Scheduled health checks + FCM topic alert when a service transitions to "down".
 * Secrets: PLATFORM_HEALTH_CRON_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   FIREBASE_SERVICE_ACCOUNT_JSON, + same as healthChecks (TPP_*, STRIPE_SECRET_KEY, RESEND_API_KEY).
 * Deploy: supabase functions deploy platform-health-cron --no-verify-jwt
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { sendFcmTopicNotification } from '../_shared/fcmAdminTopic.ts'
import { checkAllServices } from '../_shared/healthChecks.ts'

const ADMIN_ALERT_TOPIC = 'admin-alerts'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const expected = Deno.env.get('PLATFORM_HEALTH_CRON_SECRET')?.trim()
  const got = req.headers.get('x-cron-secret')?.trim()
  if (!expected || got !== expected) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRole) {
    return json({ error: 'Server misconfigured' }, 500)
  }

  const admin = createClient(supabaseUrl, serviceRole)

  const { data: prevRows, error: prevErr } = await admin.from('operational_status').select('service_name,status')
  if (prevErr) {
    console.error('platform-health-cron read prev', prevErr)
    return json({ error: prevErr.message }, 500)
  }

  const prevMap = new Map<string, string>()
  for (const row of prevRows ?? []) {
    if (row.service_name && row.status) prevMap.set(row.service_name, row.status)
  }

  let results: Awaited<ReturnType<typeof checkAllServices>>
  try {
    results = await checkAllServices({})
  } catch (e) {
    console.error('platform-health-cron checkAllServices', e)
    return json({ error: e instanceof Error ? e.message : 'Checks failed' }, 500)
  }

  const checkedAt = new Date().toISOString()
  for (const r of results) {
    const { error: upErr } = await admin.from('operational_status').upsert(
      {
        service_name: r.service,
        status: r.status,
        message: r.message,
        checked_at: checkedAt,
      },
      { onConflict: 'service_name' },
    )
    if (upErr) {
      console.error('operational_status upsert', r.service, upErr)
      return json({ error: upErr.message ?? 'Upsert failed' }, 500)
    }
  }

  let incidentsLogged = 0
  for (const r of results) {
    const before = prevMap.get(r.service)
    const prevBad = before === 'degraded' || before === 'down'
    const nextBad = r.status === 'degraded' || r.status === 'down'

    if (nextBad && !prevBad) {
      const { error: insErr } = await admin.from('incident_log').insert({
        service_name: r.service,
        status: r.status,
        message: r.message,
      })
      if (insErr) {
        console.error('incident_log insert', r.service, insErr)
      } else {
        incidentsLogged += 1
      }
    }

    if (!nextBad && prevBad) {
      const { data: openRow, error: selErr } = await admin
        .from('incident_log')
        .select('id')
        .eq('service_name', r.service)
        .is('resolved_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (selErr) {
        console.error('incident_log select open', r.service, selErr)
      } else if (openRow?.id) {
        const { error: resErr } = await admin
          .from('incident_log')
          .update({ resolved_at: checkedAt })
          .eq('id', openRow.id)
        if (resErr) console.error('incident_log resolve', r.service, resErr)
      }
    }
  }

  const firebaseJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')?.trim()
  let alerts = 0

  for (const r of results) {
    const before = prevMap.get(r.service)
    if (before === r.status) continue
    if (r.status !== 'down') continue

    if (!firebaseJson) {
      console.warn('platform-health-cron: skip FCM — FIREBASE_SERVICE_ACCOUNT_JSON not set', r.service)
      continue
    }

    const title = '⚠️ Quni Platform Alert'
    const bodyText = `${r.service} is down: ${r.message}`
    try {
      await sendFcmTopicNotification(firebaseJson, ADMIN_ALERT_TOPIC, title, bodyText)
      alerts += 1
    } catch (e) {
      console.error('FCM alert failed', r.service, e)
    }
  }

  return json({ checked: results.length, alerts, incidentsLogged })
})
