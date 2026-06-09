export type ListerRole = 'owner' | 'head_tenant'

/** `null` = not answered yet; `false` = needs consent; `true` = consent obtained. */
export type HeadTenantLandlordConsent = boolean | null

export const HEAD_TENANT_LANDLORD_CONSENT_QUESTION =
  "Do you have your landlord's written consent to sub-let or transfer?"

export const HEAD_TENANT_LANDLORD_CONSENT_BLOCKED_MESSAGE =
  "You must obtain your landlord's written consent to sub-let or transfer before publishing. Use the request letter below, then return and confirm consent when you have it."

export function canHeadTenantAttestAuthorityToLet(consent: HeadTenantLandlordConsent): boolean {
  return consent === true
}

export function headTenantLandlordConsentFromAttestation(
  attestedAt: string | null | undefined,
): HeadTenantLandlordConsent {
  return attestedAt ? true : null
}

/** Lock consent only after a head-tenant listing was attested with consent confirmed. */
export function headTenantLandlordConsentLocked(args: {
  consent: HeadTenantLandlordConsent
  authorityToLetAttestedAt: string | null | undefined
}): boolean {
  return Boolean(args.authorityToLetAttestedAt) && args.consent === true
}

export interface SubletResource {
  authorityName: string
  legalRef: string
  ruleSummary: string
  letterTemplate: string
  officialUrl?: string
  note?: string
  /** Present on generic fallback when no state-specific letter is authored. */
  generic?: boolean
}

export const SUBLET_DISCLAIMER =
  'A starting point to help you ask your landlord — edit to suit. Not legal advice. ' +
  "The sub-letting agreement and any bond follow your state's official process."

const NSW_LETTER = `Dear [Landlord/Agent Name],

Re: Request for consent to sub-let a room at [Property Address]

I am writing to request your written consent to sub-let a room at the above property under section 74 of the Residential Tenancies Act 2010 (NSW). I will continue to live at the property as head-tenant.

For your peace of mind:
- I remain fully responsible for the tenancy agreement, the full rent, and the condition of the premises — my obligations to you do not change.
- The proposed sub-tenant, [Proposed Sub-tenant Name], is a verified Quni member: their identity and current student enrolment have been confirmed. They're happy to provide proof of income and references, and to complete your usual application or tenancy-database checks.
- If you consent, we'll record the arrangement in a written agreement and lodge any bond properly with NSW Fair Trading.

As consent to sub-let part of the premises can't be unreasonably withheld while I remain in occupation, I'd appreciate your written response by [Date]. Happy to provide anything further.

Yours sincerely,
[Your Name]
[Phone / Email]`

const VIC_LETTER = `Dear [Rental Provider/Agent Name],

Re: Request for consent to sub-let a room at [Property Address]

I am writing to request your written consent to sub-let a room at the above property under section 81 of the Residential Tenancies Act 1997 (Vic). I will continue to live at the property as the head-renter.

For your peace of mind:
- I remain fully responsible for the rental agreement and the full rent — my obligations to you do not change.
- The proposed sub-tenant, [Proposed Sub-tenant Name], is a verified Quni member: their identity and current student enrolment have been confirmed. They're happy to provide proof of income and references, and to complete your usual screening.
- If you consent, we'll record the arrangement in a written agreement and lodge any bond properly with the RTBA.

As consent can't be unreasonably withheld, I'd appreciate your written response by [Date]. Happy to provide anything further.

Yours sincerely,
[Your Name]
[Phone / Email]`

const QLD_LETTER = `Dear [Lessor/Agent Name],

Re: Request for permission to sub-let a room at [Property Address]

I am writing to request your written permission to sub-let a room at the above premises under the Residential Tenancies and Rooming Accommodation Act 2008 (Qld). I will continue to live at the property as head-tenant.

For your peace of mind:
- I remain fully responsible for the tenancy agreement and the full rent — my obligations to you do not change.
- The proposed sub-tenant, [Proposed Sub-tenant Name], is a verified Quni member: their identity and current student enrolment have been confirmed. I'm happy for them to complete your standard tenancy application and your own TICA/database checks, and to provide proof of income and references.
- If you approve, we'll record the arrangement in writing and lodge any bond properly with the RTA.

I'd appreciate your written response by [Date]. Please let me know if you need anything further.

Yours sincerely,
[Your Name]
[Phone / Email]`

