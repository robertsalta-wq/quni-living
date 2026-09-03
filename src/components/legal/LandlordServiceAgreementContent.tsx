import { Link } from 'react-router-dom'
import {
  formatContractingPartyName,
  LEGAL_ENTITY_ABN,
  LEGAL_ENTITY_ACN,
  LEGAL_ENTITY_NAME,
} from '../../lib/legalEntity'
import { formatAustralianAbn } from '../../lib/platformIdentity'
import { LegalH2, LegalH3, LegalP, LegalUl, type LegalTocItem } from './LegalPageShell'

export const LANDLORD_SERVICE_AGREEMENT_TOC: LegalTocItem[] = [
  { id: 'about', label: '1. About this agreement' },
  { id: 'role', label: '2. Our role' },
  { id: 'account', label: '3. Your account' },
  { id: 'listings', label: '4. Your listings' },
  { id: 'applications', label: '5. Applications and acceptance' },
  { id: 'tenancy', label: '6. Tenancy documents, rent and bond' },
  { id: 'fees', label: '7. Fees' },
  { id: 'obligations', label: '8. Your obligations' },
  { id: 'problems', label: '9. If something goes wrong' },
  { id: 'suspension', label: '10. Suspension and termination' },
  { id: 'liability', label: '11. Liability' },
  { id: 'indemnity', label: '12. Indemnity' },
  { id: 'privacy', label: '13. Privacy' },
  { id: 'changes', label: '14. Changes to this agreement' },
  { id: 'law', label: '15. Governing law' },
  { id: 'contact', label: '16. Contact' },
]

const PARTY = formatContractingPartyName()

