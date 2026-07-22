/**
 * GET /api/admin/living-console-snapshot
 *
 * Single roll-up endpoint that powers `/admin` (the Living Console).
 *
 * Replaces what HANDOFF.md called `get-living-console-snapshot` - implemented
 * as a Vercel edge function rather than a Supabase Edge Function (Decision J1).
 *
 * Aggregations run with the service-role key after `requireAdminUser` verifies
 * the caller. Range is `today` or `7d` (default `7d`). Numbers are
 * pre-formatted at the boundary per HANDOFF non-goal 8 - the React page never
 * does number formatting.
 *
 * Where the live schema can't satisfy a row yet (per the ratified decisions),
 * the response includes a `stub: true` flag so the UI can mark the row dim or
 * the team can grep for what's still placeholder.
 */
import { createClient } from '@supabase/supabase-js'

import { requireAdminUser } from '../lib/adminAuth.js'
import { classifySignedNotReserving } from '../lib/admin/classifySignedNotReserving.js'
import { classifyWebhookHealth } from '../lib/admin/classifyWebhookHealth.js'
import { loadSignedNotReservingCandidates } from '../lib/admin/loadSignedNotReservingCandidates.js'

export const config = { runtime: 'edge' }

type Range = 'today' | '7d'

type Tone = 'critical' | 'action' | 'watch' | 'ok'
type DeltaTone = 'success' | 'danger' | 'neutral'
type SparkColor = 'coral' | 'navy'

interface ZoneRow {
  tone: Tone
  text: string
  stub?: boolean
}

interface ZonePayload {
  rows: ZoneRow[]
  spark: number[]
  sparkColor: SparkColor
}

interface AttentionItem {
  id: string
  tone: 'critical' | 'action' | 'watch'
  text: string
  fixHref: string
}

interface PulseCell {
  value: string
  unit: string | null
  delta: string
  deltaTone: DeltaTone
  spark: number[]
  sparkColor: SparkColor
  href: string
  linkLabel: string
}

export interface LivingConsoleSnapshot {
  range: Range
  generatedAt: string
  city: string
  attention: AttentionItem[]
  zones: {
    marketplace: ZonePayload
    tenancies: ZonePayload
    supply: ZonePayload
    money: ZonePayload
    trust: ZonePayload
    platform: ZonePayload
  }
  pulse: {
    mrr: PulseCell
    activeTenancies: PulseCell
    conversion: PulseCell
    avgWeeklyRent: PulseCell
  }
}

function json(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Cache-Control': 'no-store',
    },
  })
}

const PENDING_BOOKING_STATUSES = [
  'pending',
  'pending_payment',
  'pending_confirmation',
  'awaiting_info',
  'bond_pending',
] as const

const ACTIVE_TENANCY_STATUSES = ['confirmed', 'active'] as const

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function plusDaysIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function fmtCurrency(cents: number): string {
  const dollars = cents / 100
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(dollars)
}

function fmtPercent(num: number): string {
  return `${num.toFixed(1)}%`
}

type DeltaResult = { delta: string; deltaTone: DeltaTone }

function deltaCurrency(curr: number, prev: number): DeltaResult {
  if (prev === 0 && curr === 0) return { delta: 'flat', deltaTone: 'neutral' }
  const diff = curr - prev
  if (diff === 0) return { delta: 'flat', deltaTone: 'neutral' }
  const arrow = diff > 0 ? '↑' : '↓'
  return {
    delta: `${arrow} ${fmtCurrency(Math.abs(diff))} vs prev 7d`,
    deltaTone: diff > 0 ? 'success' : 'danger',
  }
}

function deltaCount(curr: number, prev: number, suffix = ''): DeltaResult {
  if (prev === 0 && curr === 0) return { delta: 'flat', deltaTone: 'neutral' }
  const diff = curr - prev
  if (diff === 0) return { delta: 'flat', deltaTone: 'neutral' }
  const arrow = diff > 0 ? '↑' : '↓'
  return {
    delta: `${arrow} ${Math.abs(diff)}${suffix ? ' ' + suffix : ''} vs prev 7d`,
    deltaTone: diff > 0 ? 'success' : 'danger',
  }
}

