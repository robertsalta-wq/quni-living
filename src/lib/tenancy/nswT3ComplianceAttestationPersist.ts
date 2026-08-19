import type { SupabaseClient } from '@supabase/supabase-js'
import {
  NSW_T3_COMPLIANCE_WARRANTY_VERSION,
  isCompleteNswT3ComplianceAttestation,
  type NswT3ComplianceAttestationRow,
  type NswT3ComplianceFormState,
} from './nswT3ComplianceAttestation'

type Client = SupabaseClient

export async function fetchCurrentNswT3ComplianceAttestation(
  client: Client,
  propertyId: string,
): Promise<NswT3ComplianceAttestationRow | null> {
  const { data, error } = await client
    .from('property_t3_attestations')
    .select(
      'id, property_id, attested_by, attested_at, registration_number, da_lawful_use_declared, afss_current_declared, afss_statement_date, afss_expiry_date, head_lessor_consent_declared, warranty_version, superseded_at',
    )
    .eq('property_id', propertyId)
    .is('superseded_at', null)
    .maybeSingle()

  if (error || !data) return null
  return data as NswT3ComplianceAttestationRow
}

export async function propertyHasCurrentNswT3ComplianceAttestation(
  client: Client,
  propertyId: string,
  listerRole: 'owner' | 'head_tenant',
): Promise<boolean> {
  const row = await fetchCurrentNswT3ComplianceAttestation(client, propertyId)
  return isCompleteNswT3ComplianceAttestation(row, listerRole)
}

/**
 * Record a new current attestation via security-definer RPC (atomic supersede + insert).
 * Caller must ensure form is complete (nswT3ComplianceFormErrors).
 * Server stamps attested_at / superseded_at / attested_by / premises snapshot.
 */
export async function recordNswT3ComplianceAttestation(args: {
  client: Client
  propertyId: string
  /** Kept for call-site compatibility; RPC sets attested_by from auth.uid(). */
  attestedByUserId: string
  /** Kept for call-site compatibility; RPC reads lister_role from the property row. */
  listerRole: 'owner' | 'head_tenant'
  form: NswT3ComplianceFormState
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { client, propertyId, listerRole, form } = args

  const { error } = await client.rpc('record_property_t3_attestation', {
    p_property_id: propertyId,
    p_registration_number: form.registrationNumber.trim(),
    p_da_lawful_use_declared: form.daDeclared,
    p_afss_current_declared: form.afssDeclared,
    p_afss_statement_date: form.afssStatementDate.trim() || null,
    p_afss_expiry_date: form.afssExpiryDate.trim() || null,
    p_head_lessor_consent_declared:
      listerRole === 'head_tenant' ? form.headLessorConsentDeclared : null,
    p_warranty_version: NSW_T3_COMPLIANCE_WARRANTY_VERSION,
  })

  if (error) {
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