/** Keyed by the same state code the tenancy resolver uses (uppercase AU state/territory). */
export const SUBLETTING_RESOURCES: Record<string, SubletResource> = {
  NSW: {
    authorityName: "NSW Fair Trading / Tenants' Union of NSW",
    legalRef: 'Residential Tenancies Act 2010 (NSW) s.74',
    ruleSummary:
      "If you keep living at the property, your landlord can't unreasonably refuse consent to sub-let a room, and can't charge for consenting beyond reasonable costs.",
    officialUrl: 'https://www.tenants.org.au/factsheet-18-transfer-and-sub-letting',
    letterTemplate: NSW_LETTER,
  },
  VIC: {
    authorityName: 'Consumer Affairs Victoria',
    legalRef: 'Residential Tenancies Act 1997 (Vic) ss 81, 84',
    ruleSummary:
      "You need the rental provider's written consent to sub-let; they can't unreasonably refuse or charge a fee for it. Sub-letting without consent is invalid unless VCAT orders otherwise.",
    officialUrl:
      'https://www.consumer.vic.gov.au/housing/renting/starting-and-changing-rental-agreements/different-rental-agreements/subletting',
    note: 'VIC: as the head-renter you must tell your sub-tenant you are not the property owner (s.30D).',
    letterTemplate: VIC_LETTER,
  },
  QLD: {
    authorityName: 'Residential Tenancies Authority (RTA)',
    legalRef: 'Residential Tenancies and Rooming Accommodation Act 2008 (Qld) s.238',
    ruleSummary:
      "You need the lessor's or agent's written permission to sub-let; for an ordinary private tenancy they can't unreasonably refuse. Your sub-tenant may need to complete an application.",
    officialUrl: 'https://www.rta.qld.gov.au/forms-resources/factsheets/sub-letting-fact-sheet',
    letterTemplate: QLD_LETTER,
  },
  WA: {
    authorityName: 'Consumer Protection (DMIRS)',
    legalRef: '',
    ruleSummary: '',
    letterTemplate: '', // TODO: author WA sub-let request letter
  },
  SA: {
    authorityName: 'Consumer and Business Services',
    legalRef: '',
    ruleSummary: '',
    letterTemplate: '', // TODO: author SA sub-let request letter
  },
  TAS: {
    authorityName: 'Consumer, Building and Occupational Services',
    legalRef: '',
    ruleSummary: '',
    letterTemplate: '', // TODO: author TAS sub-let request letter
  },
  ACT: {
    authorityName: 'Access Canberra',
    legalRef: '',
    ruleSummary: '',
    letterTemplate: '', // TODO: author ACT sub-let request letter
  },
  NT: {
    authorityName: 'Consumer Affairs NT',
    legalRef: '',
    ruleSummary: '',
    letterTemplate: '', // TODO: author NT sub-let request letter
  },
}

const GENERIC_SUBLET_RESOURCE: SubletResource = {
  authorityName: 'your state tenancy authority',
  legalRef: '',
  ruleSummary:
    "You must have your landlord's written consent to sub-let or transfer before listing.",
  letterTemplate: '',
  generic: true,
}

export function normalizeSublettingStateCode(stateCode: string | null | undefined): string {
  return typeof stateCode === 'string' ? stateCode.trim().toUpperCase() : ''
}

export function getSublettingResource(stateCode: string | null | undefined): SubletResource {
  const key = normalizeSublettingStateCode(stateCode)
  if (key && SUBLETTING_RESOURCES[key]) {
    const entry = SUBLETTING_RESOURCES[key]
    if (entry.letterTemplate.trim()) return entry
    if (entry.ruleSummary.trim()) return entry
    return { ...GENERIC_SUBLET_RESOURCE, authorityName: entry.authorityName }
  }
  return GENERIC_SUBLET_RESOURCE
}

export function prefillSubletLetter(
  template: string,
  args: { propertyAddress: string; listerName: string },
): string {
  const address = args.propertyAddress.trim() || '[Property Address]'
  const name = args.listerName.trim() || '[Your Name]'
  return template.replaceAll('[Property Address]', address).replaceAll('[Your Name]', name)
}

export function parseListerRole(raw: string | null | undefined): ListerRole {
  return raw === 'head_tenant' ? 'head_tenant' : 'owner'
}
