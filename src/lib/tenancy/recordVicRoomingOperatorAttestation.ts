import { supabase } from '../supabase'

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
    p_warranty_version: 'vic-rooming-operator-attestation-v1',
  })
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}
