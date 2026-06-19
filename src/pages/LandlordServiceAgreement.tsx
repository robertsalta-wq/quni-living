import { LegalPageShell } from '../components/legal/LegalPageShell'
import {
  LANDLORD_SERVICE_AGREEMENT_TOC,
  LandlordServiceAgreementContent,
} from '../components/legal/LandlordServiceAgreementContent'
import Seo from '../components/Seo'

export default function LandlordServiceAgreement() {
  return (
    <>
      <Seo
        title="Landlord Service Agreement"
        description="Agreement for landlords listing accommodation on Quni Living - listings, bookings, fees, and obligations."
        canonicalPath="/landlord-service-agreement"
      />
      <LegalPageShell
        bandTitle="Landlord Service Agreement"
        pageTitle="Landlord Service Agreement"
        toc={LANDLORD_SERVICE_AGREEMENT_TOC}
      >
        <LandlordServiceAgreementContent />
      </LegalPageShell>
    </>
  )
}
