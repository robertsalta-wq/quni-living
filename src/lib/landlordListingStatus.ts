import type { Database } from './database.types'

type PropertyStatus = Database['public']['Tables']['properties']['Row']['status']

export function listingStatusClass(s: PropertyStatus) {
  if (s === 'active') return 'bg-emerald-100 text-emerald-800'
  if (s === 'pending') return 'bg-amber-100 text-amber-800'
  if (s === 'draft') return 'bg-slate-100 text-slate-700'
  return 'bg-gray-100 text-gray-600'
}

export function listingStatusLabel(s: PropertyStatus) {
  if (s === 'inactive') return 'paused'
  if (s === 'draft') return 'draft'
  return s
}
