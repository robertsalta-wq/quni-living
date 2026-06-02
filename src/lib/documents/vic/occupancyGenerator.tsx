/**
 * VIC on-site licence to occupy (T1 boarder/lodger) — Part A review PDF.
 */
import type { OccupancyAgreementProps } from '../../../../api/documents/rtaTypes.js'
import { LicenceOccupyDocument } from '../licenceOccupy/LicenceOccupyDocument.js'
import { VIC_LICENCE_OCCUPY_CONTENT } from './occupancyContent.js'

export function VicLicenceToOccupyOnSite(props: OccupancyAgreementProps) {
  return <LicenceOccupyDocument content={VIC_LICENCE_OCCUPY_CONTENT} props={props} />
}

export default VicLicenceToOccupyOnSite
