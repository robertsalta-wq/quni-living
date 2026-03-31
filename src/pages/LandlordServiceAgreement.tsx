import { LegalH2, LegalH3, LegalP, LegalPageShell, LegalUl, type LegalTocItem } from '../components/legal/LegalPageShell'
import Seo from '../components/Seo'

const TOC: LegalTocItem[] = [
  { id: 'intro', label: '1. Introduction and Parties' },
  { id: 'role', label: "2. Quni Living's Role" },
  { id: 'onboarding', label: '3. Eligibility and Onboarding' },
  { id: 'listings', label: '4. Property Listings' },
  { id: 'bookings', label: '5. Bookings and Tenancies' },
  { id: 'fees', label: '6. Platform Fees' },
  { id: 'obligations', label: '7. Your Obligations' },
  { id: 'suspension', label: '8. Suspension and Termination' },
  { id: 'indemnity', label: '9. Indemnity' },
  { id: 'liability', label: '10. Limitation of Liability' },
  { id: 'disputes', label: '11. Dispute Resolution' },
  { id: 'acceptance', label: '12. Acceptance' },
  { id: 'contact', label: '13. Contact Us' },
]

export default function LandlordServiceAgreement() {
  return (
    <>
      <Seo
        title="Landlord Service Agreement"
        description="Agreement for landlords listing student accommodation on Quni Living — listings, bookings, fees, and obligations."
        canonicalPath="/landlord-service-agreement"
      />
    <LegalPageShell
      bandTitle="Landlord Service Agreement"
      pageTitle="Landlord Service Agreement"
      toc={TOC}
    >
      <LegalH2 id="intro">1. Introduction and Parties</LegalH2>
      <LegalP>
        This Landlord Service Agreement (&quot;Agreement&quot;) is entered into between Quni Living Pty Ltd (&quot;Quni
        Living&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) and you, the landlord (&quot;Landlord&quot;,
        &quot;you&quot;, &quot;your&quot;) upon your acceptance of these terms during the Quni Living onboarding process.
      </LegalP>
      <LegalP>
        This Agreement should be read together with our Platform Terms of Service and Privacy Policy, both of which are
        incorporated by reference. In the event of any inconsistency between this Agreement and the Platform Terms of
        Service on matters specific to landlords, this Agreement prevails.
      </LegalP>

      <LegalH2 id="role">2. Quni Living&apos;s Role</LegalH2>
      <LegalH3 id="role-marketplace">2.1 Marketplace Platform</LegalH3>
      <LegalP>
        Quni Living operates a technology marketplace that connects landlords with students seeking accommodation. Quni
        Living is not a real estate agent, property manager, or landlord&apos;s agent. We do not manage properties, hold
        trust accounts, or act on your behalf in connection with any tenancy.
      </LegalP>
      <LegalH3 id="role-payments">2.2 Payment Facilitation</LegalH3>
      <LegalP>
        Quni Living facilitates the collection of platform fees and, where applicable, rent payments through Stripe. In
        facilitating payments, Quni Living acts as a technology intermediary — the tenancy contract remains between you and
        the student.
      </LegalP>
      <LegalH3 id="role-bookings">2.3 No Guarantee of Bookings</LegalH3>
      <LegalP>
        Quni Living does not guarantee that your listings will receive any bookings or enquiries. We provide access to our
        Platform and student user base, but we make no representations about the volume or quality of leads your listing
        will generate.
      </LegalP>

      <LegalH2 id="onboarding">3. Landlord Eligibility and Onboarding</LegalH2>
      <LegalH3 id="onboarding-eligibility">3.1 Eligibility Requirements</LegalH3>
      <LegalP>To list properties on the Quni Living Platform, you must:</LegalP>
      <LegalUl
        items={[
          'Be an individual aged 18 or over, or a registered Australian company or trust',
          'Hold legal title to, or be duly authorised to lease, any property you list',
          'Complete the Quni Living onboarding process, including identity verification via Stripe',
          'Connect an Australian bank account via Stripe Connect to receive payments',
          'Comply with all applicable laws in the state or territory where your property is located',
        ]}
      />
      <LegalH3 id="onboarding-stripe">3.2 Stripe Connect</LegalH3>
      <LegalP>
        To receive payments through the Platform, you must create and maintain a Stripe Express account. By connecting your
        bank account, you also agree to Stripe&apos;s Connected Account Agreement. Quni Living is not responsible for any
        issues arising from your Stripe account, including account restrictions, verification delays, or payment failures.
      </LegalP>
      <LegalP>
        Quni Living will not process payments to your account until Stripe confirms that your account has charges_enabled
        status. Quni Living reserves the right to suspend your listings if your Stripe account loses this status.
      </LegalP>
      <LegalH3 id="onboarding-insurance">3.3 Landlord Insurance</LegalH3>
      <LegalP>
        While not mandatory to list on the Platform, Quni Living strongly recommends that all landlords hold a current
        landlord insurance policy covering at minimum:
      </LegalP>
      <LegalUl items={['Loss of rental income', 'Tenant damage to property', 'Public liability']} />
      <LegalP>Quni Living is not responsible for any loss you suffer that would have been covered by landlord insurance.</LegalP>

      <LegalH2 id="listings">4. Property Listings</LegalH2>
      <LegalH3 id="listings-requirements">4.1 Listing Requirements</LegalH3>
      <LegalP>All property listings on the Platform must:</LegalP>
      <LegalUl
        items={[
          'Accurately describe the property including size, condition, and inclusions',
          'Include accurate and current photographs of the property',
          'State the correct weekly rent, bond amount, and any additional charges',
          "Specify the property's proximity to relevant universities",
          'Comply with applicable advertising laws, including prohibitions on rent bidding',
        ]}
      />
      <LegalH3 id="listings-accuracy">4.2 Listing Accuracy</LegalH3>
      <LegalP>
        You are solely responsible for the accuracy of your listings. You must update listings promptly when information
        changes, including when a property is no longer available. Quni Living may remove listings that we reasonably believe
        are inaccurate, misleading, or in breach of these terms.
      </LegalP>
      <LegalH3 id="listings-prohibited">4.3 Prohibited Listings</LegalH3>
      <LegalP>You must not list properties that:</LegalP>
      <LegalUl
        items={[
          'You do not have the right to lease',
          'Do not meet minimum housing standards under applicable tenancy legislation',
          'Are subject to any order or notice that would prevent occupation',
          'Have been listed on the Platform fraudulently or deceptively',
        ]}
      />

      <LegalH2 id="bookings">5. Bookings and Tenancies</LegalH2>
      <LegalH3 id="bookings-requests">5.1 Booking Requests</LegalH3>
      <LegalP>
        When a student submits a booking request through the Platform, you will be notified and may accept or decline the
        request. Quni Living does not require you to accept any booking request.
      </LegalP>
      <LegalH3 id="bookings-tenancy">5.2 Tenancy Agreements</LegalH3>
      <LegalP>
        Upon accepting a booking, you are responsible for preparing a written tenancy agreement that complies with the
        Residential Tenancies Act applicable in your state or territory. Quni Living does not provide tenancy agreement
        templates. You may wish to use the standard agreement published by your state&apos;s fair trading or consumer affairs
        authority.
      </LegalP>
      <LegalP>The tenancy agreement is a direct contract between you and the student. Quni Living is not a party to that agreement.</LegalP>
      <LegalH3 id="bookings-bond">5.3 Bond</LegalH3>
      <LegalP>
        Where a bond is payable, you are responsible for lodging the bond with the relevant state or territory bond
        authority in accordance with applicable legislation. You must not hold bond money yourself. Students may elect to use
        a third-party bond guarantee product (such as ZeroBonds) in lieu of a cash bond, subject to your acceptance.
      </LegalP>
      <LegalP>
        Bond guarantee products are provided by independent third parties and subject to their own terms. Quni Living does
        not guarantee or take responsibility for any bond guarantee product.
      </LegalP>
      <LegalH3 id="bookings-advance">5.4 Rent Advance</LegalH3>
      <LegalP>
        In accordance with applicable tenancy laws, you may request up to two weeks rent in advance from a student. You must
        not request more than the maximum permitted under the law of your state or territory.
      </LegalP>

      <LegalH2 id="fees">6. Platform Fees</LegalH2>
      <LegalH3 id="fees-structure">6.1 Fee Structure</LegalH3>
      <LegalP>
        Quni Living charges a landlord service fee as a percentage of each rent payment collected through the Platform. The
        current fee rate is displayed during onboarding and in your landlord dashboard. Fees are subject to change with 30 days
        written notice.
      </LegalP>
      <LegalH3 id="fees-deduction">6.2 Fee Deduction</LegalH3>
      <LegalP>
        Platform fees are deducted automatically from each payment before the remainder is transferred to your connected
        Stripe account. You will receive a payment summary for each transaction showing the gross amount, fee deducted, and
        net amount paid to you.
      </LegalP>
      <LegalH3 id="fees-gst">6.3 GST</LegalH3>
      <LegalP>
        Platform fees are inclusive of GST where applicable. If you are registered for GST, Quni Living will issue tax
        invoices for platform fees upon request. Rent collected through the Platform on your behalf is a pass-through and is
        not subject to GST by Quni Living.
      </LegalP>
      <LegalH3 id="fees-payout">6.4 Payout Schedule</LegalH3>
      <LegalP>
        Payouts to your connected bank account are processed weekly, subject to Stripe&apos;s standard processing times.
        Quni Living is not responsible for delays caused by Stripe or your financial institution.
      </LegalP>

      <LegalH2 id="obligations">7. Your Obligations</LegalH2>
      <LegalH3 id="obligations-legal">7.1 Legal Compliance</LegalH3>
      <LegalP>
        You are solely responsible for complying with all applicable laws and regulations in connection with your properties
        and tenancies, including:
      </LegalP>
      <LegalUl
        items={[
          'The Residential Tenancies Act in your state or territory',
          'Australian Consumer Law (including fair and accurate representations)',
          'Anti-discrimination laws',
          'All applicable planning, building, and safety regulations',
          'Your tax obligations including income tax and GST where applicable',
        ]}
      />
      <LegalH3 id="obligations-welfare">7.2 Student Welfare</LegalH3>
      <LegalP>
        You acknowledge that many students using the Platform may be international students or young people living away from
        home for the first time. You agree to treat all students fairly, respectfully, and without discrimination on the
        basis of race, nationality, gender, religion, or any other protected attribute.
      </LegalP>
      <LegalH3 id="obligations-maintenance">7.3 Maintenance and Habitability</LegalH3>
      <LegalP>
        You are responsible for maintaining your properties in a condition that meets all minimum standards required under
        applicable tenancy legislation, including prompt attention to urgent repairs.
      </LegalP>

      <LegalH2 id="suspension">8. Suspension and Termination</LegalH2>
      <LegalH3 id="suspension-rights">8.1 Quni Living&apos;s Rights</LegalH3>
      <LegalP>Quni Living may suspend or terminate your access to the Platform at any time if:</LegalP>
      <LegalUl
        items={[
          'You breach any term of this Agreement or the Platform Terms of Service',
          'We receive credible complaints about your conduct from students',
          'Your Stripe account loses charges_enabled status',
          'We reasonably believe you have engaged in fraudulent or deceptive conduct',
          'You fail to comply with applicable tenancy laws',
        ]}
      />
      <LegalH3 id="suspension-effect">8.2 Effect of Termination</LegalH3>
      <LegalP>
        Upon termination of your account, your listings will be removed from the Platform. Any bookings already confirmed will
        remain in effect and associated payments will continue to be processed until the tenancy ends or both parties agree
        otherwise.
      </LegalP>
      <LegalH3 id="suspension-yours">8.3 Your Right to Terminate</LegalH3>
      <LegalP>
        You may close your account at any time by contacting hello@quni.com.au. You remain liable for any platform fees
        accrued prior to termination and for your obligations under any existing tenancy agreements.
      </LegalP>

      <LegalH2 id="indemnity">9. Indemnity</LegalH2>
      <LegalP>
        You agree to indemnify and hold harmless Quni Living, its officers, employees, and agents from any claims, losses,
        damages, or expenses (including reasonable legal fees) arising from:
      </LegalP>
      <LegalUl
        items={[
          'Your breach of this Agreement or any applicable law',
          'Any tenancy you enter into through the Platform',
          'Any inaccurate or misleading content in your listings',
          'Any claim by a student arising from your conduct as a landlord',
        ]}
      />

      <LegalH2 id="liability">10. Limitation of Liability</LegalH2>
      <LegalP>
        To the maximum extent permitted by Australian law, Quni Living&apos;s liability to you under this Agreement is
        limited to the platform fees paid by you in the three months preceding the relevant claim. Quni Living is not liable
        for any loss of rent, tenant damage, or other losses you suffer in connection with any tenancy.
      </LegalP>
      <LegalP>
        Nothing in this Agreement excludes any guarantee, warranty, or right that cannot be excluded under the Australian
        Consumer Law.
      </LegalP>

      <LegalH2 id="disputes">11. Dispute Resolution</LegalH2>
      <LegalP>
        If you have a dispute with a student, we encourage you to attempt to resolve it directly or through the relevant
        state tenancy tribunal (e.g. NCAT in NSW, VCAT in Victoria). Quni Living may, at its discretion, provide information
        or assistance but is not responsible for resolving tenancy disputes.
      </LegalP>
      <LegalP>
        For disputes with Quni Living, please contact hello@quni.com.au in the first instance. This Agreement is governed by
        the laws of New South Wales, Australia.
      </LegalP>

      <LegalH2 id="acceptance">12. Acceptance</LegalH2>
      <LegalP>By completing the Quni Living landlord onboarding process and checking the acceptance box, you confirm that:</LegalP>
      <LegalUl
        items={[
          'You have read and understood this Agreement',
          'You agree to be bound by its terms',
          'You have the authority to enter into this Agreement on behalf of yourself or any entity you represent',
        ]}
      />

      <LegalH2 id="contact">13. Contact Us</LegalH2>
      <LegalP>Quni Living Pty Ltd</LegalP>
      <LegalP>Email: hello@quni.com.au</LegalP>
      <LegalP>Website: quni.com.au</LegalP>
    </LegalPageShell>
    </>
  )
}
