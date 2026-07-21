import type { Database } from '../../lib/database.types'
import { studentDisplayName as resolveStudentDisplayName } from '../../lib/nameResolution'

export const adminCardClass = 'quni-card p-5'
export const adminTableWrapClass = 'quni-card overflow-x-auto'
export const adminThClass =
  'whitespace-nowrap border-b border-admin-line bg-admin-surface-2 px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-ink-5'
export const adminTdClass =
  'border-b border-admin-line-soft px-3.5 py-3 align-top text-[13px] text-admin-ink-2'

export type StudentProfileRow = Database['public']['Tables']['student_profiles']['Row']
export type LandlordProfileRow = Database['public']['Tables']['landlord_profiles']['Row']

/** Admin list/table helper — routes through shared display resolver; blank profiles show '-'. */
export function studentDisplayName(row: {
  preferred_name?: string | null
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
}): string {
  return resolveStudentDisplayName(row, '-')
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  const t = iso.trim()
  try {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(t) ? new Date(`${t}T12:00:00`) : new Date(t)
    return d.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '-'
  }
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '-'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins} minutes ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs === 1 ? '1 hour ago' : `${hrs} hours ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return days === 1 ? 'yesterday' : `${days} days ago`
  return formatDate(iso)
}

export function formatMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '-'
  return `$${Number(n).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

/** Integer cents → AUD $x.xx */
export function formatAudCents(cents: number | null | undefined): string {
  if (cents == null || Number.isNaN(Number(cents))) return '-'
  return `$${(Number(cents) / 100).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
