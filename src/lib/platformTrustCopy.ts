import { ORGANIZATION_EMAIL } from './site'

/** Factual trust points for renter conversion flows (invite, signup, booking). */
export const RENTER_PLATFORM_TRUST_POINTS = [
  {
    id: 'australian',
    title: 'Australian marketplace',
    body: 'Quni Living (quni.com.au) is operated by an Australian company. Your data is stored on Australian infrastructure.',
  },
  {
    id: 'free',
    title: 'Free for renters',
    body: 'No booking fee, platform fee, or surcharge from Quni. Bond and rent are between you and your landlord.',
  },
  {
    id: 'verification',
    title: 'Both sides verified',
    body: 'Landlords complete Stripe identity checks before they can accept a booking. Renters verify before a request is confirmed.',
  },
  {
    id: 'agreements',
    title: 'Formal tenancy paperwork',
    body: 'Where supported for your state and property type, agreements are generated for in-platform signing — not ad-hoc forms.',
  },
] as const

export const RENTER_PLATFORM_TRUST_LINKS = [
  { to: '/about', label: 'About Quni' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/verification', label: 'What we verify' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact' },
] as const

export const RENTER_PLATFORM_CONTACT_EMAIL = ORGANIZATION_EMAIL
