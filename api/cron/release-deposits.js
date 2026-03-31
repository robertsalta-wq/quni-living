/**
 * Daily: transfer held booking deposit to landlord Connect account the day after move-in (Australia/Sydney calendar).
 * Vercel Cron: GET /api/cron/release-deposits  (schedule 0 0 * * * UTC ≈ 10:00 AEST)
 * Authorization: Bearer CRON_SECRET
 */
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '../lib/sendEmail.js'
import { depositReleasedLandlord, propertyAddressLine } from '../lib/emailTemplates.js'

export const config = { runtime: 'edge' }

function sydneyTodayYmd() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' })
}

function addDaysYmd(ymd, delta) {
  const [y, m, d] = ymd.split('-').map(Number)
  const t = Date.UTC(y, m - 1, d) + delta * 86400000
  const x = new Date(t)
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`
}

function siteBaseUrl() {
  const u = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://quni-living.vercel.app').trim()
  return u.replace(/\/$/, '')
}

export default async function handler(request) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!secret || token !== secret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!stripeSecret || !supabaseUrl || !serviceRole) {
    return new Response('Server misconfigured', { status: 500 })
  }

  const yesterdaySydney = addDaysYmd(sydneyTodayYmd(), -1)

  const admin = createClient(supabaseUrl, serviceRole)
  const stripe = new Stripe(stripeSecret)

  const { data: rows, error } = await admin
    .from('bookings')
    .select(
      `
      id,
      deposit_amount,
      weekly_rent,
      move_in_date,
      start_date,
      landlord_id,
      landlord_profiles ( stripe_connect_account_id, email, full_name ),
      properties ( title )
    `,
    )
    .eq('status', 'confirmed')
    .is('deposit_released_at', null)

  if (error) {
    console.error('release-deposits select', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  let released = 0
  for (const b of rows ?? []) {
    const moveIn = (b.move_in_date || b.start_date || '').slice(0, 10)
    if (!moveIn || moveIn !== yesterdaySydney) continue

    let amount = typeof b.deposit_amount === 'number' ? b.deposit_amount : null
    if (amount == null && b.weekly_rent != null) {
      amount = Math.round(Number(b.weekly_rent) * 100)
    }
    if (!amount || amount <= 0) continue

    const lp = b.landlord_profiles && typeof b.landlord_profiles === 'object' ? b.landlord_profiles : {}
    const dest =
      'stripe_connect_account_id' in lp && typeof lp.stripe_connect_account_id === 'string'
        ? lp.stripe_connect_account_id.trim()
        : ''
    if (!dest) continue

    try {
      await stripe.transfers.create({
        amount,
        currency: 'aud',
        destination: dest,
        metadata: { booking_id: b.id },
        description: `Booking deposit release ${b.id}`,
      })
    } catch (e) {
      console.error('transfer deposit', b.id, e)
      continue
    }

    const nowIso = new Date().toISOString()
    const { error: upErr } = await admin
      .from('bookings')
      .update({ deposit_released_at: nowIso, status: 'active' })
      .eq('id', b.id)

    if (!upErr) {
      released += 1
      const prop = b.properties && typeof b.properties === 'object' ? b.properties : {}
      const addr = propertyAddressLine(prop)
      const title = 'title' in prop ? String(prop.title ?? '') : ''
      const landlordEmail = 'email' in lp && typeof lp.email === 'string' ? lp.email.trim() : ''
      const landlordName = 'full_name' in lp ? String(lp.full_name ?? '') : ''
      if (landlordEmail) {
        try {
          const t = depositReleasedLandlord({
            landlord_name: landlordName || 'there',
            property_address: addr || title,
            property_title: title,
            deposit_amount_cents: amount,
            dashboard_url: `${siteBaseUrl()}/landlord/dashboard?tab=bookings`,
          })
          await sendEmail({ to: landlordEmail, subject: t.subject, html: t.html })
        } catch (e) {
          console.error('release-deposits email', b.id, e)
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, released, targetMoveInDate: yesterdaySydney }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
