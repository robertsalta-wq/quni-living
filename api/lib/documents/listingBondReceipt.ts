/**
 * Listing-tier bond receipt: render existing PDF components, store in tenancy-documents,
 * insert tenancy_documents row. Does NOT patch tenancies.bond_lodged_* (boarding-only).
 */
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import type { SupabaseClient } from '@supabase/supabase-js'

import { BondReceiptPdf } from '../../documents/BondReceiptPdf.js'
import { QldBondPaymentReceiptPdf } from '../../documents/QldBondPaymentReceiptPdf.js'
import { resolveBookingBondAmountAud } from '../booking/bookingBondAmount.js'
import { tenantLegalNameForDocuments } from '../booking/tenantLegalNameForDocuments.js'

export type ListingBondReceiptGenResult =
  | {
      status: 'created' | 'overwritten'
      documentId: string
      filePath: string
      pdfBase64: string
      receiptNumber: string
    }
  | { status: 'skipped_exists'; documentId: string }
  | { status: 'skipped'; reason: string }

function warn(logger: Pick<Console, 'warn'> | undefined, msg: string, err?: unknown) {
  const fn = logger?.warn ?? console.warn
  if (err !== undefined) fn(msg, err)
  else fn(msg)
}

function propertyAddressLine(p: Record<string, unknown>): string {
  const parts = [
    typeof p.address === 'string' ? p.address.trim() : '',
    typeof p.suburb === 'string' ? p.suburb.trim() : '',
    typeof p.state === 'string' ? p.state.trim() : '',
    typeof p.postcode === 'string' ? p.postcode.trim() : '',
  ].filter(Boolean)
  return parts.join(', ')
}

function personFullName(row: Record<string, unknown>): string {
  const a = [row.first_name, row.last_name].filter((x) => typeof x === 'string' && String(x).trim())
  const joined = a.join(' ').trim()
  if (joined) return joined
  const full = typeof row.full_name === 'string' ? row.full_name.trim() : ''
  return full || '-'
}

