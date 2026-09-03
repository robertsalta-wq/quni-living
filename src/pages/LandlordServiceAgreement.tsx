import { useEffect } from 'react'
import { LegalPageShell } from '../components/legal/LegalPageShell'
import {
  LANDLORD_SERVICE_AGREEMENT_TOC,
  LandlordServiceAgreementContent,
} from '../components/legal/LandlordServiceAgreementContent'
import Seo from '../components/Seo'
import {
  LANDLORD_SERVICE_AGREEMENT_EFFECTIVE_DATE,
  LANDLORD_SERVICE_AGREEMENT_PUBLIC_TITLE,
} from '../lib/landlordServiceAgreement'

const LEGACY_FEE_HASHES = new Set(['fees-deduction', 'fees-payout'])

export default function LandlordServiceAgreement() {
  useEffect(() => {
    function redirectLegacyFeeHash() {
      const raw = window.location.hash.replace(/^#/, '')
      if (!LEGACY_FEE_HASHES.has(raw)) return
      const el = document.getElementById('fees')
      if (!el) return
      const url = `${window.location.pathname}${window.location.search}#fees`
      window.history.replaceState(null, '', url)
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    redirectLegacyFeeHash()
    window.addEventListener('hashchange', redirectLegacyFeeHash)
    return () => window.removeEventListener('hashchange', redirectLegacyFeeHash)
  }, [])

  return (
    <>
      <Seo
        title={LANDLORD_SERVICE_AGREEMENT_PUBLIC_TITLE}
        description="Agreement for landlords on Quni Listing: marketplace terms, $99 on accept, and what Quni does not do as an agent."
        canonicalPath="/landlord-service-agreement"
      />
      <LegalPageShell
        bandTitle={LANDLORD_SERVICE_AGREEMENT_PUBLIC_TITLE}
        pageTitle={LANDLORD_SERVICE_AGREEMENT_PUBLIC_TITLE}
        toc={LANDLORD_SERVICE_AGREEMENT_TOC}
        lastUpdated={LANDLORD_SERVICE_AGREEMENT_EFFECTIVE_DATE}
      >
        <LandlordServiceAgreementContent />
      </LegalPageShell>
    </>
  )
}
