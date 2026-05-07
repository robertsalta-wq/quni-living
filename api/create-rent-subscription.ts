/**
 * @deprecated Use POST /api/confirm-booking. Kept for backwards compatibility with older clients.
 */
export const config = { runtime: 'nodejs', maxDuration: 60 }

export { default } from './confirm-booking.js'
