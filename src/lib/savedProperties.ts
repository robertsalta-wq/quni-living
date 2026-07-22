import { supabase } from './supabase'
import type { Property } from './listings'
import { PROPERTY_CARD_LIST_SELECT } from './propertyCardSelect'
import {
  clearPendingSavePropertyId,
  peekPendingSavePropertyId,
  PENDING_SAVE_PROPERTY_KEY,
  setPendingSavePropertyId,
} from './savedPropertiesPending'

export {
  clearPendingSavePropertyId,
  peekPendingSavePropertyId,
  PENDING_SAVE_PROPERTY_KEY,
  setPendingSavePropertyId,
}

const UNIQUE_VIOLATION = '23505'

/** Fetch saved property ids for the current auth user (RLS-scoped). */
export async function fetchSavedPropertyIds(): Promise<string[]> {
  const { data, error } = await supabase.from('saved_properties').select('property_id')
  if (error) throw error
  return (data ?? []).map((row) => row.property_id)
}

/**
 * Insert a save. Omits user_id so DB default auth.uid() applies.
 * Unique conflicts are treated as success (already saved).
 */
export async function insertSavedProperty(propertyId: string): Promise<'saved' | 'already_saved'> {
  const { error } = await supabase.from('saved_properties').insert({ property_id: propertyId })
  if (!error) return 'saved'
  if (error.code === UNIQUE_VIOLATION) return 'already_saved'
  throw error
}

export async function deleteSavedProperty(propertyId: string): Promise<void> {
  const { error } = await supabase.from('saved_properties').delete().eq('property_id', propertyId)
  if (error) throw error
}

type SavedRow = {
  property_id: string
  created_at: string
  properties: Property | Property[] | null
}

/** Saved listings newest-first, shaped for PropertyCard. */
export async function listSavedProperties(): Promise<Property[]> {
  const { data, error } = await supabase
    .from('saved_properties')
    .select(`property_id, created_at, properties ( ${PROPERTY_CARD_LIST_SELECT} )`)
    .order('created_at', { ascending: false })

  if (error) throw error

  const rows = (data ?? []) as unknown as SavedRow[]
  const out: Property[] = []
  for (const row of rows) {
    const prop = Array.isArray(row.properties) ? row.properties[0] : row.properties
    if (prop?.id) out.push(prop)
  }
  return out
}

/** Apply pending guest save once. Returns whether a pending id was consumed. */
export async function consumePendingSaveProperty(): Promise<boolean> {
  const propertyId = peekPendingSavePropertyId()
  if (!propertyId) return false
  try {
    await insertSavedProperty(propertyId)
    clearPendingSavePropertyId()
    return true
  } catch {
    // Leave pending id for a later authenticated retry.
    return false
  }
}
