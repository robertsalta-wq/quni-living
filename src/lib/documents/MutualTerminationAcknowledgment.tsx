/**
 * Re-export API document module (NFT-safe .ts under api/documents).
 * Keep this path for any non-API importers; serverless uses api/documents directly.
 */
export {
  MutualTerminationAcknowledgment,
  type MutualTerminationAcknowledgmentProps,
} from '../../../api/documents/MutualTerminationAcknowledgment.js'
