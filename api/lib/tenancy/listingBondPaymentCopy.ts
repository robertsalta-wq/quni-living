/**
 * Listing-tier bond payment guidance - statutory scheme vs landlord-held.
 * NSW: tenant may pay via Rental Bonds Online (landlord must offer first) or pay landlord directly.
 */
import type { TenancyBondRules } from './rules/types.js'
import { normalizeAuStateCode } from './jurisdictionCopy.js'
import {
  effectiveQldBondRemittancePreference,
  type ListingBondPaymentOptions,
  type QldBondRemittancePreference,
} from './qldBondRemittance.js'
import { qldRtaLodgementStepsHtml } from './qldRtaBondCopy.js'

export type { ListingBondPaymentOptions, QldBondRemittancePreference }

export type ListingBondPaymentTenantGuidance = {
  schemeApplies: true
  stateLabel: string
  authorityLabel: string
  authorityUrl: string
  lodgementDeadlinePhrase: string
  /** NSW RBO requires a landlord invite before the tenant can pay online. */
  directPayNote: string | null
  directPayLinkLabel: string
  directPayLinkUrl: string
  /** QLD only: landlord-stated preference (steer, not block). */
  qldRemittancePreference: QldBondRemittancePreference | null
  /** When true, list pay-host option before authority (landlord preference). */
  preferLandlordCollection: boolean
}

export type ListingBondPaymentLandlordObligations = {
  schemeApplies: true
  stateLabel: string
  authorityLabel: string
  authorityUrl: string
  lodgementDeadlinePhrase: string
  mustOfferAuthorityFirst: string
  ifPaidToLandlord: string
  qldRemittancePreference: QldBondRemittancePreference | null
  qldRecordReceiptNote: string | null
}

function lodgementDeadlinePhrase(bond: Extract<TenancyBondRules, { schemeApplies: true }>): string {
  const unit = bond.lodgementDaysUnit === 'calendar' ? 'days' : 'business days'
  return `${bond.lodgementDays} ${unit}`
}

const NSW_TENANT_RBO_URL =
  'https://www.nsw.gov.au/housing-and-construction/renting/rental-bonds'

export function listingBondPaymentTenantGuidance(
  bond: TenancyBondRules,
  stateCode: string | null | undefined,
  options?: ListingBondPaymentOptions,
): ListingBondPaymentTenantGuidance | null {
  if (!bond.schemeApplies) return null
  const st = normalizeAuStateCode(stateCode) || 'NSW'
  const qldPref = st === 'QLD' ? effectiveQldBondRemittancePreference(options?.qldBondRemittancePreference) : null
  const preferLandlordCollection = qldPref === 'landlord_collects_remits'

  const directPayNote =
    st === 'NSW'
      ? 'For Rental Bonds Online, your host must send you an RBO invitation email first. You can then pay by card or BPAY. Your host cannot require you to use RBO only.'
      : st === 'QLD'
        ? preferLandlordCollection
          ? 'Your host prefers to collect bond and lodge with the RTA on your behalf within 10 days. You can still lodge directly with the RTA (Web Services / QDI or Form 2) if you prefer — Quni does not block that.'
          : 'You can lodge and pay bond through the RTA web service (QDI required) or paper Form 2, or pay your host directly — it is your choice.'
        : 'You can pay bond through the state bond authority’s online service where available, or pay your host directly - it is your choice.'

  return {
    schemeApplies: true,
    stateLabel: st,
    authorityLabel: bond.authorityPublicLabel,
    authorityUrl: bond.authorityUrl,
    lodgementDeadlinePhrase: lodgementDeadlinePhrase(bond),
    directPayNote,
    directPayLinkLabel: st === 'NSW' ? 'NSW Rental Bonds Online (tenants)' : bond.authorityPublicLabel,
    directPayLinkUrl: st === 'NSW' ? NSW_TENANT_RBO_URL : bond.authorityUrl,
    qldRemittancePreference: qldPref,
    preferLandlordCollection,
  }
}

