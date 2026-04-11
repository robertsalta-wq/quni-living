/**
 * Re-export — PDF is built server-side in `api/documents/OccupancyAgreement.js`
 * (@react-pdf/renderer + Node on Vercel). Do not import this from client routes.
 */
export { OccupancyAgreement } from '../../../api/documents/OccupancyAgreement.js'
export type { OccupancyAgreementProps } from '../../../api/documents/rtaTypes.js'
