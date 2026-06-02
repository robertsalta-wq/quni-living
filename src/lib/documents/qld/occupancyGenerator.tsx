/**
 * Queensland on-site licence to occupy (T1 boarder/lodger).
 */
import type { OccupancyAgreementProps } from '../../../../api/documents/rtaTypes.js'
import { LicenceOccupyDocument } from '../licenceOccupy/LicenceOccupyDocument.js'
import { QLD_LICENCE_OCCUPY_CONTENT } from './occupancyContent.js'

export function QldLicenceToOccupyOnSite(props: OccupancyAgreementProps) {
  return <LicenceOccupyDocument content={QLD_LICENCE_OCCUPY_CONTENT} props={props} />
}

/** @deprecated Use QldLicenceToOccupyOnSite — kept for generate-qld-occupancy import compatibility. */
export function QuniOccupancyAgreementQld(props: OccupancyAgreementProps) {
  return QldLicenceToOccupyOnSite(props)
}

export { QLD_OCCUPANCY_PDF_MARKERS } from './occupancyContent.js'

export default QldLicenceToOccupyOnSite
