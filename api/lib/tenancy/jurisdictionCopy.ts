/**
 * User-facing copy keyed to listing jurisdiction (NSW / VIC / QLD).
 * Lives under api/lib for Vercel bundles; re-exported from src/lib/tenancy/jurisdictionCopy.ts.
 */
import { resolveTenancyPackage, type TenancyPackageInput } from '../resolveTenancyPackage.js'

export function normalizeAuStateCode(state: string | null | undefined): string {
  return (state ?? '').trim().toUpperCase()
}

export type TenancyAgreementExplainerCopy = {
  headline: string
  body: string
}

const AGREEMENT_BY_STATE: Record<
  string,
  Record<'T1' | 'T2', { headline: string; legislation: string }>
> = {
  NSW: {
    T1: {
      headline: 'Legally binding NSW occupancy agreement',
      legislation: 'Residential Tenancies Act 2010 (NSW)',
    },
    T2: {
      headline: 'Legally binding NSW-compliant tenancy agreement',
      legislation: 'Residential Tenancies Act 2010 (NSW)',
    },
  },
  QLD: {
    T1: {
      headline: 'Legally binding Queensland occupancy agreement',
      legislation: 'Residential Tenancies and Rooming Accommodation Act 2008 (Qld)',
    },
    T2: {
      headline: 'Legally binding Queensland-compliant tenancy agreement',
      legislation: 'Residential Tenancies and Rooming Accommodation Act 2008 (Qld)',
    },
  },
  VIC: {
    T1: {
      headline: 'Legally binding Victorian rental agreement',
      legislation: 'Residential Tenancies Act 1997 (Vic)',
    },
    T2: {
      headline: 'Legally binding Victorian-compliant rental agreement',
      legislation: 'Residential Tenancies Act 1997 (Vic)',
    },
  },
}

/** Trust callout above DocuSeal signing — null when the listing has no supported package. */
export function tenancyAgreementExplainerCopy(input: TenancyPackageInput): TenancyAgreementExplainerCopy | null {
  const pkg = resolveTenancyPackage(input)
  if (!pkg.supported || pkg.tier === 'T3') return null

  const state = normalizeAuStateCode(input.state)
  const tier = pkg.tier as 'T1' | 'T2'
  const mapped = AGREEMENT_BY_STATE[state]?.[tier]

  if (mapped) {
    return {
      headline: mapped.headline,
      body: `Agreement generated under the ${mapped.legislation} and signed in-platform via DocuSeal.`,
    }
  }

  const packageLabel = pkg.signingPackageName?.trim() || 'Tenancy agreement'
  const stateLabel = state || 'this listing'
  return {
    headline: `Legally binding ${stateLabel} tenancy agreement`,
    body: `${packageLabel} for this listing, signed in-platform via DocuSeal.`,
  }
}

/**
 * Statutory rent-payment method copy for standard residential tenancies.
 * Returns null for boarding/lodger arrangements or unsupported states (caller shows generic copy).
 */
export function statutoryRentBankTransferCopy(
  state: string | null | undefined,
  rtaExempt: boolean,
): string | null {
  if (rtaExempt) return null

  switch (normalizeAuStateCode(state)) {
    case 'NSW':
      return (
        'Under NSW residential tenancy rules, your landlord must offer you a free bank transfer option for rent (s.35 ' +
        'Residential Tenancies Act 2010). You may still choose to pay by card through Quni if you prefer.'
      )
    case 'QLD':
      return (
        'Under Queensland residential tenancy law, your landlord must not require you to pay rent using a method that ' +
        'charges you a fee (Residential Tenancies and Rooming Accommodation Act 2008). Bank transfer is available at no ' +
        'extra cost; you may still pay by card through Quni if you prefer.'
      )
    case 'VIC':
      return (
        'Under Victorian rental laws, your rental provider must offer at least one fee-free way to pay rent ' +
        '(Residential Tenancies Act 1997). Bank transfer is available at no extra cost; you may still pay by card through Quni if you prefer.'
      )
    default:
      return null
  }
}

/** First paragraph on the bond step when the statutory bond scheme does not apply (e.g. NSW T1). */
export function landlordHeldBondIntroParagraph(
  state: string | null | undefined,
  ackAuthorityName: string | null,
): string {
  const st = normalizeAuStateCode(state)
  const jurisdiction = st || 'your state'
  const authority = ackAuthorityName ?? 'the relevant state regulator'
  return (
    `As this is a boarding/lodger arrangement, the standard residential tenancy bond scheme may not apply in ${jurisdiction}. ` +
    `Your bond is held directly by your landlord and is not required to be lodged with ${authority}.`
  )
}

export function signedTenancyAgreementDownloadFilename(state: string | null | undefined): string {
  switch (normalizeAuStateCode(state)) {
    case 'NSW':
      return 'NSW-Residential-Tenancy-Agreement.pdf'
    case 'QLD':
      return 'QLD-Residential-Tenancy-Agreement.pdf'
    case 'VIC':
      return 'VIC-Residential-Rental-Agreement.pdf'
    default:
      return 'Residential-Tenancy-Agreement.pdf'
  }
}
