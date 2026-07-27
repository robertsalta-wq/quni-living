export type HowItWorksActor = 'you' | 'quni'

export type HowItWorksStep = {
  n: number
  title: string
  body: string
  actor: HowItWorksActor
}

/** Six-step rail — exactly two tagged You, four Quni. */
export const HOW_IT_WORKS_STEPS: readonly HowItWorksStep[] = [
  {
    n: 1,
    title: 'AI drafts your listing',
    body: 'Description, photos order, and a market price band — from the details you give.',
    actor: 'quni',
  },
  {
    n: 2,
    title: 'Verified applicants apply',
    body: 'Identity and enrolment checked before anyone reaches your shortlist.',
    actor: 'quni',
  },
  {
    n: 3,
    title: 'You accept one tenant',
    body: 'Pick from a shortlist, not an inbox. Say yes when the fit is right.',
    actor: 'you',
  },
  {
    n: 4,
    title: 'Agreement signed online',
    body: 'State-compliant lease generated and signed in-platform.',
    actor: 'quni',
  },
  {
    n: 5,
    title: 'Bond lodged with the state scheme',
    body: 'Guidance on lodgement — Quni never holds bond.',
    actor: 'quni',
  },
  {
    n: 6,
    title: 'Rent paid directly to you',
    body: 'Rent goes renter → landlord. Quni is not in the middle.',
    actor: 'you',
  },
]

export const QUNI_DOES = [
  'Lists and matches your room for $0',
  'Drafts listing copy and enquiry replies with AI',
  'Surfaces verified applicants only',
  'Generates state-compliant agreements',
  'Guides bond lodgement with the state scheme',
] as const

export const QUNI_DOES_NOT = [
  'Hold bond or rent',
  'Charge until you accept a tenant ($99 once)',
  'Guarantee the room fills',
  'Give legal advice',
  'Operate outside NSW & QLD',
] as const

export const ACCEPTANCE_FEE_AUD = 99
