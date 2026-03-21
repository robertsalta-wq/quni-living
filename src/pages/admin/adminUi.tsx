import type { Database } from '../../lib/database.types'

export const adminCardClass =
  'rounded-2xl border border-gray-100 bg-white p-5 shadow-sm'
export const adminTableWrapClass = 'overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm'
export const adminThClass = 'text-left text-xs font-semibold uppercase tracking-wide text-gray-500 px-4 py-3 border-b border-gray-100 bg-gray-50/80'
export const adminTdClass = 'px-4 py-3 text-sm text-gray-800 border-b border-gray-100 align-top'

export type StudentProfileRow = Database['public']['Tables']['student_profiles']['Row']
export type LandlordProfileRow = Database['public']['Tables']['landlord_profiles']['Row']

export function studentDisplayName(row: {
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
}): string {
  const fn = row.first_name?.trim() ?? ''
  const ln = row.last_name?.trim() ?? ''
  if (fn || ln) return [fn, ln].filter(Boolean).join(' ')
  return row.full_name?.trim() || '—'
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const t = iso.trim()
  try {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(t) ? new Date(`${t}T12:00:00`) : new Date(t)
    return d.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}


export function formatMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return `$${Number(n).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
