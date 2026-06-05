/**
 * NSW on-site licence to occupy (T1 boarder/lodger).
 */
import type { OccupancyAgreementProps } from '../../../../api/documents/rtaTypes.js'
import { LicenceOccupyDocument } from '../licenceOccupy/LicenceOccupyDocument.js'
import { NSW_LICENCE_OCCUPY_CONTENT } from './occupancyContent.js'

export function NswLicenceToOccupyOnSite(props: OccupancyAgreementProps) {
  return <LicenceOccupyDocument content={NSW_LICENCE_OCCUPY_CONTENT} props={props} />
}

/** @deprecated Use NswLicenceToOccupyOnSite - kept for generate-lease import compatibility. */
export function OccupancyAgreement(props: OccupancyAgreementProps) {
  return NswLicenceToOccupyOnSite(props)
}

export { NSW_OCCUPANCY_PDF_MARKERS } from './occupancyContent.js'

export default NswLicenceToOccupyOnSite