function formatBondAud(amount: number): string {
  const n = Math.round(amount * 100) / 100
  return `$${n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function receiptNumberFromTenancy(tenancyId: string, dateReceivedYmd: string): string {
  const year = dateReceivedYmd.slice(0, 4)
  const idPart = tenancyId.replace(/-/g, '').slice(0, 6).toUpperCase()
  return `QR-${year}-${idPart}`
}

function ymdFromIsoOrToday(iso: string | null | undefined): string {
  if (typeof iso === 'string' && iso.trim()) {
    const d = new Date(iso)
    if (Number.isFinite(d.getTime())) {
      return d.toISOString().slice(0, 10)
    }
  }
  return new Date().toISOString().slice(0, 10)
}

/**
 * Idempotent by default: if a bond_receipt row already exists, returns skipped_exists.
 * Pass `force: true` to overwrite storage + update the existing row (admin backfill).
 * Soft failures return skipped with a reason (never throws).
 */
export async function generateAndPersistListingBondReceipt(args: {
  admin: SupabaseClient
  bookingId: string
  /** Optional auth user id for generated_by */
  generatedByUserId?: string | null
  /** When true, regenerate PDF and update existing bond_receipt row instead of skipping. */
  force?: boolean
  logger?: Pick<Console, 'warn'>
}): Promise<ListingBondReceiptGenResult> {
  const { admin, bookingId, generatedByUserId, force = false, logger } = args

  try {
    const { data: tenancy, error: tErr } = await admin
      .from('tenancies')
      .select('id, property_id, student_profile_id, landlord_profile_id')
      .eq('booking_id', bookingId)
      .maybeSingle()

    if (tErr) {
      warn(logger, '[listing-bond-receipt] load tenancy', tErr)
      return { status: 'skipped', reason: 'tenancy_load_error' }
    }
    if (!tenancy?.id) {
      return { status: 'skipped', reason: 'no_tenancy' }
    }

    const { data: existingDoc, error: existErr } = await admin
      .from('tenancy_documents')
      .select('id')
      .eq('tenancy_id', tenancy.id)
      .eq('document_type', 'bond_receipt')
      .maybeSingle()

    if (existErr) {
      warn(logger, '[listing-bond-receipt] check existing', existErr)
      return { status: 'skipped', reason: 'existing_check_error' }
    }
    if (existingDoc?.id && !force) {
      return { status: 'skipped_exists', documentId: existingDoc.id }
    }

    const { data: booking, error: bErr } = await admin
      .from('bookings')
      .select('bond_amount, weekly_rent, bond_received_by_landlord_at, service_tier_final')
      .eq('id', bookingId)
      .maybeSingle()

    if (bErr || !booking) {
      warn(logger, '[listing-bond-receipt] load booking', bErr)
      return { status: 'skipped', reason: 'booking_load_error' }
    }

    if (!tenancy.property_id || !tenancy.student_profile_id || !tenancy.landlord_profile_id) {
      return { status: 'skipped', reason: 'tenancy_incomplete' }
    }

    const { data: prop, error: pErr } = await admin
      .from('properties')
      .select('address, suburb, state, postcode, property_type, bond, bond_weeks')
      .eq('id', tenancy.property_id)
      .maybeSingle()

    if (pErr || !prop) {
      warn(logger, '[listing-bond-receipt] load property', pErr)
      return { status: 'skipped', reason: 'property_load_error' }
    }

    const amount = resolveBookingBondAmountAud(booking.bond_amount, prop, booking.weekly_rent)
    if (amount == null || !(amount > 0)) {
      return { status: 'skipped', reason: 'no_bond_amount' }
    }

    const { data: landlord, error: llErr } = await admin
      .from('landlord_profiles')
      .select('full_name, first_name, last_name, email')
      .eq('id', tenancy.landlord_profile_id)
      .maybeSingle()

    const { data: student, error: stErr } = await admin
      .from('student_profiles')
      .select('full_name, first_name, last_name, email, verification_type, legal_name_locked_at')
      .eq('id', tenancy.student_profile_id)
      .maybeSingle()

    if (llErr || stErr || !landlord || !student) {
      warn(logger, '[listing-bond-receipt] load profiles', llErr ?? stErr)
      return { status: 'skipped', reason: 'profile_load_error' }
    }

    const propRec = prop as Record<string, unknown>
    const llRec = landlord as Record<string, unknown>
    const stRec = student as Record<string, unknown>
    const propState = typeof prop.state === 'string' ? prop.state.trim().toUpperCase() : ''
    const isQld = propState === 'QLD'

    const dateReceived = ymdFromIsoOrToday(
      typeof booking.bond_received_by_landlord_at === 'string'
        ? booking.bond_received_by_landlord_at
        : null,
    )
    const dateObj = new Date(`${dateReceived}T12:00:00`)
    const dateReceivedDisplay = Number.isFinite(dateObj.getTime())
      ? dateObj.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
      : dateReceived

    const landlordName = personFullName(llRec)
    const landlordEmail =
      typeof llRec.email === 'string' && llRec.email.trim() ? llRec.email.trim() : ''
    const tenantName = tenantLegalNameForDocuments(stRec, '-')
    const addressLine = propertyAddressLine(propRec) || '-'
    const receiptNumber = receiptNumberFromTenancy(tenancy.id, dateReceived)

    const pdfProps = {
      receiptNumber,
      dateReceivedDisplay,
      propertyAddress: addressLine,
      landlordName,
      landlordEmail: landlordEmail || '-',
      tenantName,
      amountDisplay: formatBondAud(amount),
      paymentMethod: 'Other',
      notes: 'Landlord confirmed bond received on Quni',
      acknowledgementName: landlordName,
    }

    const element = isQld
      ? React.createElement(QldBondPaymentReceiptPdf, pdfProps)
      : React.createElement(BondReceiptPdf, pdfProps)
    const pdfBuffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0])
    const storagePath = `${tenancy.id}/bond/bond_receipt.pdf`

    const { error: upErr } = await admin.storage
      .from('tenancy-documents')
      .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

    if (upErr) {
      warn(logger, '[listing-bond-receipt] storage upload', upErr)
      return { status: 'skipped', reason: 'storage_upload_error' }
    }

    const metadata = {
      payment_method: 'Other',
      notes: 'Landlord confirmed bond received on Quni',
      amount_received: amount,
      receipt_variant: 'listing_residential',
      receipt_number: receiptNumber,
      ...(force && existingDoc?.id
        ? { regenerated_at: new Date().toISOString(), admin_force: true }
        : {}),
    }

    if (existingDoc?.id && force) {
      const { data: updated, error: upDocErr } = await admin
        .from('tenancy_documents')
        .update({
          status: 'signed',
          file_path: storagePath,
          generated_by: generatedByUserId ?? null,
          metadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingDoc.id)
        .select('id')
        .single()

      if (upDocErr || !updated?.id) {
        warn(logger, '[listing-bond-receipt] tenancy_documents update', upDocErr)
        return { status: 'skipped', reason: 'document_update_error' }
      }

      return {
        status: 'overwritten',
        documentId: updated.id,
        filePath: storagePath,
        pdfBase64: Buffer.from(pdfBuffer).toString('base64'),
        receiptNumber,
      }
    }

    const { data: docRow, error: docErr } = await admin
      .from('tenancy_documents')
      .insert({
        tenancy_id: tenancy.id,
        document_type: 'bond_receipt',
        status: 'signed',
        file_path: storagePath,
        generated_by: generatedByUserId ?? null,
        metadata,
      })
      .select('id')
      .single()

    if (docErr || !docRow?.id) {
      // Concurrent insert: treat existing row as success-skip (unless force already handled)
      const { data: raced } = await admin
        .from('tenancy_documents')
        .select('id')
        .eq('tenancy_id', tenancy.id)
        .eq('document_type', 'bond_receipt')
        .maybeSingle()
      if (raced?.id) {
        return { status: 'skipped_exists', documentId: raced.id }
      }
      warn(logger, '[listing-bond-receipt] tenancy_documents insert', docErr)
      return { status: 'skipped', reason: 'document_insert_error' }
    }

    return {
      status: 'created',
      documentId: docRow.id,
      filePath: storagePath,
      pdfBase64: Buffer.from(pdfBuffer).toString('base64'),
      receiptNumber,
    }
  } catch (e) {
    warn(logger, '[listing-bond-receipt] unexpected', e)
    return { status: 'skipped', reason: 'unexpected_error' }
  }
}
