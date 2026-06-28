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
import { QLD_RTA_LODGEMENT_STEPS, qldRtaLodgementStepsHtml } from './qldRtaBondCopy.js'
import {
  formatPropertyPayoutBsbDisplay,
  propertyPayoutDetailsComplete,
} from '../../../src/lib/propertyPayoutDetails.js'

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
  /** Present when complete property_payout_details supplied — enriches the pay-host step. */
  hostPayeeAccountName: string | null
  hostPayeeBsbDisplay: string | null
  hostPayeeAccountNumber: string | null
  paymentReference: string | null
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

function hostPayeeFieldsFromOptions(options?: ListingBondPaymentOptions): Pick<
  ListingBondPaymentTenantGuidance,
  'hostPayeeAccountName' | 'hostPayeeBsbDisplay' | 'hostPayeeAccountNumber' | 'paymentReference'
> {
  const p = options?.payee
  if (!p || !propertyPayoutDetailsComplete(p)) {
    return {
      hostPayeeAccountName: null,
      hostPayeeBsbDisplay: null,
      hostPayeeAccountNumber: null,
      paymentReference: null,
    }
  }
  return {
    hostPayeeAccountName: p.account_name!.trim(),
    hostPayeeBsbDisplay: formatPropertyPayoutBsbDisplay(p.bsb!),
    hostPayeeAccountNumber: p.account_number!.trim(),
    paymentReference: options?.paymentReference?.trim() || null,
  }
}

function buildHostStepProse(g: ListingBondPaymentTenantGuidance): string {
  const prefSuffix = g.preferLandlordCollection ? " (your host's stated preference)" : ''
  let content = `Pay your host directly${prefSuffix}`
  if (g.hostPayeeAccountName && g.hostPayeeBsbDisplay && g.hostPayeeAccountNumber && g.paymentReference) {
    content += ` by fee-free bank transfer: Account name: ${g.hostPayeeAccountName}; BSB: ${g.hostPayeeBsbDisplay}; Account number: ${g.hostPayeeAccountNumber}; Reference: ${g.paymentReference}.`
  } else {
    content += ' (bank transfer, cash, or as agreed)'
  }
  content += ` They must lodge with ${g.authorityLabel} within ${g.lodgementDeadlinePhrase} and give you a receipt.`
  if (g.hostPayeeAccountName && g.paymentReference) {
    content += ' You may also pay by cash or another method as agreed with your host.'
  }
  return content
}

function buildAuthorityStepProse(g: ListingBondPaymentTenantGuidance): string {
  const offeredFirst = g.preferLandlordCollection ? '' : ' (offered first)'
  return `Pay through ${g.authorityLabel}${offeredFirst}: ${g.directPayLinkLabel} (${g.directPayLinkUrl}).`
}

export type ListingBondPaymentOccupancyProse = {
  paragraphs: string[]
  bullets: string[]
  offenceNote?: string
}

/** QLD occupancy PDF: bond payment routes from existing tenant guidance copy. */
export function listingBondPaymentOccupancyProse(
  bond: TenancyBondRules,
  stateCode: string | null | undefined,
  options?: ListingBondPaymentOptions,
): ListingBondPaymentOccupancyProse | null {
  const g = listingBondPaymentTenantGuidance(bond, stateCode, options)
  if (!g) return null

  const hostStep = buildHostStepProse(g)
  const authorityStep = buildAuthorityStepProse(g)
  const routeBullets = g.preferLandlordCollection ? [hostStep, authorityStep] : [authorityStep, hostStep]

  const paragraphs: string[] = []
  if (g.directPayNote && (g.preferLandlordCollection || g.stateLabel === 'QLD')) {
    paragraphs.push(g.directPayNote)
  }
  if (g.stateLabel === 'QLD') {
    paragraphs.push('QLD — after bond is received or paid:')
  }

  const qldLodgementBullets = g.stateLabel === 'QLD' ? [...QLD_RTA_LODGEMENT_STEPS] : []
  const offenceNote =
    g.stateLabel === 'QLD'
      ? 'Not lodging bond within 10 days, or keeping it in a personal account, is an offence under Queensland law. A bond is not compulsory — rent in advance is a lawful alternative.'
      : undefined

  return {
    paragraphs,
    bullets: [...routeBullets, ...qldLodgementBullets],
    offenceNote,
  }
}

function buildHostStepEmailListItem(g: ListingBondPaymentTenantGuidance): string {
  const prefSuffix = g.preferLandlordCollection ? ' (your host&apos;s stated preference)' : ''
  let content = `<strong>Pay your host directly</strong>${prefSuffix}`
  if (g.hostPayeeAccountName && g.hostPayeeBsbDisplay && g.hostPayeeAccountNumber && g.paymentReference) {
    content += ` by fee-free bank transfer:<br>
Account name: ${escapeHtml(g.hostPayeeAccountName)}<br>
BSB: ${escapeHtml(g.hostPayeeBsbDisplay)}<br>
Account number: ${escapeHtml(g.hostPayeeAccountNumber)}<br>
Reference: ${escapeHtml(g.paymentReference)}.`
  } else {
    content += ` (bank transfer, cash, or as agreed)`
  }
  content += ` - they must lodge with ${escapeHtml(g.authorityLabel)} within ${escapeHtml(g.lodgementDeadlinePhrase)} and give you a receipt.`
  if (g.hostPayeeAccountName && g.paymentReference) {
    content += ` You may also pay by cash or another method as agreed with your host.`
  }
  return `<li>${content}</li>`
}

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
    ...hostPayeeFieldsFromOptions(options),
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
  const authorityOfferedFirst = g.preferLandlordCollection ? '' : ' (offered first)'
  const authorityItem = `<li style="margin-bottom:8px;"><strong>Pay through ${escapeHtml(g.authorityLabel)}</strong>${authorityOfferedFirst}: <a href="${escapeHtml(g.directPayLinkUrl)}" style="color:#FF6F61;font-weight:600;">${escapeHtml(g.directPayLinkLabel)}</a></li>`
  const hostItem = buildHostStepEmailListItem(g)
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

/** NSW/VIC occupancy PDF: landlord-held bond + rent payee account lines (same facts as email/panel). */
export function listingLandlordHeldPayeeOccupancyLines(
  payee: { account_name?: string | null; bsb?: string | null; account_number?: string | null },
  paymentReference: string,
): string[] | null {
  if (!propertyPayoutDetailsComplete(payee)) return null
  return [
    `Account name: ${payee.account_name!.trim()}`,
    `BSB: ${formatPropertyPayoutBsbDisplay(payee.bsb!)}`,
    `Account number: ${payee.account_number!.trim()}`,
    `Reference: ${paymentReference.trim()}`,
    'Method: Fee-free bank transfer.',
  ]
}
