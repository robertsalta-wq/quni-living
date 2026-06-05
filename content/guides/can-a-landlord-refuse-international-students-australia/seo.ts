import type { GuideFaqItem, GuideSeoConfig } from '../../../src/lib/guides/types'

/** Update datePublished/dateModified here at deploy; keep manifest.json dateModified in sync. */
export const guideSeo: GuideSeoConfig = {
  slug: 'can-a-landlord-refuse-international-students-australia',
  title: 'Can a Landlord Refuse International Students in Australia?',
  headline: 'Can a Landlord Refuse International Students in Australia?',
  metaDescription:
    "A landlord can't refuse you for your nationality or background, but enforcement is reactive. Know your rights as an international student renting in Australia.",
  ogDescription:
    'Know your rights as an international student renting in Australia, and how Quni keeps the search fair.',
  jsonLdHeadline:
    'Can a Landlord Refuse International Students in Australia? Your Rights, Explained',
  navLabel: 'Can a landlord refuse international students?',
  datePublished: '2026-06-05',
  dateModified: '2026-06-05',
  faqs: [
    {
      question: 'Can a real estate agent refuse international students in Australia?',
      answer:
        'An agent cannot refuse you because of your race, national or ethnic origin, or immigrant status. Those are protected under federal and state law, and renting is covered. They can apply neutral criteria such as proof of income, a guarantor, or proof of enrolment, as long as they apply them to every applicant. The question is always whether the real reason is your background, or a condition applied to everyone.',
    },
    {
      question: 'Is a "no international students" policy legal?',
      answer:
        'A blanket "no international students" rule is legally risky. If it has the effect of excluding people of a particular national or ethnic origin without a fair reason, it can be indirect discrimination under the Racial Discrimination Act 1975 and state law. Marketing a property to students, or asking all applicants for a guarantor or proof of enrolment, is generally fine.',
    },
    {
      question: 'Can a landlord ask if I am an international student?',
      answer:
        'Asking is not automatically unlawful, and landlords often ask to understand your rental history or guarantor situation. What matters is what they do with the answer. Using it to screen people out by national origin or immigrant status is unlawful. Asking so they can assess everyone on the same neutral criteria is not.',
    },
    {
      question: 'What are my rights as an international student renting in Australia?',
      answer:
        "You are protected against discrimination based on race, colour, descent, national or ethnic origin, and immigrant status, at every stage from advertising to application to the tenancy itself. You also have the ordinary rights of any tenant under your state's Residential Tenancies Act. Free tenancy advice services and the Australian Human Rights Commission can help if you believe you have been discriminated against.",
    },
    {
      question: 'Do I need an Australian guarantor to rent as an international student?',
      answer:
        'Not by law, but many landlords ask for a guarantor, or for extra rent in advance, to offset a short local rental history. That is lawful as long as it is applied consistently to applicants in the same situation. If you cannot provide a guarantor, a verified rental profile, references, or properties that do not require one can all help.',
    },
    {
      question: 'How do I prove rental discrimination?',
      answer:
        'It is difficult, because it usually happens quietly. Keep records: save listings, messages and dates, and note if you are told different things to other applicants. Ask for the reason for a refusal in writing. If you have evidence, you can lodge a complaint with the Australian Human Rights Commission or your state equality body, which will try to conciliate before any court or tribunal step.',
    },
  ] satisfies GuideFaqItem[],
}
