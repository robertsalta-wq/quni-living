import { supabase } from '../supabase'
import { VIC_ROOMING_OPERATOR_ATTESTATION_WARRANTY } from './listingDashboardPublishBlock'

export async function recordVicRoomingOperatorAttestation(input: {
  propertyId: string
  registrationNumber: string
  operatorLicenceNumber: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc('record_property_vic_rooming_operator_attestation', {
    p_property_id: input.propertyId,
    p_registration_number: input.registrationNumber.trim(),
    p_operator_licence_number: input.operatorLicenceNumber.trim(),
    p_registration_current_declared: true,
    p_licence_current_declared: true,
    p_warranty_version: VIC_ROOMING_OPERATOR_ATTESTATION_WARRANTY,
  })
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

export async function fetchCurrentVicRoomingOperatorAttestation(propertyId: string): Promise<
  | {
      ok: true
      row: {
        registration_number: string
        operator_licence_number: string
        registration_current_declared: boolean
        licence_current_declared: boolean
        warranty_version: string
        superseded_at: string | null
      } | null
    }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from('property_vic_rooming_operator_attestations')
    .select(
      'registration_number, operator_licence_number, registration_current_declared, licence_current_declared, warranty_version, superseded_at',
    )
    .eq('property_id', propertyId)
    .is('superseded_at', null)
    .maybeSingle()
  if (error) return { ok: false, message: error.message }
  return { ok: true, row: data }
}
