import { LegalH2, LegalH3, LegalP, LegalPageShell, LegalUl, type LegalTocItem } from '../components/legal/LegalPageShell'
import Seo from '../components/Seo'

const TOC: LegalTocItem[] = [
  { id: 'intro', label: '1. Introduction' },
  { id: 'collect', label: '2. Information We Collect' },
  { id: 'verification', label: '3. Identity and Student Verification' },
  { id: 'use', label: '4. How We Use Your Information' },
  { id: 'disclosure', label: '5. Disclosure' },
  { id: 'security', label: '6. Data Storage and Security' },
  { id: 'rights', label: '7. Your Rights' },
  { id: 'cookies', label: '8. Cookies' },
  { id: 'children', label: "9. Children's Privacy" },
  { id: 'changes', label: '10. Changes to This Policy' },
  { id: 'complaints', label: '11. Complaints' },
  { id: 'contact', label: '12. Contact Us' },
]

export default function Privacy() {
  return (
    <>
      <Seo
        title="Privacy Policy"
        description="How Quni Living collects, uses, and protects your personal information when you use our student accommodation platform."
        canonicalPath="/privacy"
      />
    <LegalPageShell bandTitle="Privacy Policy" pageTitle="Privacy Policy" toc={TOC}>
      <LegalH2 id="intro">1. Introduction</LegalH2>
      <LegalP>
        Quni Living Pty Ltd (&quot;Quni Living&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to
        protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal
        information when you use the Quni Living platform (&quot;Platform&quot;).
      </LegalP>
      <LegalP>
        This policy is compliant with the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs). By using our
        Platform, you consent to the practices described in this policy.
      </LegalP>

      <LegalH2 id="collect">2. Information We Collect</LegalH2>
      <LegalH3 id="collect-provide">2.1 Information You Provide</LegalH3>
      <LegalP>We collect personal information you provide when you:</LegalP>
      <LegalUl
        items={[
          'Create an account (name, email address, password)',
          'Complete your profile (university, course, phone number, profile photo, gender)',
          'List a property (property address, photos, pricing, landlord details, ABN)',
          'Make or receive a booking (move-in date, lease length, rental history)',
          'Contact us or submit a support request',
          'Complete identity verification through Stripe',
        ]}
      />
      <LegalH3 id="collect-auto">2.2 Information Collected Automatically</LegalH3>
      <LegalP>When you use our Platform, we may automatically collect:</LegalP>
      <LegalUl
        items={[
          'Device information (browser type, operating system, IP address)',
          'Usage data (pages visited, features used, time spent on the Platform)',
          'Cookie data (see our Cookie Policy)',
        ]}
      />
      <LegalH3 id="collect-third">2.3 Information from Third Parties</LegalH3>
      <LegalP>We may receive information about you from third parties including:</LegalP>
      <LegalUl
        items={[
          'Google (if you sign in using Google OAuth)',
          'Stripe (payment and identity verification information)',
          'ZeroBonds or other bond guarantee providers (bond application and approval status)',
        ]}
      />

      <LegalH2 id="verification">3. Identity and Student Verification</LegalH2>
      <LegalH3 id="verification-collect">3.1 What we collect</LegalH3>
      <LegalP>When a student chooses to verify their profile, we may collect:</LegalP>
      <LegalUl
        items={[
          'Their university email address',
          "A copy of their government-issued photo ID (passport or driver's licence)",
          'A copy of their university enrolment confirmation or Confirmation of Enrolment (CoE)',
        ]}
      />
      <LegalH3 id="verification-why">3.2 Why we collect it</LegalH3>
      <LegalP>
        This information is used solely to verify student identity and enrolment status, giving landlords confidence in
        applicants on the Platform. Verification is optional but improves the student&apos;s profile credibility.
      </LegalP>
      <LegalH3 id="verification-access">3.3 Who can access it</LegalH3>
      <LegalP>
        Uploaded documents are stored in a private, access-controlled storage environment. They are not visible to landlords
        or other users. Only authorised Quni administrators can access submitted documents for the purpose of verification
        review.
      </LegalP>
      <LegalH3 id="verification-storage">3.4 How it&apos;s stored</LegalH3>
      <LegalP>
        Documents are stored in encrypted private cloud storage. They are not publicly accessible and cannot be retrieved
        via a guessable URL.
      </LegalP>
      <LegalH3 id="verification-retention">3.5 How long we keep it</LegalH3>
      <LegalP>
        Verification documents are retained for the duration of the student&apos;s account. Upon account deletion, documents
        will be permanently deleted within 30 days.
      </LegalP>
      <LegalH3 id="verification-rights">3.6 Your rights</LegalH3>
      <LegalP>
        Students can request removal of their verification documents at any time by contacting us at hello@quni.com.au. This
        will reset their verification status on the Platform.
      </LegalP>
      <LegalH3 id="verification-future">3.7 Future verification methods</LegalH3>
      <LegalP>
        Quni may in future use third-party identity verification services (such as Stripe Identity) to automate document
        checking. Any such services will be subject to their own privacy policies, which will be disclosed at the time of
        verification.
      </LegalP>

      <LegalH2 id="use">4. How We Use Your Information</LegalH2>
      <LegalP>We use your personal information to:</LegalP>
      <LegalUl
        items={[
          'Create and manage your account',
          'Facilitate connections between students and landlords',
          'Process payments and manage platform fees',
          'Send transactional emails (booking confirmations, enquiry notifications)',
          'Verify your identity and prevent fraud',
          'Improve and develop our Platform',
          'Comply with our legal obligations',
          'Respond to your enquiries and support requests',
        ]}
      />
      <LegalP>
        We will not use your personal information for purposes incompatible with those listed above without your consent.
      </LegalP>

      <LegalH2 id="disclosure">5. Disclosure of Your Information</LegalH2>
      <LegalH3 id="disclosure-users">5.1 To Other Users</LegalH3>
      <LegalP>
        To facilitate bookings and enquiries, we share relevant profile information between students and landlords. For
        example, a landlord may see a student&apos;s profile when they submit a booking request.
      </LegalP>
      <LegalH3 id="disclosure-providers">5.2 To Service Providers</LegalH3>
      <LegalP>
        We share information with trusted third-party service providers who assist us in operating the Platform,
        including:
      </LegalP>
      <LegalUl
        items={[
          'Stripe (payment processing and identity verification)',
          'Supabase (database and authentication infrastructure)',
          'Vercel (website hosting)',
          'Resend (transactional email delivery)',
          'Cloudflare (spam protection)',
        ]}
      />
      <LegalP>
        These providers are contractually required to handle your information securely and only for the purposes we specify.
      </LegalP>
      <LegalH3 id="disclosure-legal">5.3 Legal Requirements</LegalH3>
      <LegalP>
        We may disclose your information where required by law, court order, or regulatory authority, or where we reasonably
        believe disclosure is necessary to protect the rights or safety of any person.
      </LegalP>
      <LegalH3 id="disclosure-business">5.4 Business Transfers</LegalH3>
      <LegalP>
        If Quni Living is involved in a merger, acquisition, or sale of assets, your personal information may be transferred
        as part of that transaction. We will notify you before your information is transferred and becomes subject to a
        different privacy policy.
      </LegalP>

      <LegalH2 id="security">6. Data Storage and Security</LegalH2>
      <LegalP>
        Your personal information is stored on secure servers in Australia and/or other jurisdictions where our service
        providers operate. We take reasonable technical and organisational measures to protect your information against
        unauthorised access, loss, or misuse.
      </LegalP>
      <LegalP>
        Despite these measures, no data transmission over the internet is completely secure. You use the Platform at your own
        risk and should take steps to protect your own account credentials.
      </LegalP>

      <LegalH2 id="rights">7. Your Rights</LegalH2>
      <LegalP>Under the Australian Privacy Act, you have the right to:</LegalP>
      <LegalUl
        items={[
          'Access the personal information we hold about you',
          'Request correction of inaccurate or out-of-date information',
          'Make a complaint if you believe we have mishandled your information',
        ]}
      />
      <LegalP>
        To exercise any of these rights, please contact us at hello@quni.com.au. We will respond to access and correction
        requests within 30 days.
      </LegalP>

      <LegalH2 id="cookies">8. Cookies</LegalH2>
      <LegalP>
        Our Platform uses cookies and similar tracking technologies to improve your experience. You can control cookie
        settings through your browser settings. Disabling certain cookies may affect the functionality of the Platform.
      </LegalP>

      <LegalH2 id="children">9. Children&apos;s Privacy</LegalH2>
      <LegalP>
        Our Platform is not intended for use by anyone under the age of 18. We do not knowingly collect personal
        information from minors. If you believe a minor has provided us with personal information, please contact us
        immediately.
      </LegalP>

      <LegalH2 id="changes">10. Changes to This Policy</LegalH2>
      <LegalP>
        We may update this Privacy Policy from time to time. We will notify you of material changes by email or via a notice
        on the Platform. The updated policy will take effect from the date specified in the notice.
      </LegalP>

      <LegalH2 id="complaints">11. Complaints</LegalH2>
      <LegalP>
        If you have a complaint about how we have handled your personal information, please contact us first at
        hello@quni.com.au. If you are not satisfied with our response, you may lodge a complaint with the Office of the
        Australian Information Commissioner (OAIC) at{' '}
        <a
          href="https://www.oaic.gov.au"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#FF6F61] font-medium underline underline-offset-2 hover:opacity-90"
        >
          www.oaic.gov.au
        </a>
        .
      </LegalP>

      <LegalH2 id="contact">12. Contact Us</LegalH2>
      <LegalP>Quni Living Pty Ltd</LegalP>
      <LegalP>Email: hello@quni.com.au</LegalP>
      <LegalP>Website: quni.com.au</LegalP>
    </LegalPageShell>
    </>
  )
}
