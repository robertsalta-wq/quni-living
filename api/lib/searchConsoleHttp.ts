/**
 * Shared admin auth + JSON helpers for Search Console API routes (Node / VercelRequest).
 */
import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isPlatformAdminUser } from './adminAuth.js'
import {
  SearchConsoleConfigError,
  SearchConsoleOAuthRevokedError,
  SearchConsolePermissionError,
} from './googleSearchConsole.js'

export function json(res: VercelResponse, status: number, body: unknown) {
  res.setHeader('Content-Type', 'application/json')
  res.status(status).json(body)
}

export function parseBool(v: string | string[] | undefined): boolean {
  if (v === undefined) return false
  const s = Array.isArray(v) ? v[0] : v
  return s === '1' || s.toLowerCase() === 'true'
}

export async function requireAdminFromVercelRequest(
  req: VercelRequest,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const raw = req.headers.authorization
  const auth = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) return { ok: false, status: 401, error: 'Unauthorized' }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()
  if (!supabaseUrl || !anonKey) return { ok: false, status: 500, error: 'Server misconfigured' }

  const supabaseAuth = createClient(supabaseUrl, anonKey)
  const {
    data: { user },
    error,
  } = await supabaseAuth.auth.getUser(token)
  if (error || !user) return { ok: false, status: 401, error: 'Unauthorized' }
  if (!(await isPlatformAdminUser(user))) return { ok: false, status: 403, error: 'Forbidden' }
  return { ok: true }
}

export function mapSearchConsoleHttpError(
  e: unknown,
): { status: number; error: string; code?: string } | null {
  if (e instanceof SearchConsoleConfigError) {
    return { status: 503, error: e.message, code: e.code }
  }
  if (e instanceof SearchConsoleOAuthRevokedError) {
    return { status: 401, error: e.message, code: e.code }
  }
  if (e instanceof SearchConsolePermissionError) {
    return { status: 403, error: e.message, code: e.code }
  }
  return null
}
