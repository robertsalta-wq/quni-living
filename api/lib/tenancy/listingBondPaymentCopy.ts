/**
 * Listing-tier bond payment guidance — statutory scheme vs landlord-held.
 * NSW: tenant may pay via Rental Bonds Online (landlord must offer first) or pay landlord directly.
 */
import type { TenancyBondRules } from './rules/types.js'
import { normalizeAuStateCode } from './jurisdictionCopy.js'

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
}

export type ListingBondPaymentLandlordObligations = {
  schemeApplies: true
  stateLabel: string
  authorityLabel: string
  authorityUrl: string
  lodgementDeadlinePhrase: string
  mustOfferAuthorityFirst: string
  ifPaidToLandlord: string
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
): ListingBondPaymentTenantGuidance | null {
  if (!bond.schemeApplies) return null
  const st = normalizeAuStateCode(stateCode) || 'NSW'
  const directPayNote =
    st === 'NSW'
      ? 'For Rental Bonds Online, your host must send you an RBO invitation email first. You can then pay by card or BPAY. Your host cannot require you to use RBO only.'
      : st === 'QLD'
        ? 'You can lodge and pay bond through the RTA web service, or pay your host directly — it is your choice.'
        : 'You can pay bond through the state bond authority’s online service where available, or pay your host directly — it is your choice.'

  return {
    schemeApplies: true,
    stateLabel: st,
    authorityLabel: bond.authorityPublicLabel,
    authorityUrl: bond.authorityUrl,
    lodgementDeadlinePhrase: lodgementDeadlinePhrase(bond),
    directPayNote,
    directPayLinkLabel: st === 'NSW' ? 'NSW Rental Bonds Online (tenants)' : bond.authorityPublicLabel,
    directPayLinkUrl: st === 'NSW' ? NSW_TENANT_RBO_URL : bond.authorityUrl,
  }
}

export function listingBondPaymentLandlordObligations(
  bond: TenancyBondRules,
  stateCode: string | null | undefined,
): ListingBondPaymentLandlordObligations | null {
  if (!bond.schemeApplies) return null
  const st = normalizeAuStateCode(stateCode) || 'NSW'
  const deadline = lodgementDeadlinePhrase(bond)

  const mustOfferAuthorityFirst =
    st === 'NSW'
      ? `You must offer the renter Rental Bonds Online before accepting bond paid to you directly. You cannot require RBO only (penalties apply). If they choose RBO, send them an invitation from your RBO landlord account.`
      : `You must give the renter the option to pay bond through ${bond.authorityPublicLabel} before accepting payment paid to you directly. You cannot require the online authority route only.`

  const ifPaidToLandlord = `If the renter pays you directly, lodge the bond with ${bond.authorityPublicLabel} within ${deadline} and provide a receipt (you can generate one on Quni after you record bond received).`

  return {
    schemeApplies: true,
    stateLabel: st,
    authorityLabel: bond.authorityPublicLabel,
    authorityUrl: bond.authorityUrl,
    lodgementDeadlinePhrase: deadline,
    mustOfferAuthorityFirst,
    ifPaidToLandlord,
  }
}

/** HTML fragments for listing acceptance emails (scheme properties only). */
export function listingBondPaymentEmailHtmlForTenant(
  bond: TenancyBondRules,
  stateCode: string | null | undefined,
): string | null {
  const g = listingBondPaymentTenantGuidance(bond, stateCode)
  if (!g) return null
  const note = g.directPayNote ? `<p style="font-size:14px;color:#555;margin-top:8px;">${escapeHtml(g.directPayNote)}</p>` : ''
  return `<p><strong>Bond — your choice:</strong></p>
<ol style="margin:12px 0;padding-left:20px;font-size:15px;line-height:1.5;">
  <li style="margin-bottom:8px;"><strong>Pay through ${escapeHtml(g.authorityLabel)}</strong> (offered first): <a href="${escapeHtml(g.directPayLinkUrl)}" style="color:#FF6F61;font-weight:600;">${escapeHtml(g.directPayLinkLabel)}</a></li>
  <li><strong>Pay your host directly</strong> (bank transfer, cash, or as agreed) — they must lodge with ${escapeHtml(g.authorityLabel)} within ${escapeHtml(g.lodgementDeadlinePhrase)} and give you a receipt.</li>
</ol>${note}`
}

export function listingBondPaymentEmailHtmlForLandlord(
  bond: TenancyBondRules,
  stateCode: string | null | undefined,
): string | null {
  const o = listingBondPaymentLandlordObligations(bond, stateCode)
  if (!o) return null
  return `<p><strong>Bond — your legal obligations:</strong></p>
<ul style="margin:12px 0;padding-left:20px;font-size:15px;line-height:1.5;">
  <li style="margin-bottom:8px;">${escapeHtml(o.mustOfferAuthorityFirst)}</li>
  <li>${escapeHtml(o.ifPaidToLandlord)} <a href="${escapeHtml(o.authorityUrl)}" style="color:#FF6F61;font-weight:600;">${escapeHtml(o.authorityLabel)}</a></li>
</ul>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
