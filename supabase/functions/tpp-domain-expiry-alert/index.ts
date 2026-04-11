/**
 * Daily cron: email rob@quni.com.au when any TPP domain has daysUntilExpiry < 60.
 * Trigger: pg_cron + pg_net → POST with header X-Cron-Secret (must match TPP_DOMAIN_CRON_SECRET).
 * Secrets: TPP_DOMAIN_CRON_SECRET, TPP_API_USER, TPP_API_PASSWORD, TPP_ACCOUNT_NUM, RESEND_API_KEY
 * Deploy: supabase functions deploy tpp-domain-expiry-alert --no-verify-jwt
 */
import { fetchTppDomainsWithDetails, loadTppEnvFromDeno, TppApiError } from '../_shared/tppWholesale.ts'

const ALERT_EMAIL = 'rob@quni.com.au'

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

  const expected = Deno.env.get('TPP_DOMAIN_CRON_SECRET')?.trim()
  const got = req.headers.get('x-cron-secret')?.trim()
  if (!expected || got !== expected) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const tppEnv = loadTppEnvFromDeno()
  if (!tppEnv) {
    console.error('tpp-domain-expiry-alert: missing TPP_API_USER or TPP_API_PASSWORD')
    return json({ error: 'TPP API is not configured' }, 500)
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')?.trim()
  if (!resendKey) {
    console.error('tpp-domain-expiry-alert: missing RESEND_API_KEY')
    return json({ error: 'RESEND_API_KEY not set' }, 500)
  }

  let domains: Awaited<ReturnType<typeof fetchTppDomainsWithDetails>>
  try {
    domains = await fetchTppDomainsWithDetails(tppEnv)
  } catch (e) {
    if (e instanceof TppApiError) {
      console.error('tpp-domain-expiry-alert TPP error', e.code, e.detail)
      return json(
        {
          ok: false,
          error: e.message,
          tppCode: e.code,
          tppMessage: e.detail,
          tppRaw: e.rawBody.slice(0, 2000),
        },
        502,
      )
    }
    throw e
  }

  const atRisk = domains.filter(
    (d) => d.daysUntilExpiry !== null && d.daysUntilExpiry !== undefined && d.daysUntilExpiry < 60,
  )

  if (atRisk.length === 0) {
    return json({ ok: true, emailed: 0, checked: domains.length })
  }

  let emailed = 0
  const failures: string[] = []

  for (const row of atRisk) {
    const n = row.daysUntilExpiry ?? 0
    const subject = `⚠️ Domain expiry alert — ${row.domain} expires in ${n} days`
    const text = [
      `Domain: ${row.domain}`,
      `Days remaining: ${n}`,
      row.expiryDate ? `Expiry date (parsed): ${row.expiryDate}` : '',
      row.status ? `Status: ${row.status}` : '',
      row.autoRenew === null ? '' : `Auto-renew: ${row.autoRenew ? 'yes' : 'no'}`,
    ]
      .filter(Boolean)
      .join('\n')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Quni Living <noreply@quni.com.au>',
        reply_to: 'hello@quni.com.au',
        to: [ALERT_EMAIL],
        subject,
        text,
        tags: [{ name: 'category', value: 'domain-expiry' }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      failures.push(`${row.domain}: ${res.status} ${errText.slice(0, 200)}`)
      console.error('Resend error for', row.domain, res.status, errText)
    } else {
      emailed += 1
    }
  }

  if (failures.length > 0 && emailed === 0) {
    return json({ ok: false, error: failures.join(' | '), checked: domains.length, atRisk: atRisk.length }, 500)
  }

  return json({
    ok: true,
    emailed,
    failed: failures.length,
    checked: domains.length,
    atRisk: atRisk.length,
    failures: failures.length ? failures : undefined,
  })
})
