/** Fixed sample for /see-quni. Fictional names only. No live listing. */

/**
 * Room photo for step 1. Replace this file to use your own picture
 * (keep the same name, or point listingPhoto at the new file).
 */
export const LISTING_PHOTO_SOURCE = 'src/components/demo/listing-room-placeholder.svg'

const listingPhotoUrl = new URL('../../components/demo/listing-room-placeholder.svg', import.meta.url).href

export const DEMO_TOUR_STEP_COUNT = 6

export const landlordTourFixture = {
  feeWaived: false as boolean,
  listingPhoto: listingPhotoUrl,
  listingTitle: 'Private room in a Ryde home',
  rent: '$300/wk',
  rentTag: 'sample rent',
  chips: ['Furnished', 'Bills included', 'Owner lives on site'] as const,
  description: [
    'Quiet room with a desk and built-in wardrobe.',
    'Shared kitchen and bathroom.',
  ] as const,
  hostName: 'Alex',
  hostInitials: 'A',
  hostLine: 'Hosted by Alex',
  applicantName: 'Sam',
  applicantInitials: 'S',
  applicantLine: 'Second-year student, a Sydney university',
  requestStatus: 'New request',
  moveInRow: 'Move in: 1 February',
  stayRow: 'Stay: 6 months',
  rentRow: 'Rent: $300/wk',
  applicantMessage:
    "Hi Alex, I'm close to campus for classes and looking for somewhere quiet to study. Happy to answer any questions.",
  checksHeading: "Sam's checks",
  checksNote: 'Quni reviews documents. Files are not shared with you.',
  acceptRows: ['Sam', 'Move in 1 February', '6 months', '$300/wk'] as const,
  declineLabel: 'Decline',
  agreementTitle: 'NSW occupancy agreement (example)',
  agreementRows: ['Owner: Alex', 'Occupant: Sam', 'Room: Ryde', 'Starts: 1 February'] as const,
  waitingToSign: ['Alex: waiting to sign', 'Sam: waiting to sign'] as const,
  agreementWatermark: 'EXAMPLE, NOT FOR SIGNING',
  confirmedTitle: 'Tenancy is active',
  bondRow: 'Confirm the bond',
  signedRows: ['Alex: signed', 'Sam: signed'] as const,
}

export const TOUR_BAND =
  'Example walkthrough. Sample room, sample student. Nothing here is live.'

export const TOUR_LISTING_HEADING = 'Your room, listed'
export const TOUR_LISTING_BODY = "This is how a room looks to students once it's on Quni."

export const TOUR_APPLICANT_HEADING = 'A student applies'
export const TOUR_APPLICANT_BODY =
  'You get a request with their details. You decide. Nothing happens until you accept.'

export const TOUR_ID_HEADING = 'Their ID is checked'
export const TOUR_ID_BODY =
  'Photo ID received. Quni reviews the document. The file is not shown to you.'
export const TOUR_ID_ROWS = [
  'University email confirmed',
  'Photo ID received',
  'Enrolment document received',
] as const

export const TOUR_ACCEPT_HEADING = 'You accept'
export const TOUR_ACCEPT_BUTTON = 'Accept (example)'
export const TOUR_FEE_BODY_WAIVED = 'Free for this accept. Nothing is charged on this page.'

export function tourListingFeeRow(feeDisplay: string, feeWaived: boolean): string {
  if (feeWaived) return 'Listing fee: free'
  return `Listing fee ${feeDisplay}, charged when you accept`
}

export const TOUR_AGREEMENT_HEADING = 'Quni prepares the agreement'
export const TOUR_AGREEMENT_LINES = [
  'Quni prepares the agreement for your state.',
  'You and the student both sign inside Quni.',
  'This card is not the agreement itself.',
] as const

export const TOUR_DONE_HEADING = "That's the whole process"
export const TOUR_BOND_CAPTION = 'You confirm the bond once it arrives.'
export const TOUR_DONE_BODY = 'Listing is free until you accept a student.'
export const TOUR_DONE_BODY_WAIVED = 'Listing is free. So is your first accept.'
export const TOUR_SIGNUP_LABEL = 'List your room'
export const TOUR_RESTART_LABEL = 'Start again'

const NAMED_SOURCES = ['messenger', 'instagram', 'list-your-room'] as const

export type DemoTourSource = (typeof NAMED_SOURCES)[number] | 'other' | 'direct'

export function demoTourSourceFromParam(raw: string | null): DemoTourSource {
  if (raw == null || raw.trim() === '') return 'direct'
  const value = raw.trim().toLowerCase()
  if (value === 'messenger' || value === 'instagram' || value === 'list-your-room') return value
  return 'other'
}

export function demoTourSignupPath(source: DemoTourSource): string {
  return `/signup?role=landlord&utm_source=${encodeURIComponent(source)}`
}