export function LandlordServiceAgreementContent() {
  return (
    <>
      <LegalH2 id="about">1. About this agreement</LegalH2>
      <LegalP>
        This Landlord Service Agreement (&quot;Agreement&quot;) is between {LEGAL_ENTITY_NAME} (ACN {LEGAL_ENTITY_ACN},
        ABN {formatAustralianAbn(LEGAL_ENTITY_ABN)}) trading as Quni Living (&quot;Quni Living&quot;, &quot;we&quot;,
        &quot;us&quot;, &quot;our&quot;) and you, the landlord or property owner who creates a landlord account on the
        Quni Living platform (&quot;you&quot;, &quot;your&quot;).
      </LegalP>
      <LegalP>
        It applies to Quni Listing, our self-service product. It governs your use of the platform. It is not a tenancy
        agreement, and it does not create a tenancy between you and us.
      </LegalP>
      <LegalP>
        By creating a landlord account on Quni Listing you agree to this Agreement, our{' '}
        <Link to="/terms" className="font-medium text-[var(--quni-coral)] underline hover:opacity-90">
          Terms of Service
        </Link>{' '}
        and our{' '}
        <Link to="/privacy" className="font-medium text-[var(--quni-coral)] underline hover:opacity-90">
          Privacy Policy
        </Link>
        .
      </LegalP>

      <LegalH2 id="role">2. Our role</LegalH2>
      <LegalH3 id="role-platform">2.1 We are a technology platform, not an agent</LegalH3>
      <LegalP>
        On Quni Listing, Quni Living is a technology platform. We are not a real estate agent and we do not provide
        agency, letting or property management services. We do not act on your behalf. We do not conduct a letting for
        you, and we are not a party to any tenancy or occupancy agreement you enter into.
      </LegalP>
      <LegalP>
        You are the landlord and the principal. You set the rent, you decide who to accept, you are the named lessor on
        the tenancy agreement, and you remain responsible for complying with the residential tenancy laws that apply
        where your property is located.
      </LegalP>
      <LegalH3 id="role-provide">2.2 What we provide</LegalH3>
      <LegalUl
        items={[
          'A marketplace where you can advertise a room or property to verified student and renter accounts',
          'Identity verification of applicants before you accept them',
          'Generation of a tenancy or occupancy agreement appropriate to your state, and electronic signing',
          'Messaging between you and applicants, with your email and phone number masked until you accept',
          'Tools to help you draft and present your listing',
        ]}
      />
      <LegalH3 id="role-not">2.3 What we do not provide</LegalH3>
      <LegalUl
        items={[
          'We do not collect, hold, receive or direct rent',
          'We do not hold or lodge bond money',
          'We do not negotiate rent or tenancy terms on your behalf',
          'We do not conduct inspections, hold keys, or host viewings for you',
          'We do not manage the tenancy, chase arrears, or pursue damage claims',
          'We do not provide legal, financial or tax advice',
          'We do not guarantee that your listing will receive enquiries, applications or bookings, or that any tenant will pay rent or perform their obligations',
        ]}
      />
      <LegalH3 id="role-guidance">2.4 Rent guidance is not an appraisal</LegalH3>
      <LegalP>
        Where the platform displays comparable rents or suggests a weekly rate, that is general information to help you
        make your own decision. It is not a rental appraisal, a valuation, or a recommendation. You set your own rent.
      </LegalP>

      <LegalH2 id="account">3. Your account</LegalH2>
      <LegalH3 id="account-eligibility">3.1 Eligibility</LegalH3>
      <LegalP>
        To hold a landlord account you must be at least 18, be legally entitled to let the property or room you list,
        and provide accurate information about yourself and the property. If you are letting a property you rent rather
        than own, you are responsible for obtaining and holding any consent your lease or your lessor requires.
      </LegalP>
      <LegalH3 id="account-id">3.2 Identity verification</LegalH3>
      <LegalP>
        You must complete identity verification through Stripe before you can accept an applicant. You can create a
        listing and receive applications before that step. Identity verification confirms who you are to renters using
        the platform. It is a verification step only, and it does not create a rent-payment relationship between us.
      </LegalP>
      <LegalH3 id="account-card">3.3 Payment method for platform fees</LegalH3>
      <LegalP>
        You must keep a valid payment card on file to pay the acceptance fee described in clause 7. This is the only
        payment connection required to use Quni Listing. You do not need to connect a bank account to us in order to
        receive rent, because rent is not paid through us.
      </LegalP>
      <LegalH3 id="account-insurance">3.4 Insurance</LegalH3>
      <LegalP>
        We point you to landlord insurance during onboarding. Whether you hold insurance, and on what terms, is your
        decision. We strongly recommend cover for loss of rental income, tenant damage, and public liability. Quni
        Living is not responsible for any loss that would have been covered by landlord insurance.
      </LegalP>

      <LegalH2 id="listings">4. Your listings</LegalH2>
      <LegalH3 id="listings-requirements">4.1 Requirements</LegalH3>
      <LegalP>
        Each listing must describe a real room or property that is available and that you are entitled to let, state the
        correct weekly rent, bond and any additional charges, use photographs of the actual property, and comply with
        anti-discrimination and advertising law.
      </LegalP>
      <LegalH3 id="listings-accuracy">4.2 Accuracy</LegalH3>
      <LegalP>
        You are solely responsible for the accuracy of your listings. You must update a listing promptly when anything
        changes, including when the room is no longer available.
      </LegalP>
      <LegalH3 id="listings-removal">4.3 Removal</LegalH3>
      <LegalP>
        We may remove or suspend a listing that we reasonably believe is inaccurate, misleading, unlawful, duplicated, or
        not genuinely available.
      </LegalP>

      <LegalH2 id="applications">5. Applications and acceptance</LegalH2>
      <LegalH3 id="applications-decide">5.1 You decide</LegalH3>
      <LegalP>
        Applicants apply through the platform. You review each application in full, including the applicant&apos;s
        verification status, before you decide. You may accept or decline any applicant, and declining costs you
        nothing. We do not accept, screen out, or rank applicants on your behalf, and we do not decide who lives in your
        property.
      </LegalP>
      <LegalH3 id="applications-contact">5.2 Contact details</LegalH3>
      <LegalP>
        An applicant&apos;s contact details, and yours, remain masked until you accept. After acceptance, both parties
        receive each other&apos;s details so that you can deal with each other directly.
      </LegalP>
      <LegalH3 id="applications-discrimination">5.3 Non-discrimination</LegalH3>
      <LegalP>Your acceptance decisions must comply with anti-discrimination law. That responsibility is yours.</LegalP>

      <LegalH2 id="tenancy">6. Tenancy documents, rent and bond</LegalH2>
      <LegalH3 id="tenancy-agreement">6.1 The tenancy agreement</LegalH3>
      <LegalP>
        When you accept an applicant, the platform generates a tenancy or occupancy agreement appropriate to the
        property&apos;s state and arrangement, together with our platform addendum, and provides it for electronic
        signature. For New South Wales and Queensland this includes the state-prescribed form where the listing type
        requires it.
      </LegalP>
      <LegalP>
        You are the lessor and a party to that agreement. We are not. The document is a tool for you to use. You are
        responsible for reading it, for satisfying yourself that it is appropriate to your circumstances, and for
        complying with it. It is not legal advice. If you are unsure whether the document suits your arrangement, obtain
        your own advice before signing.
      </LegalP>
      <LegalP>
        Watermarked sample agreements are available after you create an account. Sign in and open Sample agreements from
        your dashboard. Those samples are for layout and wording review only. They are not for signing.
      </LegalP>
      <LegalH3 id="tenancy-rent">6.2 Rent</LegalH3>
      <LegalP>
        Rent is paid by your tenant directly to you. It does not pass through Quni Living. We do not receive it, hold
        it, deduct from it, or direct it, and we do not operate a trust account. Setting the rent, collecting it,
        issuing receipts and keeping your own records are your responsibility.
      </LegalP>
      <LegalH3 id="tenancy-bond">6.3 Bond</LegalH3>
      <LegalP>
        Where the law that applies to your arrangement requires a bond to be lodged with a state or territory bond
        authority, you are responsible for lodging it within the time that law requires, and for not holding that money
        yourself. In New South Wales, bond for a hosted room (a boarder or lodger arrangement) may be held by the
        landlord. In Queensland, if a bond is taken it must still be lodged with the Residential Tenancies Authority.
        You should satisfy yourself which rules apply to you.
      </LegalP>
      <LegalP>We never hold, receive or lodge bond money in any case.</LegalP>
      <LegalP>
        Students may elect to use a third-party bond guarantee product in lieu of a cash bond, subject to your
        acceptance. Those products are provided by independent third parties and subject to their own terms. Quni Living
        does not guarantee or take responsibility for them.
      </LegalP>

      <LegalH2 id="fees">7. Fees</LegalH2>
      <LegalH3 id="fees-what">7.1 What you pay</LegalH3>
      <LegalUl
        items={[
          'Listing is free. There is no fee to create an account, publish a listing, receive applications, or message applicants.',
          'You pay $99 once (including GST), when you accept an applicant through the platform. That is the only Listing fee.',
          'There is no commission on rent, no subscription, no monthly fee and no letting fee.',
          'If you never accept anyone on the platform, you never pay anything.',
        ]}
      />
      <LegalH3 id="fees-found">7.2 Tenants you found yourself</LegalH3>
      <LegalP>
        If you found a tenant elsewhere and bring them through the platform to be verified and to sign the agreement,
        the $99 applies on acceptance in the same way. The fee is for the acceptance and the documents, not for
        introducing the tenant.
      </LegalP>
      <LegalH3 id="fees-how">7.3 How it is charged</LegalH3>
      <LegalP>
        The fee is $99 including GST, charged to the card you hold on file at the time you accept. We issue a tax
        invoice.
      </LegalP>
      <LegalH3 id="fees-refunds">7.4 Refunds</LegalH3>
      <LegalP>
        Refunds are dealt with in our{' '}
        <Link to="/refunds" className="font-medium text-[var(--quni-coral)] underline hover:opacity-90">
          Refund Policy
        </Link>
        , which forms part of this Agreement. Nothing in this clause limits your rights under the Australian Consumer
        Law.
      </LegalP>
      <LegalH3 id="fees-changes">7.5 Changes to fees</LegalH3>
      <LegalP>
        We may change the Listing acceptance fee on reasonable notice. Any change applies only to acceptances occurring
        after the notice period ends. We will not introduce a commission on rent for Quni Listing.
      </LegalP>

      <LegalH2 id="obligations">8. Your obligations</LegalH2>
      <LegalP>
        You must comply with the residential tenancy laws, health and safety requirements, and any other law that
        applies to letting your property. You must provide and maintain the property in the condition those laws
        require, attend to repairs and maintenance, and treat your tenants lawfully and fairly. You must keep your own
        tenancy records. If you list a property that you rent, you must hold whatever consent your lease requires.
      </LegalP>

      <LegalH2 id="problems">9. If something goes wrong with your tenancy</LegalH2>
      <LegalP>
        If a tenant stops paying, damages the property, or breaches the agreement, that is a matter between you and your
        tenant. We are not your agent. We do not chase rent, we do not lodge or run claims, we do not mediate between
        you and your tenant, and we do not guarantee rent, bond or the condition of your property.
      </LegalP>
      <LegalP>
        What you have from us is the verification we performed, the agreement both parties signed, and your messages and
        documents on the platform. Beyond that, your avenues are the bond authority or tribunal in your state, and any
        insurance you hold.
      </LegalP>

      <LegalH2 id="suspension">10. Suspension and termination</LegalH2>
      <LegalP>
        You may close your account at any time by contacting hello@quni.com.au. We may suspend or terminate your account
        if you breach this Agreement, if you provide false information, if you fail identity verification, or if we
        reasonably believe your use of the platform is unlawful or harmful to other users.
      </LegalP>
      <LegalP>
        On termination your listings are removed from the platform. Termination does not affect any tenancy agreement
        already on foot. Those agreements are between you and your tenant and continue on their own terms. Fees already
        incurred remain payable.
      </LegalP>

      <LegalH2 id="liability">11. Liability</LegalH2>
      <LegalP>
        Our services come with guarantees that cannot be excluded under the Australian Consumer Law. Nothing in this
        Agreement excludes, restricts or modifies those guarantees. Where we are permitted to limit our liability, our
        total liability to you arising out of or in connection with this Agreement is limited to the platform fees you
        paid in the three months preceding the relevant claim.
      </LegalP>
      <LegalP>
        To the extent permitted by law, we are not liable for loss of rent, loss of profits, property damage, the
        conduct of any tenant or applicant, the accuracy of information provided by an applicant beyond the verification
        we state that we perform, or your compliance with tenancy law.
      </LegalP>

      <LegalH2 id="indemnity">12. Indemnity</LegalH2>
      <LegalP>
        You indemnify us against loss, damage, cost or claim arising from your listings, your tenancy arrangements, your
        breach of this Agreement, or your breach of any law that applies to letting your property, except to the extent
        the loss was caused by our own negligence or breach.
      </LegalP>

      <LegalH2 id="privacy">13. Privacy</LegalH2>
      <LegalP>
        We handle personal information in accordance with our Privacy Policy and the Privacy Act 1988 (Cth). You must
        handle applicants&apos; and tenants&apos; personal information lawfully, and use it only for purposes connected
        with the tenancy.
      </LegalP>

      <LegalH2 id="changes">14. Changes to this agreement</LegalH2>
      <LegalP>
        We may update this Agreement from time to time. We will give you notice of material changes, and your continued
        use of the platform after the notice period means you accept the updated version. The version in force is the
        one published on our website at the time you accept an applicant.
      </LegalP>

      <LegalH2 id="law">15. Governing law</LegalH2>
      <LegalP>
        This Agreement is governed by the laws of New South Wales, and you and we submit to the non-exclusive
        jurisdiction of the courts of that state. This clause does not affect the residential tenancy laws that apply to
        your property, which are determined by the state or territory in which the property is located and cannot be
        varied by this Agreement.
      </LegalP>

      <LegalH2 id="contact">16. Contact</LegalH2>
      <LegalP>
        {PARTY} · ABN {formatAustralianAbn(LEGAL_ENTITY_ABN)} · ACN {LEGAL_ENTITY_ACN}
      </LegalP>
      <LegalP>Email: hello@quni.com.au</LegalP>
      <LegalP>Website: quni.com.au</LegalP>
    </>
  )
}