function deltaPercentPoints(curr: number, prev: number): DeltaResult {
  if (prev === 0 && curr === 0) return { delta: 'flat', deltaTone: 'neutral' }
  const diff = curr - prev
  if (Math.abs(diff) < 0.05) return { delta: 'flat', deltaTone: 'neutral' }
  const arrow = diff > 0 ? '↑' : '↓'
  return {
    delta: `${arrow} ${Math.abs(diff).toFixed(1)}pp`,
    deltaTone: diff > 0 ? 'success' : 'danger',
  }
}

function relativeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1mo ago' : `${months}mo ago`
}

export default async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get('origin') || '*'

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405, origin)
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !serviceRole || !anonKey) {
    return json({ error: 'Server misconfigured' }, 500, origin)
  }

  const auth = await requireAdminUser(request, supabaseUrl, anonKey)
  if ('error' in auth) {
    return json({ error: auth.error }, auth.status, origin)
  }

  const url = new URL(request.url)
  const rangeParam = url.searchParams.get('range')
  const range: Range = rangeParam === 'today' ? 'today' : '7d'

  const admin = createClient(supabaseUrl, serviceRole)

  const today = todayIso()
  const in14d = plusDaysIso(14)
  const since7d = isoDaysAgo(7)
  const since14d = isoDaysAgo(14)
  const since30d = isoDaysAgo(30)
  const yesterday24h = isoDaysAgo(1)

  try {
    const yesterdayDate = isoDaysAgo(7).slice(0, 10)
    const [
      pendingOver24hQ,
      bookingsThisWeekQ,
      enquiriesNewQ,
      enquiriesPrev7dQ,
      enquiriesThis7dQ,
      bookingsCreatedThis7dQ,
      bookingsCreatedPrev7dQ,
      draftPropertiesQ,
      livePropertiesQ,
      activeTenanciesQ,
      activeTenanciesPrevQ,
      tenanciesEnding14dQ,
      landlordsUnverifiedQ,
      landlordLeads30dQ,
      landlordLeads7dQ,
      paymentsLast7dQ,
      paymentsPrev7dQ,
      paymentsLast14dDailyQ,
      kbLatestQ,
      webhookHealthQ,
      signedNotReservingQ,
    ] = await Promise.all([
      admin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .in('status', PENDING_BOOKING_STATUSES as unknown as string[])
        .lt('created_at', yesterday24h),
      admin
        .from('bookings')
        .select('id, created_at')
        .gte('created_at', since7d),
      admin
        .from('enquiries')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'new')
        .gte('created_at', since7d),
      admin
        .from('enquiries')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since14d)
        .lt('created_at', since7d),
      admin
        .from('enquiries')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since7d),
      admin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since7d)
        .in('status', ['confirmed', 'active', 'completed']),
      admin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since14d)
        .lt('created_at', since7d)
        .in('status', ['confirmed', 'active', 'completed']),
      admin
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'draft'),
      admin
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      admin
        .from('bookings')
        .select('id, weekly_rent', { count: 'exact' })
        .in('status', ACTIVE_TENANCY_STATUSES as unknown as string[])
        .lte('start_date', today)
        .or(`end_date.is.null,end_date.gte.${today}`),
      admin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .in('status', ACTIVE_TENANCY_STATUSES as unknown as string[])
        .lte('start_date', yesterdayDate)
        .or(`end_date.is.null,end_date.gte.${yesterdayDate}`),
      admin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .in('status', ACTIVE_TENANCY_STATUSES as unknown as string[])
        .gte('end_date', today)
        .lte('end_date', in14d),
      admin
        .from('landlord_profiles')
        .select('id', { count: 'exact', head: true })
        .or('verified.is.null,verified.eq.false'),
      admin
        .from('landlord_leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since30d),
      admin
        .from('landlord_leads')
        .select('id, created_at')
        .gte('created_at', since7d),
      admin
        .from('payments')
        .select('amount_total, amount_platform_fee, paid_at')
        .gte('paid_at', since7d)
        .not('paid_at', 'is', null),
      admin
        .from('payments')
        .select('amount_total, amount_platform_fee, paid_at')
        .gte('paid_at', since14d)
        .lt('paid_at', since7d)
        .not('paid_at', 'is', null),
      admin
        .from('payments')
        .select('amount_total, paid_at')
        .gte('paid_at', since14d)
        .not('paid_at', 'is', null),
      admin
        .from('knowledge_base')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from('provider_webhook_health')
        .select('provider, last_received_at, last_error'),
      loadSignedNotReservingCandidates(admin),
    ])

    if (webhookHealthQ.error) throw webhookHealthQ.error

    const pendingOver24hCount = pendingOver24hQ.count ?? 0
    const openEnquiriesCount = enquiriesNewQ.count ?? 0
    const enquiriesPrev7dCount = enquiriesPrev7dQ.count ?? 0
    const enquiriesThis7dCount = enquiriesThis7dQ.count ?? 0
    const bookingsThis7dCount = bookingsCreatedThis7dQ.count ?? 0
    const bookingsPrev7dCount = bookingsCreatedPrev7dQ.count ?? 0
    const draftCount = draftPropertiesQ.count ?? 0
    const liveCount = livePropertiesQ.count ?? 0
    const activeTenancyCount = activeTenanciesQ.count ?? 0
    const activeTenancyPrev = activeTenanciesPrevQ.count ?? 0
    const tenanciesEndingCount = tenanciesEnding14dQ.count ?? 0
    const unverifiedLandlords = landlordsUnverifiedQ.count ?? 0
    const leadsPipeline = landlordLeads30dQ.count ?? 0
    const leadsLast7d = landlordLeads7dQ.data ?? []
    const bookingsLast7d = bookingsThisWeekQ.data ?? []
    const paymentsThis7d = paymentsLast7dQ.data ?? []
    const paymentsPrior7d = paymentsPrev7dQ.data ?? []
    const paymentsDaily = paymentsLast14dDailyQ.data ?? []
    const kbLatest = kbLatestQ.data
    const webhookClassified = classifyWebhookHealth(webhookHealthQ.data ?? [], Date.now())
    const signedNotReservingAttention = classifySignedNotReserving(signedNotReservingQ.rows, {
      smokeBookingIds: signedNotReservingQ.smokeBookingIds,
    })

    const collected7dCents = paymentsThis7d.reduce(
      (sum, p) => sum + (p.amount_total ?? 0),
      0,
    )
    const collectedPrev7dCents = paymentsPrior7d.reduce(
      (sum, p) => sum + (p.amount_total ?? 0),
      0,
    )
    const serviceFee7dCents = paymentsThis7d.reduce(
      (sum, p) => sum + (p.amount_platform_fee ?? 0),
      0,
    )

    const conversionThis7d =
      enquiriesThis7dCount === 0 ? 0 : (bookingsThis7dCount / enquiriesThis7dCount) * 100
    const conversionPrev7d =
      enquiriesPrev7dCount === 0 ? 0 : (bookingsPrev7dCount / enquiriesPrev7dCount) * 100

    const activeTenancyRents = (activeTenanciesQ.data ?? []).map((b) => b.weekly_rent ?? 0)
    const avgWeeklyRent =
      activeTenancyRents.length === 0
        ? 0
        : activeTenancyRents.reduce((s, n) => s + n, 0) / activeTenancyRents.length

    // 7-day sparklines (oldest → newest, one bucket per day).
    const bookingsSpark = bucketByDay(bookingsLast7d, 7)
    const leadsSpark = bucketByDay(leadsLast7d, 7)
    const tenanciesSpark = monoidSpark(activeTenancyCount, 7) // flat-ish; we don't store daily snapshots
    const revenueSpark = bucketRevenueByDay(paymentsDaily, 7)
    const trustSpark = monoidSpark(38, 7) // client overlays the real % from localStorage; spark is illustrative
    const platformSpark = monoidSpark(1, 7)

    const attention: AttentionItem[] = []
    if (pendingOver24hCount > 0) {
      attention.push({
        id: 'pending-bookings-24h',
        tone: 'critical',
        text: `${pendingOver24hCount} pending bookings > 24h`,
        fixHref: '/admin/bookings?status=pending&overdue=24h',
      })
    }
    if (openEnquiriesCount > 0) {
      attention.push({
        id: 'open-enquiries',
        tone: 'action',
        text: `${openEnquiriesCount} landlord enquiries unanswered`,
        fixHref: '/admin/enquiries?status=new',
      })
    }
    if (tenanciesEndingCount > 0) {
      attention.push({
        id: 'tenancies-ending',
        tone: 'watch',
        text: `${tenanciesEndingCount} tenancies ending in 14d`,
        fixHref: '/admin/bookings?ending=14d',
      })
    }
    if (unverifiedLandlords > 0) {
      attention.push({
        id: 'landlords-unverified',
        tone: 'action',
        text: `${unverifiedLandlords} landlords pending verification`,
        fixHref: '/admin/landlords?verified=false',
      })
    }
    for (const item of signedNotReservingAttention) {
      attention.push(item)
    }
    for (const item of webhookClassified.attention) {
      attention.push(item)
    }

    const snapshot: LivingConsoleSnapshot = {
      range,
      // Decision I1: hardcode Sydney.
      city: 'Sydney',
      generatedAt: new Date().toISOString(),
      attention,
      zones: {
        marketplace: {
          spark: bookingsSpark,
          sparkColor: 'coral',
          rows: dropEmpty([
            row('critical', pendingOver24hCount, `${pendingOver24hCount} pending bookings > 24h`),
            row('action', openEnquiriesCount, `${openEnquiriesCount} open enquiries this week`),
            row('watch', draftCount, `${draftCount} listings unfulfilled`, draftCount === 0),
          ]),
        },
        tenancies: {
          spark: tenanciesSpark,
          sparkColor: 'navy',
          rows: dropEmpty([
            row('ok', activeTenancyCount, `${activeTenancyCount} active tenancies`, activeTenancyCount === 0),
            // Decision B2: condition reports + rent overdue stay stubbed until tables exist.
            { tone: 'action', text: 'Rent overdue - coming soon', stub: true } as ZoneRow,
            row('watch', tenanciesEndingCount, `${tenanciesEndingCount} tenancies ending in 14d`, tenanciesEndingCount === 0),
          ]),
        },
        supply: {
          spark: leadsSpark,
          sparkColor: 'navy',
          rows: dropEmpty([
            row('ok', leadsPipeline, `${leadsPipeline} landlord leads in pipeline`, leadsPipeline === 0),
            row('action', unverifiedLandlords, `${unverifiedLandlords} landlords pending verification`, unverifiedLandlords === 0),
            { tone: 'watch', text: `${liveCount} properties live · ${draftCount} draft` },
          ]),
        },
        money: {
          spark: revenueSpark,
          sparkColor: 'coral',
          rows: dropEmpty([
            { tone: 'ok', text: `${fmtCurrency(collected7dCents)} collected past 7d` },
            // Decision G1: count of payments past 7d (replaces the "Stripe payout failed" row).
            { tone: paymentsThis7d.length > 0 ? 'ok' : 'watch', text: `${paymentsThis7d.length} payments past 7d` },
            { tone: 'ok', text: `${fmtCurrency(serviceFee7dCents)} service fee earned past 7d` },
          ]),
        },
        trust: {
          spark: trustSpark,
          sparkColor: 'navy',
          rows: [
            // Decision F1: completion % is overlaid by the client from localStorage.
            { tone: 'watch', text: 'Trust checklist completion - overlaid by client', stub: true },
            // Decision B2: condition reports stub until table lands.
            { tone: 'action', text: 'Condition reports - coming soon', stub: true },
            { tone: 'watch', text: '0 SLA at risk', stub: true },
          ],
        },
        platform: {
          spark: platformSpark,
          sparkColor: 'navy',
          rows: [
            // One row per provider from provider_webhook_health (no hardcoded "all green").
            ...webhookClassified.zoneRows,
            { tone: 'ok', text: '0 domains expiring ≤ 30 days', stub: true },
            kbLatest?.updated_at
              ? { tone: 'watch', text: `Knowledge base last edited ${relativeAgo(kbLatest.updated_at)}` }
              : { tone: 'watch', text: 'Knowledge base empty', stub: true },
          ],
        },
      },
      pulse: {
        mrr: {
          value: fmtCurrency(collected7dCents),
          unit: 'AUD',
          ...deltaCurrency(collected7dCents, collectedPrev7dCents),
          spark: revenueSpark,
          sparkColor: 'coral',
          href: '/admin/payments',
          linkLabel: 'Revenue console →',
        },
        activeTenancies: {
          value: String(activeTenancyCount),
          unit: null,
          ...deltaCount(activeTenancyCount, activeTenancyPrev),
          spark: tenanciesSpark,
          sparkColor: 'navy',
          href: '/admin/bookings?status=confirmed',
          linkLabel: 'Tenancies →',
        },
        conversion: {
          value: fmtPercent(conversionThis7d),
          unit: null,
          ...deltaPercentPoints(conversionThis7d, conversionPrev7d),
          spark: bookingsSpark,
          sparkColor: 'navy',
          href: '/admin/enquiries',
          linkLabel: 'Funnel →',
        },
        avgWeeklyRent: {
          value: avgWeeklyRent > 0 ? fmtCurrency(avgWeeklyRent * 100) : '-',
          unit: avgWeeklyRent > 0 ? 'AUD' : null,
          delta: avgWeeklyRent > 0 ? 'rolling avg' : 'no tenancies yet',
          deltaTone: 'neutral',
          spark: bookingsSpark.map((n) => n + 500),
          sparkColor: 'coral',
          href: '/admin/properties',
          linkLabel: 'Properties →',
        },
      },
    }

    return json(snapshot, 200, origin)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[api/admin/living-console-snapshot]', message)
    return json({ error: 'Failed to build snapshot' }, 500, origin)
  }
}

