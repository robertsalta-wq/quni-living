import { LegalH2, LegalH3, LegalP, LegalPageShell, LegalUl, type LegalTocItem } from '../components/legal/LegalPageShell'
import Seo from '../components/Seo'

const TOC: LegalTocItem[] = [
  { id: 'about', label: '1. About These Terms' },
  { id: 'eligibility', label: '2. Eligibility and Accounts' },
  { id: 'rules', label: '3. Platform Rules' },
  { id: 'landlord-obligations', label: '4. Landlord Obligations' },
  { id: 'student-obligations', label: '5. Student Obligations' },
  { id: 'payments', label: '6. Payments' },
  { id: 'role', label: '7. Role and Limitations' },
  { id: 'ip', label: '8. Intellectual Property' },
  { id: 'privacy', label: '9. Privacy' },
  { id: 'termination', label: '10. Termination' },
  { id: 'disputes', label: '11. Dispute Resolution' },
  { id: 'contact', label: '12. Contact Us' },
]

export default function Terms() {
  return (
    <>
      <Seo
        title="Terms of Service"
        description="Terms of Service for the Quni Living student accommodation platform — accounts, listings, bookings, and acceptable use."
        canonicalPath="/terms"
      />
    <LegalPageShell
      bandTitle="Terms of Service"
      pageTitle="Platform Terms of Service"
      toc={TOC}
    >
      <LegalH2 id="about">1. About These Terms</LegalH2>
      <LegalP>
        These Terms of Service (&quot;Terms&quot;) govern your use of the Quni Living platform, website, and services
        (&quot;Platform&quot;), operated by Quni Living Pty Ltd (&quot;Quni Living&quot;, &quot;we&quot;, &quot;us&quot;,
        &quot;our&quot;). By creating an account or using our Platform, you agree to be bound by these Terms.
      </LegalP>
      <LegalP>
        Please read these Terms carefully. If you do not agree with any part of these Terms, you must not use our
        Platform.
      </LegalP>
      <LegalH3 id="about-who">1.1 Who We Are</LegalH3>
      <LegalP>
        Quni Living is a technology platform that connects students seeking accommodation with landlords offering rental
        properties in Australia. We are a marketplace intermediary — we do not own, manage, or control any properties
        listed on our Platform, and we are not a party to any tenancy agreement entered into between students and
        landlords.
      </LegalP>
      <LegalH3 id="about-changes">1.2 Changes to These Terms</LegalH3>
      <LegalP>
        We may update these Terms from time to time. We will notify you of material changes by email or via a notice on
        the Platform. Your continued use of the Platform after changes take effect constitutes your acceptance of the
        updated Terms.
      </LegalP>

      <LegalH2 id="eligibility">2. Eligibility and Accounts</LegalH2>
      <LegalH3 id="eligibility-age">2.1 Eligibility</LegalH3>
      <LegalP>To use our Platform you must:</LegalP>
      <LegalUl
        items={[
          'Be at least 18 years of age',
          'Be resident in Australia or an international student enrolled at an Australian university',
          'Have the legal capacity to enter into binding contracts',
          'Not have been previously suspended or removed from our Platform',
        ]}
      />
      <LegalH3 id="eligibility-registration">2.2 Account Registration</LegalH3>
      <LegalP>You must create an account to access most features of the Platform. You agree to:</LegalP>
      <LegalUl
        items={[
          'Provide accurate, current, and complete information during registration',
          'Maintain and update your information to keep it accurate',
          'Keep your password secure and not share it with others',
          'Notify us immediately of any unauthorised use of your account',
        ]}
      />
      <LegalP>You are responsible for all activity that occurs under your account.</LegalP>
      <LegalH3 id="eligibility-roles">2.3 User Roles</LegalH3>
      <LegalP>When registering, you will be assigned one of the following roles:</LegalP>
      <LegalUl
        items={[
          'Student: a user seeking rental accommodation through the Platform',
          'Landlord: a user listing rental properties on the Platform',
          'Admin: Quni Living staff with platform management access',
        ]}
      />
      <LegalP>
        Some features are role-specific. You must not misrepresent your role or use another user&apos;s account.
      </LegalP>

      <LegalH2 id="rules">3. Platform Rules</LegalH2>
      <LegalH3 id="rules-use">3.1 Acceptable Use</LegalH3>
      <LegalP>
        You agree to use the Platform only for lawful purposes and in accordance with these Terms. You must not:
      </LegalP>
      <LegalUl
        items={[
          'Post false, misleading, or fraudulent listings or information',
          'Harass, threaten, or discriminate against other users',
          'Use the Platform to conduct any unlawful activity',
          'Attempt to scrape, copy, or reproduce Platform content without permission',
          'Interfere with or disrupt the Platform or its infrastructure',
          'Circumvent any security or access controls on the Platform',
          'Use the Platform to advertise or promote services outside of its intended purpose',
        ]}
      />
      <LegalH3 id="rules-content">3.2 Prohibited Content</LegalH3>
      <LegalP>You must not post, upload, or share content that:</LegalP>
      <LegalUl
        items={[
          'Is false, defamatory, discriminatory, or misleading',
          'Infringes any third-party intellectual property rights',
          'Contains malware, viruses, or harmful code',
          'Violates any applicable Australian law or regulation',
        ]}
      />

      <LegalH2 id="landlord-obligations">4. Landlord Obligations</LegalH2>
      <LegalH3 id="landlord-listings">4.1 Property Listings</LegalH3>
      <LegalP>Landlords are responsible for ensuring all property listings are:</LegalP>
      <LegalUl
        items={[
          'Accurate and not misleading in any respect',
          'Compliant with applicable state and territory tenancy laws',
          'Accompanied by accurate photos, descriptions, and pricing',
          'Updated promptly when information changes or the property is no longer available',
        ]}
      />
      <LegalH3 id="landlord-compliance">4.2 Legal Compliance</LegalH3>
      <LegalP>
        Landlords are solely responsible for ensuring their properties and tenancy practices comply with all applicable
        laws, including:
      </LegalP>
      <LegalUl
        items={[
          'The Residential Tenancies Act applicable in their state or territory',
          'Australian Consumer Law requirements around fair and accurate representations',
          'All minimum property standards required under applicable tenancy legislation',
          'Bond lodgement requirements in the relevant state or territory',
        ]}
      />
      <LegalH3 id="landlord-tenancy">4.3 Tenancy Agreements</LegalH3>
      <LegalP>
        Landlords are responsible for preparing and providing tenancy agreements that comply with applicable state and
        territory legislation. Quni Living does not provide tenancy agreement templates and is not responsible for the
        terms of any tenancy agreement between a landlord and student.
      </LegalP>
      <LegalH3 id="landlord-bond">4.4 Bond Lodgement</LegalH3>
      <LegalP>
        Where a bond is payable, landlords are responsible for lodging the bond with the relevant state or territory bond
        authority (e.g. NSW Fair Trading, RTBA in Victoria) in accordance with applicable laws. Quni Living does not
        hold rental bonds on behalf of landlords or students.
      </LegalP>

      <LegalH2 id="student-obligations">5. Student Obligations</LegalH2>
      <LegalH3 id="student-info">5.1 Accurate Information</LegalH3>
      <LegalP>
        Students must provide accurate information in their profiles and booking requests, including details of their
        university enrolment, identity, and rental history where requested.
      </LegalP>
      <LegalH3 id="student-tenancy">5.2 Tenancy Obligations</LegalH3>
      <LegalP>
        Once a booking is confirmed, students are bound by the terms of their tenancy agreement with the landlord.
        Students are responsible for:
      </LegalP>
      <LegalUl
        items={[
          'Paying rent on time as agreed',
          'Maintaining the property in good condition',
          'Complying with all terms of their tenancy agreement',
          'Complying with applicable state and territory tenancy legislation',
        ]}
      />

      <LegalH2 id="payments">6. Payments</LegalH2>
      <LegalH3 id="payments-fees">6.1 Platform Fees</LegalH3>
      <LegalP>
        Quni Living charges platform fees in connection with bookings made through the Platform. Our current fee
        structure is displayed at the time of booking. Fees are subject to change with notice.
      </LegalP>
      <LegalH3 id="payments-stripe">6.2 Payment Processing</LegalH3>
      <LegalP>
        Payments are processed through Stripe, a third-party payment processor. By making a payment through the Platform,
        you also agree to Stripe&apos;s terms of service. Quni Living is not responsible for errors or issues caused by
        Stripe&apos;s payment infrastructure.
      </LegalP>
      <LegalH3 id="payments-bond">6.3 Bond Guarantee Products</LegalH3>
      <LegalP>
        Quni Living may facilitate access to third-party bond guarantee products (such as ZeroBonds or similar services)
        as an alternative to traditional cash bonds. These products are provided by independent third parties and are
        subject to their own terms and conditions. Quni Living does not guarantee, endorse, or take responsibility for
        these products.
      </LegalP>
      <LegalH3 id="payments-refunds">6.4 Refunds</LegalH3>
      <LegalP>
        Refund policies for booking deposits and platform fees are set out in our Refund Policy, available on our
        website. Recurring rent payments are governed by the terms of the tenancy agreement between the landlord and
        student.
      </LegalP>

      <LegalH2 id="role">7. Quni Living&apos;s Role and Limitations</LegalH2>
      <LegalH3 id="role-marketplace">7.1 Marketplace Only</LegalH3>
      <LegalP>
        Quni Living is a technology marketplace. We do not own or manage any properties, and we are not a party to any
        tenancy agreement. We do not act as a real estate agent, property manager, or landlord&apos;s agent in connection
        with any tenancy facilitated through the Platform.
      </LegalP>
      <LegalH3 id="role-warranty">7.2 No Warranty on Listings</LegalH3>
      <LegalP>
        We do not verify the accuracy of all property listings on the Platform, although we may take steps to detect and
        remove fraudulent listings. You should independently verify any property before entering into a tenancy agreement.
      </LegalP>
      <LegalH3 id="role-liability">7.3 Limitation of Liability</LegalH3>
      <LegalP>
        To the maximum extent permitted by Australian law, Quni Living&apos;s liability to you for any loss or damage
        arising from your use of the Platform is limited to the platform fees paid by you in the three months preceding the
        relevant claim. We are not liable for any indirect, consequential, or special loss or damage.
      </LegalP>
      <LegalP>
        Nothing in these Terms excludes or limits any guarantee, warranty, or right that cannot be excluded or limited
        under the Australian Consumer Law.
      </LegalP>

      <LegalH2 id="ip">8. Intellectual Property</LegalH2>
      <LegalP>
        All content on the Platform, including but not limited to text, graphics, logos, and software, is owned by or
        licensed to Quni Living. You may not reproduce, distribute, or create derivative works from any Platform content
        without our prior written consent.
      </LegalP>
      <LegalP>
        By posting content on the Platform (such as property photos or profile information), you grant Quni Living a
        non-exclusive, royalty-free licence to use that content for the purpose of operating and promoting the Platform.
      </LegalP>

      <LegalH2 id="privacy">9. Privacy</LegalH2>
      <LegalP>
        Your privacy is important to us. Our collection and use of your personal information is governed by our Privacy
        Policy, which is incorporated into these Terms by reference. By using the Platform, you consent to the collection
        and use of your information as described in our Privacy Policy.
      </LegalP>

      <LegalH2 id="termination">10. Termination</LegalH2>
      <LegalP>
        We may suspend or terminate your account at any time if we reasonably believe you have breached these Terms or
        engaged in fraudulent or unlawful activity. You may close your account at any time by contacting us at
        hello@quni.com.au.
      </LegalP>
      <LegalP>
        Termination of your account does not affect any obligations already incurred, including any tenancy agreement you
        have entered into through the Platform.
      </LegalP>

      <LegalH2 id="disputes">11. Dispute Resolution</LegalH2>
      <LegalP>
        If you have a dispute with another user of the Platform, we encourage you to attempt to resolve it directly. Quni
        Living may, at its discretion, provide assistance in facilitating resolution but is not obligated to do so and is
        not responsible for resolving disputes between users.
      </LegalP>
      <LegalP>
        For disputes with Quni Living, please contact us first at hello@quni.com.au. These Terms are governed by the laws
        of New South Wales, Australia.
      </LegalP>

      <LegalH2 id="contact">12. Contact Us</LegalH2>
      <LegalP>Quni Living Pty Ltd</LegalP>
      <LegalP>Email: hello@quni.com.au</LegalP>
      <LegalP>Website: quni.com.au</LegalP>
    </LegalPageShell>
    </>
  )
}
