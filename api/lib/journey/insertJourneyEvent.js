import { createClient } from '@supabase/supabase-js'
import { captureSentryMessageEdge } from '../sentryEdgeCapture.js'

/** @type {boolean} */
let journeyInsertFailureReported = false

/**
 * @returns {import('@supabase/supabase-js').SupabaseClient | null}
 */
function serviceRoleAdminFromEnv() {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRole) return null
  return createClient(supabaseUrl, serviceRole)
}

/**
 * Fire-safe insert into journey_events. Never throws (table may not exist pre-migration).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient | null | undefined} [admin]
 * @param {{
 *   user_id?: string | null
 *   email?: string | null
 *   attempt_id?: string | null
 *   property_id?: string | null
 *   event_type: string
 *   step?: string | null
 *   error_code?: string | null
 *   http_status?: number | null
 *   service_tier?: string | null
 *   source?: string
 *   metadata?: Record<string, unknown>
 * }} row
 */
export async function insertJourneyEvent(row, admin) {
  if (!row?.event_type) return

  const client = admin ?? serviceRoleAdminFromEnv()
  if (!client) return

  try {
    const payload = {
      user_id: row.user_id ?? null,
      email: row.email ?? null,
      attempt_id: row.attempt_id ?? null,
      property_id: row.property_id ?? null,
      event_type: row.event_type,
      step: row.step ?? null,
      error_code: row.error_code ?? null,
      http_status: row.http_status ?? null,
      service_tier: row.service_tier ?? null,
      source: row.source ?? 'server',
      metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
    }

    const { error } = await client.from('journey_events').insert(payload)
    if (error) throw error
  } catch (e) {
    if (!journeyInsertFailureReported) {
      journeyInsertFailureReported = true
      await captureSentryMessageEdge('journey_events insert failed', {
        event_type: row.event_type,
        message: e instanceof Error ? e.message : String(e),
      })
    }
  }
}

/**
 * @param {unknown} body
 * @returns {string | null}
 */
export function readAttemptIdFromBody(body) {
  if (!body || typeof body !== 'object') return null
  const b = /** @type {Record<string, unknown>} */ (body)
  const raw = b.attemptId ?? b.attempt_id
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed || null
}