// Build a 7-element array: count of rows whose created_at falls within each
// of the past `days` days (oldest bucket first).
function bucketByDay(rows: Array<{ created_at: string }>, days: number): number[] {
  const buckets = new Array<number>(days).fill(0)
  const now = Date.now()
  for (const row of rows) {
    const ms = new Date(row.created_at).getTime()
    const dayIdx = days - 1 - Math.floor((now - ms) / (24 * 60 * 60 * 1000))
    if (dayIdx >= 0 && dayIdx < days) buckets[dayIdx] += 1
  }
  return buckets
}

function bucketRevenueByDay(
  rows: Array<{ amount_total: number | null; paid_at: string | null }>,
  days: number,
): number[] {
  const buckets = new Array<number>(days).fill(0)
  const now = Date.now()
  for (const row of rows) {
    if (!row.paid_at) continue
    const ms = new Date(row.paid_at).getTime()
    const dayIdx = days - 1 - Math.floor((now - ms) / (24 * 60 * 60 * 1000))
    if (dayIdx >= 0 && dayIdx < days) buckets[dayIdx] += (row.amount_total ?? 0) / 100
  }
  return buckets
}

// Flat synthetic sparkline when daily snapshots aren't stored (e.g. active
// tenancy count). Keeps the chart honest - same value across the window.
function monoidSpark(value: number, days: number): number[] {
  return new Array<number>(days).fill(value)
}

function row(tone: Tone, count: number, text: string, hideWhenZero = false): ZoneRow | null {
  if (hideWhenZero && count === 0) return null
  return { tone, text }
}

function dropEmpty(rows: Array<ZoneRow | null>): ZoneRow[] {
  return rows.filter((r): r is ZoneRow => r !== null)
}
