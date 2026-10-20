/** Fixed sample for /see-quni. Fictional names only. No live listing. */

export const DEMO_TOUR_STEP_COUNT = 6

export const landlordTourFixture: { feeWaived: boolean } = {
  feeWaived: false,
}

export const TOUR_BAND =
  'Example walkthrough. Sample room, sample student. Nothing here is live.'

export const TOUR_LISTING_HEADING = 'Your room, listed'
export const TOUR_LISTING_BODY = "This is how a room looks to students once it's on Quni."
export const TOUR_LISTING_CARD =
  'Private room in a Ryde home. Owner lives on site. $300/wk sample rent. Furnished, bills included.'

export const TOUR_APPLICANT_HEADING = 'A student applies'
export const TOUR_APPLICANT_BODY =
  'You get a request with their details. You decide. Nothing happens until you accept.'
export const TOUR_APPLICANT_CARD =
  'Sam, second-year student at a Sydney university. Wants to move in on 1 February for 6 months.'

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

export const TOUR_AGREEMENT_HEADING = 'Quni prepares the agreement'
export const TOUR_AGREEMENT_TITLE =
  'Example. NSW occupancy agreement for a room where the owner lives on site. Not a real agreement and not for signing.'
export const TOUR_AGREEMENT_LINES = [
  'Quni prepares the agreement for your state.',
  'You and the student both sign inside Quni.',
  'This card is not the agreement itself.',
] as const

export const TOUR_DONE_HEADING = "That's the whole process"
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
