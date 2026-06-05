/**
 * VIC platform addendum - jurisdiction-specific copy and bond metadata.
 * Bond facts are sourced from `api/lib/tenancy/rules/vic.ts` (T2 residential).
 */
import { vicTenancyRules } from '../../../../api/lib/tenancy/rules/vic.js'

export const VIC_ADDENDUM_LEGISLATION = 'Residential Tenancies Act 1997 (Vic)'
export const VIC_ADDENDUM_FORM_LABEL = 'Form 1 - Residential rental agreement'
export const VIC_ADDENDUM_SUBTITLE = 'Supplementary to the Residential Rental Agreement (Form 1)'

/** T2 residential bond rules (Form 1 package). */
export const VIC_T2_BOND_RULES = vicTenancyRules('T2').bond

export function vicBondLodgementDeadlinePhrase(): string {
  const bond = VIC_T2_BOND_RULES
  if (!bond.schemeApplies) return ''
  const unit = bond.lodgementDaysUnit === 'calendar' ? 'days' : 'business days'
  return `${bond.lodgementDays} ${unit}`
}

export function vicBondAuthorityLabel(): string {
  const bond = VIC_T2_BOND_RULES
  return bond.schemeApplies ? bond.authorityPublicLabel : 'the relevant state bond authority'
}

export function vicBondAuthorityUrl(): string {
  const bond = VIC_T2_BOND_RULES
  return bond.schemeApplies ? bond.authorityUrl : 'https://www.rtba.vic.gov.au/'
}

/** Statutory fee-free rent payment copy - mirrors NSW addendum posture for Victoria. */
export function vicFeeFreeBankTransferParagraph(): string {
  return (
    'A fee-free bank transfer option remains available at all times for recurring rent in accordance with the ' +
    `${VIC_ADDENDUM_LEGISLATION} (including provisions about how rent is to be paid).`
  )
}

/** Section 8 - condition report (VIC Form 1 / Act). */
export const VIC_CONDITION_REPORT_INTRO =
  'The parties acknowledge that an ingoing condition report may be prepared for the premises (or the rented part of ' +
  'the premises) in accordance with the Residential Tenancies Act 1997 (Vic) and Form 1. The renter will be given a ' +
  'reasonable opportunity to review and comment on the report and to attach photographs where appropriate.'

export const VIC_CONDITION_REPORT_RETURN =
  'The renter should return a signed copy (or written comments) within the timeframe notified by the rental provider or the ' +
  'platform, failing which the report may be taken as accepted except for manifest errors or items the renter could not ' +
  'reasonably have inspected.'

export const VIC_CONDITION_REPORT_OUTGOING =
  'At the end of the tenancy, an outgoing condition report may be used to compare the state of the premises with the ' +
  'ingoing report, fair wear and tear excepted. The renter should attend any scheduled inspection where practicable and ' +
  'should lodge final meter readings or other handover items through the move-out workflow when requested.'

export const VIC_ELECTRONIC_TRANSACTIONS_ACT = 'Electronic Transactions (Victoria) Act 2000'
export const VIC_DISPUTES_TRIBUNAL = 'Victorian Civil and Administrative Tribunal (VCAT)'
