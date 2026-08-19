import { useCallback, useState } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import type { Database } from '../lib/database.types'
import { supabase } from '../lib/supabase'
import {
  AUTHORITY_TO_LET_BLOCKED_MESSAGE,
  propertyHasAuthorityToLetAttestation,
} from '../lib/authorityToLetAttestation'
import {
  NSW_T3_COMPLIANCE_BLOCKED_MESSAGE,
  isNswT3ListingFields,
} from '../lib/tenancy/nswT3ComplianceAttestation'
import { propertyHasCurrentNswT3ComplianceAttestation } from '../lib/tenancy/nswT3ComplianceAttestationPersist'
import { messageFromSupabaseError } from '../lib/supabaseErrorMessage'
import { withSentryMonitoring } from '../lib/supabaseErrorMonitor'
import { requestSiteRebuild } from '../lib/triggerSiteRebuild'

type PropertyRow = Database['public']['Tables']['properties']['Row']

export type LandlordPropertyDuplicateTarget = Pick<PropertyRow, 'id' | 'title'>

export type LandlordPropertyForListingActions = Pick<
  PropertyRow,
  | 'id'
  | 'title'
  | 'slug'
  | 'status'
  | 'authority_to_let_attested_at'
  | 'service_tier'
  | 'open_to_non_students'
  | 'rent_per_week'
  | 'max_occupants'
  | 'couple_surcharge_per_week'
  | 'parking_surcharge_per_week'
  | 'parking_available'
  | 'state'
  | 'property_type'
  | 'is_registered_rooming_house'
  | 'lister_role'
>

async function assertNswT3ComplianceBeforeActivate(
  property: LandlordPropertyForListingActions,
): Promise<string | null> {
  if (
    !isNswT3ListingFields({
      state: property.state,
      propertyType: property.property_type,
      isRegisteredRoomingHouse: property.is_registered_rooming_house,
    })
  ) {
    return null
  }
  const role = property.lister_role === 'head_tenant' ? 'head_tenant' : 'owner'
  const ok = await propertyHasCurrentNswT3ComplianceAttestation(supabase, property.id, role)
  return ok ? null : NSW_T3_COMPLIANCE_BLOCKED_MESSAGE
}

export function useLandlordPropertyListingActions(args: {
  reload: () => Promise<void>
  navigate: NavigateFunction
  showToast: (t: { kind: 'success' | 'error'; message: string }) => void
  onMutationError?: (message: string) => void
}) {
  const { reload, navigate, showToast, onMutationError } = args
  const reportMutErr = onMutationError ?? ((m: string) => showToast({ kind: 'error', message: m }))

  const [publishingListingId, setPublishingListingId] = useState<string | null>(null)
  const [duplicatingListingId, setDuplicatingListingId] = useState<string | null>(null)
  const [updatingListingId, setUpdatingListingId] = useState<string | null>(null)
  const [duplicateConfirmProperty, setDuplicateConfirmProperty] = useState<LandlordPropertyDuplicateTarget | null>(
    null,
  )

  const publishDraftListing = useCallback(
    async (property: LandlordPropertyForListingActions) => {
      if (property.status !== 'draft') return
      if (!propertyHasAuthorityToLetAttestation(property)) {
        showToast({ kind: 'error', message: AUTHORITY_TO_LET_BLOCKED_MESSAGE })
        return
      }
      const t3Block = await assertNswT3ComplianceBeforeActivate(property)
      if (t3Block) {
        showToast({ kind: 'error', message: t3Block })
        return
      }
      setPublishingListingId(property.id)
      try {
        const { error: updateError } = await supabase.from('properties').update({ status: 'active' }).eq('id', property.id)
        if (updateError) throw updateError
        requestSiteRebuild()
        await reload()
        showToast({ kind: 'success', message: 'Listing published and now live.' })
      } catch (e) {
        const msg =
          e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string'
            ? String((e as { message: string }).message)
            : 'Could not publish listing.'
        showToast({ kind: 'error', message: msg })
      } finally {
        setPublishingListingId(null)
      }
    },
    [reload, showToast],
  )

  const confirmDuplicateListing = useCallback(async () => {
    const src = duplicateConfirmProperty
    if (!src) return
    setDuplicatingListingId(src.id)
    try {
      const { data: newId, error: rpcErr } = await supabase.rpc('duplicate_property_listing', {
        p_source_id: src.id,
      })
      if (rpcErr) throw rpcErr
      if (typeof newId !== 'string' || !newId.trim()) {
        throw new Error('Duplicate did not return a listing id.')
      }
      setDuplicateConfirmProperty(null)
      navigate(`/landlord/property/edit/${newId.trim()}`)
      void reload()
    } catch (e) {
      reportMutErr(messageFromSupabaseError(e))
    } finally {
      setDuplicatingListingId(null)
    }
  }, [duplicateConfirmProperty, reload, navigate, reportMutErr])

  const togglePropertyStatus = useCallback(
    async (property: LandlordPropertyForListingActions) => {
      if (property.status !== 'active' && property.status !== 'inactive') return
      const nextStatus: PropertyRow['status'] = property.status === 'active' ? 'inactive' : 'active'
      if (nextStatus === 'active' && !propertyHasAuthorityToLetAttestation(property)) {
        showToast({ kind: 'error', message: AUTHORITY_TO_LET_BLOCKED_MESSAGE })
        return
      }
      if (nextStatus === 'active') {
        const t3Block = await assertNswT3ComplianceBeforeActivate(property)
        if (t3Block) {
          showToast({ kind: 'error', message: t3Block })
          return
        }
      }
      setUpdatingListingId(property.id)
      try {
        const { error: updateError } = await withSentryMonitoring('LandlordPropertyListing/toggle-status', () =>
          supabase.from('properties').update({ status: nextStatus }).eq('id', property.id),
        )
        if (updateError) throw updateError
        requestSiteRebuild()
        await reload()
      } catch (e) {
        reportMutErr(messageFromSupabaseError(e))
      } finally {
        setUpdatingListingId(null)
      }
    },
    [reload, reportMutErr, showToast],
  )

  return {
    publishingListingId,
    duplicatingListingId,
    updatingListingId,
    duplicateConfirmProperty,
    setDuplicateConfirmProperty,
    publishDraftListing,
    confirmDuplicateListing,
    togglePropertyStatus,
  }
}
