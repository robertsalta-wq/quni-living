import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { landlordDashboardProfilePath } from './landlordDashboardProfilePaths'
import {
  BOND_FAQ_HOSTED_VS_PRIVATE,
  BOND_FAQ_HOW_HANDLED,
  BOND_FAQ_NO_BOND_REQUIRED,
  RENT_BOND_LONG,
} from './bondPublicCopy'

export type FaqItem = {
  id: string
  question: string
  answer: ReactNode
  /** Plain text for FAQPage JSON-LD when `answer` is not a string. */
  answerText?: string
}
export type FaqSection = { id: string; label: string; items: FaqItem[] }

const pricingLink = (
  <Link to="/pricing" className="font-medium text-[var(--quni-coral)] hover:underline">
    Pricing
  </Link>
)
const refundsLink = (
  <Link to="/refunds" className="font-medium text-[var(--quni-coral)] hover:underline">
    Refund Policy
  </Link>
)
const contactLink = (
  <Link to="/contact" className="font-medium text-[var(--quni-coral)] hover:underline">
    Contact
  </Link>
)
const partnershipsLink = (
  <Link to="/services/landlord-partnerships" className="font-medium text-[var(--quni-coral)] hover:underline">
    landlord partnerships
  </Link>
)
const internationalStudentsLink = (
  <Link to="/international" className="font-medium text-[var(--quni-coral)] hover:underline">
    international students
  </Link>
)
const verificationLink = (
  <Link to="/verification" className="font-medium text-[var(--quni-coral)] hover:underline">
    verification checklist
  </Link>
)

