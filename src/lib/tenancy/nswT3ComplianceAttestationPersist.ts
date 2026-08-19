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
 * Insert a new current attestation and supersede any prior current row.
 * Caller must ensure form is complete (nswT3ComplianceFormErrors).
 */
export async function recordNswT3ComplianceAttestation(args: {
  client: Client
  propertyId: string
  attestedByUserId: string
  listerRole: 'owner' | 'head_tenant'
  form: NswT3ComplianceFormState
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { client, propertyId, attestedByUserId, listerRole, form } = args
  const now = new Date().toISOString()

  const { error: supersedeErr } = await client
    .from('property_t3_attestations')
    .update({ superseded_at: now })
    .eq('property_id', propertyId)
    .is('superseded_at', null)

  if (supersedeErr) {
    return { ok: false, error: supersedeErr.message }
  }

  const { error: insertErr } = await client.from('property_t3_attestations').insert({
    property_id: propertyId,
    attested_by: attestedByUserId,
    attested_at: now,
    registration_number: form.registrationNumber.trim(),
    da_lawful_use_declared: form.daDeclared,
    afss_current_declared: form.afssDeclared,
    afss_statement_date: form.afssStatementDate.trim() || null,
    afss_expiry_date: form.afssExpiryDate.trim() || null,
    head_lessor_consent_declared: listerRole === 'head_tenant' ? form.headLessorConsentDeclared : null,
    warranty_version: NSW_T3_COMPLIANCE_WARRANTY_VERSION,
    evidence_paths: null,
    superseded_at: null,
  })

  if (insertErr) {
    return { ok: false, error: insertErr.message }
  }
  return { ok: true }
}
