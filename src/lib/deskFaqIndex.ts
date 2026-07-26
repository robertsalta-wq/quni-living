/**
 * Curated desk FAQ index for `/home-v3` Reception.
 *
 * This is NOT `/faq` and NOT `faqContent.tsx` — a small fixture with claim-safe
 * copy for the Places/Questions experiment. Do not assume parity with live FAQ.
 */

export type DeskFaqOwner = 'reception' | 'landlord' | 'listings' | 'trust'

export type DeskFaqItem = {
  id: string
  question: string
  answer: string
  ownerDesk: DeskFaqOwner
  /** Visible source stamp label, e.g. "QUNI FAQ" */
  source: string
}

export const DESK_FAQ_INDEX: readonly DeskFaqItem[] = [
  {
    id: 'free-renters',
    question: 'Is Quni free for renters?',
    answer:
      'Yes. Renters pay no booking, platform or service fees — from search through to a signed lease. A booking deposit may apply and is held securely, not kept by Quni.',
    ownerDesk: 'reception',
    source: 'QUNI FAQ',
  },
  {
    id: 'list-cost',
    question: 'What does it cost to list a room?',
    answer:
      'Listing is free. You pay $99 once, on the day you accept a tenant. Rent is paid to you directly — Quni is never in the rent chain.',
    ownerDesk: 'landlord',
    source: 'QUNI PRICING',
  },
  {
    id: 'who-holds-bond',
    question: 'Who holds the bond?',
    answer:
      'Never Quni. Bond is lodged under the rules of your state — in NSW some hosted-room arrangements are held by the landlord; in Queensland it is lodged with the authority.',
    ownerDesk: 'landlord',
    source: 'QUNI PRICING',
  },
  {
    id: 'when-bond-lodged',
    question: 'When is bond lodged?',
    answer:
      'It depends on the agreement type and the state. Quni never holds bond money at any point.',
    ownerDesk: 'landlord',
    source: 'QUNI PRICING',
  },
  {
    id: 'what-verified',
    question: 'What does verified mean?',
    answer:
      'Renters complete ID and enrolment checks. Landlords complete Stripe identity verification before they can accept a booking. Every listing is reviewed before it goes live.',
    ownerDesk: 'trust',
    source: 'VERIFICATION POLICY',
  },
  {
    id: 'how-book',
    question: 'How do I book a room?',
    answer:
      'Message the landlord from any listing, then apply. Your contact details stay private until the landlord accepts.',
    ownerDesk: 'listings',
    source: 'LIVE LISTINGS',
  },
  {
    id: 'which-states',
    question: 'Which states is Quni in?',
    answer: 'New South Wales and Queensland.',
    ownerDesk: 'reception',
    source: 'QUNI FAQ',
  },
  {
    id: 'spare-room',
    question: 'Can I rent out a spare room?',
    answer:
      'Yes. Listing is free. You pay $99 once, on the day you accept a tenant. Rent is paid to you directly — Quni is never in the rent chain.',
    ownerDesk: 'landlord',
    source: 'QUNI PRICING',
  },
] as const

/**
 * Suggested question chips under the Reception field — labels may shorten the
 * full FAQ question; `faqId` resolves against DESK_FAQ_INDEX (not /faq).
 */
export const DESK_RECEPTION_SUGGESTED_CHIPS: readonly { faqId: string; label: string }[] = [
  { faqId: 'free-renters', label: 'Is it free?' },
  { faqId: 'who-holds-bond', label: 'Who holds the bond?' },
  { faqId: 'what-verified', label: 'What does verified mean?' },
  { faqId: 'spare-room', label: 'Can I rent out a spare room?' },
] as const

export function deskFaqById(id: string): DeskFaqItem | undefined {
  return DESK_FAQ_INDEX.find((item) => item.id === id)
}
/**
 * Tier 4 (assistant) for unmatched questions — named no-op, default off.
 * Override: `VITE_DESK_RECEPTION_ASSISTANT=true`
 */
export function isDeskReceptionAssistantEnabled(): boolean {
  const override = String(import.meta.env.VITE_DESK_RECEPTION_ASSISTANT ?? '')
    .trim()
    .toLowerCase()
  return override === 'true' || override === '1'
}
