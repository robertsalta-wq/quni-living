import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type FaqItem = { id: string; question: string; answer: ReactNode }
export type FaqSection = { id: string; label: string; items: FaqItem[] }

const pricingLink = (
  <Link to="/pricing" className="font-medium text-[#FF6F61] hover:underline">
    Pricing
  </Link>
)
const refundsLink = (
  <Link to="/refunds" className="font-medium text-[#FF6F61] hover:underline">
    Refund Policy
  </Link>
)
const contactLink = (
  <Link to="/contact" className="font-medium text-[#FF6F61] hover:underline">
    Contact
  </Link>
)
const partnershipsLink = (
  <Link to="/services/landlord-partnerships" className="font-medium text-[#FF6F61] hover:underline">
    landlord partnerships
  </Link>
)
const internationalStudentsLink = (
  <Link to="/international" className="font-medium text-[#FF6F61] hover:underline">
    international students
  </Link>
)

/** Comprehensive FAQ sections for /faq — consolidated from marketing pages. */
export const FAQ_SECTIONS: FaqSection[] = [
  {
    id: 'about',
    label: 'About Quni',
    items: [
      {
        id: 'about-what',
        question: 'What is Quni Living?',
        answer:
          'Quni is a verified accommodation marketplace near Australian university campuses and workplaces. Students, graduates, and professionals can browse, message landlords, and book where supported; landlords can list with Quni Listing or Quni Managed depending on state and property type.',
      },
      {
        id: 'about-who',
        question: 'Who is Quni for?',
        answer:
          'Primarily students and graduates looking for accommodation near campus, and landlords who want structured placements and verified demand. Some landlords also accept professional renters on selected listings.',
      },
      {
        id: 'about-states',
        question: 'Which states does Quni operate in?',
        answer:
          'Quni Listing is available nationwide. Quni Managed is currently live in Queensland, with New South Wales and Victoria coming as we complete state-specific compliance work. See Pricing and How it works for what is available in your state and for your property type.',
      },
    ],
  },
  {
    id: 'students',
    label: 'For students & renters',
    items: [
      {
        id: 'students-free',
        question: 'Is Quni free for renters?',
        answer:
          'Yes. Renters pay no booking fee, platform fee, service fee, or surcharge to Quni — ever. Bond and weekly rent are tenancy money between you and your landlord, not Quni fees.',
      },
      {
        id: 'students-student-only',
        question: 'Do I need to be a student?',
        answer:
          'No. You can sign up as a student or as a non-student renter (identity verification). Landlords choose per listing whether to accept verified students only or also verified non-student renters. Once verified, you can see and book every listing available to your account type.',
      },
      {
        id: 'students-landlord-trust',
        question: 'How do I know the landlord is legitimate?',
        answer:
          'Hosts complete Stripe identity verification before they can accept a booking. When approved, they show a Verified host badge on their profile and listing. You can still browse, message, and request to book beforehand.',
      },
      {
        id: 'students-agreements',
        question: 'Are tenancy agreements legally binding?',
        answer:
          'Yes. Where available for your state and property type, Quni helps generate compliant tenancy documents for digital signature (for example via DocuSeal).',
      },
      {
        id: 'students-lease-length',
        question: 'Is there a minimum lease length?',
        answer:
          'Lease length is agreed between you and your landlord. Most student stays on Quni run a semester (around 26 weeks) or longer, but shorter and longer stays are supported where landlords offer them.',
      },
      {
        id: 'students-declined',
        question: 'What if my booking request is declined?',
        answer:
          'If a landlord declines your request, any authorised deposit hold is released or refunded per automated flows — typically 5–7 business days to your card or bank. See our Refund Policy for platform-fee questions.',
      },
      {
        id: 'students-data-residency',
        question: 'Where is my data stored if I am studying in Australia from overseas?',
        answer: (
          <>
            Your account, verification documents, and tenancy records are stored on Australian infrastructure.
            See our page for {internationalStudentsLink} for how Australian law applies.
          </>
        ),
      },
    ],
  },
  {
    id: 'verification',
    label: 'Verification & identity',
    items: [
      {
        id: 'verification-docs',
        question: 'What documents do I need to verify?',
        answer:
          "A government-issued photo ID (Australian passport or driver's licence) and one supporting document — for example a utility bill, employer letter, or Medicare card.",
      },
      {
        id: 'verification-time',
        question: 'How long does verification take?',
        answer:
          "Typically within 1–2 business days. You'll get an email when your Verified Identity badge has been applied to your profile.",
      },
      {
        id: 'verification-cost',
        question: 'What does verification cost?',
        answer: 'Creating an account and verifying your identity is completely free.',
      },
      {
        id: 'verification-listings',
        question: 'Which listings can I see after verifying?',
        answer:
          "Listings where the landlord accepts professional renters are visible and bookable to verified non-student accounts. Listings marked 'Students only' are restricted to verified student accounts.",
      },
    ],
  },
  {
    id: 'landlords',
    label: 'For landlords',
    items: [
      {
        id: 'landlords-fees',
        question: 'How much does Quni charge landlords?',
        answer: (
          <>
            Landlords choose <strong>Quni Listing</strong> (flat fee per accepted booking) or <strong>Quni Managed</strong>{' '}
            (percentage of weekly rent while active). There are no listing charges until a booking is accepted. Current
            amounts are on our {pricingLink} page.
          </>
        ),
      },
      {
        id: 'landlords-list-first',
        question: 'How do I list my first property?',
        answer: (
          <>
            Create a landlord account via{' '}
            <Link to="/onboarding/landlord" className="font-medium text-[#FF6F61] hover:underline">
              landlord onboarding
            </Link>
            , then add your property from the landlord dashboard. See{' '}
            <Link to="/how-it-works" className="font-medium text-[#FF6F61] hover:underline">
              How it works
            </Link>{' '}
            for the full flow.
          </>
        ),
      },
      {
        id: 'landlords-student-verify',
        question: 'How are students verified?',
        answer:
          'Students verify with identity documents and badges shown on their profile. Landlords can review verification status before accepting a booking request.',
      },
      {
        id: 'landlords-host-verify',
        question: 'How does Quni verify landlords?',
        answer:
          'Before you can accept a booking (Listing or Managed), you complete Stripe Connect identity verification. When Stripe enables charges on your account, you may show a Verified host badge on your profile and listings. Quni does not manually review profiles or check property titles. Quni Listing also requires a saved card for the acceptance fee when you confirm.',
      },
      {
        id: 'landlords-rent',
        question: 'How do I receive rent payments?',
        answer:
          'On Quni Listing, bond and weekly rent flow directly between landlord and renter — Quni is not in the payment chain after a booking is accepted. On Quni Managed, weekly rent is collected through Stripe Connect and the service fee is deducted before payout to your bank account.',
      },
      {
        id: 'landlords-campus',
        question: "Can I list if my property isn't near a university?",
        answer:
          'Quni is designed for properties near Australian university campuses. Search is organised by university and suburb, so listings near campuses get the most visibility.',
      },
      {
        id: 'landlords-deactivate',
        question: 'Can I pause or remove my listing?',
        answer:
          'Yes — there are no lock-in contracts. You can deactivate or remove your listing from your landlord dashboard.',
      },
      {
        id: 'landlords-portfolio',
        question: 'I have a portfolio or university partnership — where do I start?',
        answer: (
          <>
            See {partnershipsLink} for bulk placements and managed portfolios, or use subject{' '}
            <strong>Partnership</strong> on our {contactLink} form.
          </>
        ),
      },
    ],
  },
  {
    id: 'money-fees',
    label: 'Money & fees',
    items: [
      {
        id: 'money-renter-fees',
        question: 'Do renters pay any fees to Quni?',
        answer:
          'No. Renters pay no booking fee, platform fee, service fee, or surcharge to Quni — ever. Bond and weekly rent are tenancy money, not Quni fees.',
      },
      {
        id: 'money-listing-fee',
        question: 'What does a landlord pay on Quni Listing?',
        answer: (
          <>
            A flat acceptance fee per accepted booking (current amount on {pricingLink}; fees may change with notice).
            Renters do not pay this fee.
          </>
        ),
      },
      {
        id: 'money-managed-fee',
        question: 'What does a landlord pay on Quni Managed?',
        answer: (
          <>
            A percentage of weekly rent while the tenancy is active, collected via Stripe Connect as part of rent
            payouts — see {pricingLink} for the current Managed service fee.
          </>
        ),
      },
      {
        id: 'money-card-surcharge',
        question: 'Is there a card surcharge?',
        answer:
          'An optional card surcharge may apply when paying by card where Stripe applies it. Free bank transfer is offered where available.',
      },
    ],
  },
  {
    id: 'bond-compliance',
    label: 'Bond & compliance',
    items: [
      {
        id: 'bond-handled',
        question: 'How is bond handled?',
        answer:
          'Bond is held by the landlord (for hosted rooms / boarder-lodger arrangements) or lodged with the relevant state or territory bond authority (for standard residential tenancies), depending on your listing and agreement. Quni is not the custodian of bond money. Where a statutory scheme applies, lodgement follows the rules in your state or territory.',
      },
      {
        id: 'bond-refunds',
        question: 'Who sets bond refund rules?',
        answer:
          'Cash bond refunds and disputes follow state or territory residential laws and bond authorities — not Quni’s refund policy for platform fees.',
      },
    ],
  },
  {
    id: 'listing-managed',
    label: 'Listing vs Managed',
    items: [
      {
        id: 'tier-difference',
        question: 'What is the difference between Quni Listing and Quni Managed?',
        answer:
          'Listing: landlord pays a flat fee per accepted booking and runs bond and rent directly with the renter. Managed: landlord pays a percentage of weekly rent while active; weekly rent is collected via Stripe Connect with fee deduction before payout; availability varies by state and property type.',
      },
      {
        id: 'tier-availability',
        question: 'Where is each tier available?',
        answer: (
          <>
            Quni Listing is available nationwide. Quni Managed is currently live in Queensland. See availability on{' '}
            {pricingLink} for the latest state-by-state coverage and any property-type constraints.
          </>
        ),
      },
      {
        id: 'tier-mix',
        question: 'Do I have to pick the same tier for every property?',
        answer:
          'No. Each property carries its own service model. You can run one property as Listing and another as Managed. Listing properties may be upgraded to Managed later (for example when accepting a booking), but Managed properties cannot move back to Listing.',
      },
    ],
  },
  {
    id: 'messaging',
    label: 'Messaging & enquiries',
    items: [
      {
        id: 'messaging-listing',
        question: 'How do I ask about a specific listing?',
        answer: (
          <>
            Sign in and open <strong>Messages</strong> on the property page to chat with the landlord before you book.
            The general {contactLink} form is for Quni-wide questions, not individual listings.
          </>
        ),
      },
      {
        id: 'messaging-enquiry-forms',
        question: 'Are property enquiry forms still used?',
        answer:
          'Property enquiry forms are retired. Use Messages to chat with the landlord on-platform before you book.',
      },
    ],
  },
  {
    id: 'room-types',
    label: 'Hosted rooms vs private rentals',
    items: [
      {
        id: 'room-types-hosted-vs-private',
        question: "What's the difference between a hosted room and a private room?",
        answer:
          "Hosted rooms are typically where the owner lives on-site (a boarder/lodger-style arrangement) and you sign an occupancy-style agreement; bond (if any) is usually held directly by the landlord. Private rooms are standard residential tenancies where you sign a tenancy agreement and bond (if required) is lodged with your state's bond authority under the relevant rules.",
      },
    ],
  },
  {
    id: 'support',
    label: 'Support & disputes',
    items: [
      {
        id: 'support-tenancy',
        question: 'Something went wrong with my tenancy — can Quni decide bond disputes?',
        answer: (
          <>
            Bond and tenancy disputes are between the parties or resolved through the relevant state tribunal. Quni may
            help with platform or payment administration where it handles funds; see {refundsLink} for money Quni
            actually receives.
          </>
        ),
      },
      {
        id: 'support-payments',
        question: 'Payments, deposits, or refunds?',
        answer: (
          <>
            See {refundsLink} for timelines on platform payments. For a booking in progress, sign in and open a support
            ticket from your dashboard, or email hello@quni.com.au.
          </>
        ),
      },
      {
        id: 'support-contact',
        question: 'Who do I contact?',
        answer: (
          <>
            Email{' '}
            <a href="mailto:hello@quni.com.au" className="font-medium text-[#FF6F61] hover:underline">
              hello@quni.com.au
            </a>{' '}
            or use our {contactLink} form — we usually reply within 1 business day. Signed-in users can also use support
            from the student or landlord dashboard.
          </>
        ),
      },
      {
        id: 'support-form-broken',
        question: 'The contact form will not submit',
        answer:
          'Complete the verification step (Turnstile). If the form still fails, email hello@quni.com.au directly with your name, email, and message.',
      },
    ],
  },
]

export const ALL_FAQ_ITEMS: FaqItem[] = FAQ_SECTIONS.flatMap((s) => s.items)