/** Comprehensive FAQ sections for /faq - consolidated from marketing pages. */
export const FAQ_SECTIONS: FaqSection[] = [
  {
    id: 'about',
    label: 'About Quni',
    items: [
      {
        id: 'about-what',
        question: 'What is Quni Living?',
        answer:
          'Quni is software for verified accommodation near Australian university campuses and workplaces. Students, graduates, and professionals can browse, message landlords, and apply. Landlords list the place and run the tenancy. Quni is not the landlord and is not the landlord\'s agent.',
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
          'Quni Listing is available in Queensland, New South Wales, and Victoria for typical private-room listings. See Pricing for what is available in your state and for your property type.',
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
          'Yes. Renters pay no booking fee, platform fee, service fee, or surcharge to Quni - ever. Bond and weekly rent are tenancy money between you and your landlord, not Quni fees.',
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
          'Hosts complete Stripe identity verification before they can accept a booking. When approved, they show a Verified host badge on their profile and listing. You can still browse, message, and apply beforehand.',
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
          'Nothing was charged to you. A declined request does not move rent, bond, or a deposit through Quni.',
      },
      {
        id: 'students-data-residency',
        question: 'Where is my data stored if I am studying in Australia from overseas?',
        answerText:
          'Your account, verification documents, and tenancy records are stored on Australian infrastructure. See /international for how Australian law applies.',
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
        answerText:
          'It depends whether you are a student, working tenant, or landlord - see /verification for the full step-by-step list.',
        answer: (
          <>
            It depends whether you are a student, working tenant, or landlord - see our {verificationLink} for the
            full step-by-step list.
          </>
        ),
      },
      {
        id: 'verification-time',
        question: 'How long does verification take?',
        answerText:
          'Most verifications are reviewed within one to two business days. See /verification for what each path involves.',
        answer: (
          <>
            Most verifications are reviewed within one to two business days. See our {verificationLink} for what each
            path involves.
          </>
        ),
      },
      {
        id: 'verification-cost',
        question: 'What does verification cost?',
        answerText:
          'Verification is free for renters. See /verification for what landlords set up on Quni Listing.',
        answer: (
          <>
            Verification is free for renters. See our {verificationLink} for what landlords set up on Quni Listing.
          </>
        ),
      },
      {
        id: 'verification-listings',
        question: 'Which listings can I see after verifying?',
        answerText:
          'Student and non-student paths unlock different listings once verified. See /verification for how each path works.',
        answer: (
          <>
            Student and non-student paths unlock different listings once verified. See our {verificationLink} for how
            each path works.
          </>
        ),
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
        answerText:
          'Landlords pay a flat acceptance fee when they accept a booking. There is no charge until then, and no percentage of rent. Current amounts are on /pricing. Renters do not pay this fee.',
        answer: (
          <>
            Landlords pay a flat acceptance fee when they accept a booking. There is no charge until then, and no
            percentage of rent. Current amounts are on our {pricingLink} page. Renters do not pay this fee.
          </>
        ),
      },
      {
        id: 'landlords-list-first',
        question: 'How do I list my first property?',
        answerText:
          'Create a landlord account via landlord onboarding, then add your property from the landlord dashboard. See /how-it-works for the full flow.',
        answer: (
          <>
            Create a landlord account via{' '}
            <Link to={landlordDashboardProfilePath()} className="font-medium text-[var(--quni-coral)] hover:underline">
              landlord onboarding
            </Link>
            , then add your property from the landlord dashboard. See{' '}
            <Link to="/how-it-works" className="font-medium text-[var(--quni-coral)] hover:underline">
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
          'Before you can accept a booking, you complete Stripe identity verification. When Stripe enables charges on your account, you may show a Verified host badge on your profile and listings. Quni does not manually review profiles or check property titles. You also save a card for the acceptance fee when you confirm.',
      },
      {
        id: 'landlords-rent',
        question: 'How do I receive rent payments?',
        answer:
          RENT_BOND_LONG,
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
          'Yes - there are no lock-in contracts. You can deactivate or remove your listing from your landlord dashboard.',
      },
      {
        id: 'landlords-portfolio',
        question: 'I have a portfolio or university partnership - where do I start?',
        answerText:
          'See /services/landlord-partnerships for bulk placements and managed portfolios, or use subject Partnership on our /contact form.',
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
          'No. Renters pay no booking fee, platform fee, service fee, or surcharge to Quni - ever. Bond and weekly rent are tenancy money, not Quni fees.',
      },
      {
        id: 'money-listing-fee',
        question: 'What does a landlord pay on Quni Listing?',
        answerText:
          'A flat acceptance fee per accepted booking (current amount on /pricing; fees may change with notice). Renters do not pay this fee.',
        answer: (
          <>
            A flat acceptance fee per accepted booking (current amount on {pricingLink}; fees may change with notice).
            Renters do not pay this fee.
          </>
        ),
      },
      {
        id: 'money-card-surcharge',
        question: 'Is there a card surcharge?',
        answer: `No. Renters do not pay Quni by card. ${RENT_BOND_LONG}`,
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
        answer: BOND_FAQ_HOW_HANDLED,
      },
      {
        id: 'bond-refunds',
        question: 'Who sets bond refund rules?',
        answer:
          'Cash bond refunds and disputes follow state or territory residential laws and bond authorities - not Quni’s refund policy for platform fees.',
      },
      {
        id: 'bond-no-bond-required',
        question: 'What if no bond is required?',
        answer: BOND_FAQ_NO_BOND_REQUIRED,
      },
    ],
  },
  {
    id: 'listing-managed',
    label: 'Rent and bond',
    items: [
      {
        id: 'tier-difference',
        question: 'Does Quni collect rent or bond?',
        answer:
          RENT_BOND_LONG,
      },
      {
        id: 'tier-availability',
        question: 'Where can I list?',
        answerText:
          'See availability on /pricing for Queensland, New South Wales, and Victoria, and for your property type.',
        answer: (
          <>
            See availability on {pricingLink} for Queensland, New South Wales, and Victoria, and for your property
            type.
          </>
        ),
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
        answerText:
          'Sign in and open Messages on the property page to chat with the landlord before you book. The general /contact form is for Quni-wide questions, not individual listings.',
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
        answer: BOND_FAQ_HOSTED_VS_PRIVATE,
      },
    ],
  },
  {
    id: 'support',
    label: 'Support & disputes',
    items: [
      {
        id: 'support-tenancy',
        question: 'Something went wrong with my tenancy - can Quni decide bond disputes?',
        answerText:
          'Bond and tenancy disputes are between the parties or resolved through the relevant state tribunal. Quni may help with platform or payment administration where it handles funds; see /refunds for money Quni actually receives.',
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
        answerText:
          'See /refunds for timelines on platform payments. For a booking in progress, sign in and open a support ticket from your dashboard, or email hello@quni.com.au.',
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
        answerText:
          'Email hello@quni.com.au or use our /contact form - we usually reply within 1 business day. Signed-in users can also use support from the student or landlord dashboard.',
        answer: (
          <>
            Email{' '}
            <a href="mailto:hello@quni.com.au" className="font-medium text-[var(--quni-coral)] hover:underline">
              hello@quni.com.au
            </a>{' '}
            or use our {contactLink} form - we usually reply within 1 business day. Signed-in users can also use support
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

export function faqItemToPlain(item: FaqItem): { question: string; answer: string } | null {
  if (typeof item.answer === 'string') {
    const answer = item.answer.trim()
    return answer ? { question: item.question, answer } : null
  }
  const answer = item.answerText?.trim()
  return answer ? { question: item.question, answer } : null
}

/** All FAQ pairs with machine-readable answers for schema.org FAQPage. */
export function collectFaqPlainPairs(sections: FaqSection[] = FAQ_SECTIONS): { question: string; answer: string }[] {
  return sections
    .flatMap((s) => s.items.map(faqItemToPlain))
    .filter((p): p is { question: string; answer: string } => p != null)
}