export function listingBondPaymentLandlordObligations(
  bond: TenancyBondRules,
  stateCode: string | null | undefined,
  options?: ListingBondPaymentOptions,
): ListingBondPaymentLandlordObligations | null {
  if (!bond.schemeApplies) return null
  const st = normalizeAuStateCode(stateCode) || 'NSW'
  const deadline = lodgementDeadlinePhrase(bond)
  const qldPref = st === 'QLD' ? effectiveQldBondRemittancePreference(options?.qldBondRemittancePreference) : null

  const mustOfferAuthorityFirst =
    st === 'NSW'
      ? `You must offer the renter Rental Bonds Online before accepting bond paid to you directly. You cannot require RBO only (penalties apply). If they choose RBO, send them an invitation from your RBO landlord account.`
      : qldPref === 'landlord_collects_remits'
        ? `You prefer to collect bond and lodge with ${bond.authorityPublicLabel} on the renter's behalf within ${deadline}. The renter can still lodge directly with the RTA if they choose — you cannot block that.`
        : `You must give the renter the option to pay bond through ${bond.authorityPublicLabel} before accepting payment paid to you directly. You cannot require the online authority route only.`

  const ifPaidToLandlord =
    st === 'QLD'
      ? `If the renter pays you directly, lodge the bond with ${bond.authorityPublicLabel} within ${deadline}, keep the RTA Acknowledgement of Rental Bond, and record the bond number on Quni when you have it. Recording receipt on Quni is not RTA lodgement.`
      : `If the renter pays you directly, lodge the bond with ${bond.authorityPublicLabel} within ${deadline} and provide a receipt (you can generate one on Quni after you record bond received).`

  const qldRecordReceiptNote =
    st === 'QLD'
      ? 'Recording bond received on Quni confirms off-platform payment only — you must still lodge with the RTA within 10 days and keep the Acknowledgement of Rental Bond. Not lodging or keeping bond in a personal account is an offence. A bond is not compulsory; rent in advance is a lawful alternative.'
      : null

  return {
    schemeApplies: true,
    stateLabel: st,
    authorityLabel: bond.authorityPublicLabel,
    authorityUrl: bond.authorityUrl,
    lodgementDeadlinePhrase: deadline,
    mustOfferAuthorityFirst,
    ifPaidToLandlord,
    qldRemittancePreference: qldPref,
    qldRecordReceiptNote,
  }
}

/** HTML fragments for listing acceptance emails (scheme properties only). */
export function listingBondPaymentEmailHtmlForTenant(
  bond: TenancyBondRules,
  stateCode: string | null | undefined,
  resolvedBondAmountAud: number | null,
  options?: ListingBondPaymentOptions,
): string | null {
  const g = listingBondPaymentTenantGuidance(bond, stateCode, options)
  if (!g) return null
  if (resolvedBondAmountAud == null || resolvedBondAmountAud <= 0) {
    return `<p><strong>Bond:</strong> No bond is required for this stay.</p>`
  }
  const note = g.directPayNote ? `<p style="font-size:14px;color:#555;margin-top:8px;">${escapeHtml(g.directPayNote)}</p>` : ''
  const authorityItem = `<li style="margin-bottom:8px;"><strong>Pay through ${escapeHtml(g.authorityLabel)}</strong> (offered first): <a href="${escapeHtml(g.directPayLinkUrl)}" style="color:#FF6F61;font-weight:600;">${escapeHtml(g.directPayLinkLabel)}</a></li>`
  const hostItem = `<li><strong>Pay your host directly</strong> (bank transfer, cash, or as agreed) - they must lodge with ${escapeHtml(g.authorityLabel)} within ${escapeHtml(g.lodgementDeadlinePhrase)} and give you a receipt.</li>`
  const ordered = g.preferLandlordCollection ? `${hostItem}${authorityItem}` : `${authorityItem}${hostItem}`
  const qldBlock = g.stateLabel === 'QLD' ? qldRtaLodgementStepsHtml() : ''
  return `<p><strong>Bond - your choice:</strong></p>
<ol style="margin:12px 0;padding-left:20px;font-size:15px;line-height:1.5;">
  ${ordered}
</ol>${note}${qldBlock}`
}

export function listingBondPaymentEmailHtmlForLandlord(
  bond: TenancyBondRules,
  stateCode: string | null | undefined,
  resolvedBondAmountAud: number | null,
  options?: ListingBondPaymentOptions,
): string | null {
  const o = listingBondPaymentLandlordObligations(bond, stateCode, options)
  if (!o) return null
  if (resolvedBondAmountAud == null || resolvedBondAmountAud <= 0) {
    return `<p><strong>Bond:</strong> No bond is required for this stay — you do not need to collect or lodge a bond for this booking.</p>`
  }
  const qldNote = o.qldRecordReceiptNote
    ? `<li style="margin-top:8px;">${escapeHtml(o.qldRecordReceiptNote)}</li>`
    : ''
  const qldBlock = o.stateLabel === 'QLD' ? qldRtaLodgementStepsHtml() : ''
  return `<p><strong>Bond - your legal obligations:</strong></p>
<ul style="margin:12px 0;padding-left:20px;font-size:15px;line-height:1.5;">
  <li style="margin-bottom:8px;">${escapeHtml(o.mustOfferAuthorityFirst)}</li>
  <li>${escapeHtml(o.ifPaidToLandlord)} <a href="${escapeHtml(o.authorityUrl)}" style="color:#FF6F61;font-weight:600;">${escapeHtml(o.authorityLabel)}</a></li>${qldNote}
</ul>${qldBlock}`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
