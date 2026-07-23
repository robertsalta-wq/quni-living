import { Text, View } from '@react-pdf/renderer'
import type { ReactNode } from 'react'
import type { QuniPlatformAddendumProps } from '../../../api/documents/rtaTypes.js'
import { OccupancyMatchSectionHeading, occupancyMatchPdf } from './quniDocumentPdfTheme.js'

function formatMoney(n: number) {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}

function descriptionLine(props: QuniPlatformAddendumProps): string {
  const desc = (props.utilitiesDescription || '').trim()
  return desc || 'Utilities and services as described on the property listing.'
}

function disclosureParagraph(props: QuniPlatformAddendumProps): string | null {
  const labels = props.listingDisclosureLabels?.map((l) => l.trim()).filter(Boolean) ?? []
  if (labels.length === 0) return null
  return `Disclosure summary: ${labels.join('; ')}.`
}

function body(text: string, key: string): ReactNode {
  return (
    <Text key={key} style={occupancyMatchPdf.bodyParagraph}>
      {text}
    </Text>
  )
}

/**
 * Shared Section 5 — Utilities & bills.
 * Managed all-inclusive + quarterly cap only when tier/resolver/cap conditions hold.
 */
export function AddendumSection5UtilitiesAndBills(props: QuniPlatformAddendumProps) {
  const tier = props.serviceTier === 'managed' ? 'managed' : 'listing'
  const desc = descriptionLine(props)
  const showManagedCap =
    tier === 'managed' &&
    props.allInclusive === true &&
    props.utilitiesCap != null &&
    Number.isFinite(props.utilitiesCap) &&
    props.utilitiesCap > 0

  const disclosure = disclosureParagraph(props)
  const paragraphs: ReactNode[] = []
  let n = 0
  const nextKey = () => `s5-${n++}`

  if (showManagedCap) {
    paragraphs.push(body(`Rent is calculated on an all-inclusive basis covering ${desc.toLowerCase()}.`, nextKey()))
    paragraphs.push(
      body(
        `A utilities allowance of ${formatMoney(props.utilitiesCap as number)} per quarter applies. Usage within this allowance is included in rent.`,
        nextKey(),
      ),
    )
    if (props.signingPackage === 'residential_tenancy_qld') {
      paragraphs.push(
        <Text style={occupancyMatchPdf.bodyParagraph} key={nextKey()}>
          Usage in excess of the quarterly allowance must be paid by the tenant within 14 days of invoice (or as
          otherwise agreed in writing). This is the tenant&apos;s payment timing for excess-usage amounts invoiced
          through the platform - it is separate from the landlord&apos;s obligation under the Residential Tenancies and
          Rooming Accommodation Act 2008 (Qld) (including provisions about utility charges) to give the tenant copies of
          relevant supplier account documents within <Text style={{ fontFamily: 'Helvetica-Bold' }}>4 weeks</Text> of the
          property manager/owner receiving them, where the tenant is required to pay for a utility service by reference
          to the supplier&apos;s account.
        </Text>,
      )
    } else {
      paragraphs.push(
        body(
          'Usage in excess of the quarterly allowance must be paid by the tenant within 14 days of invoice (or as otherwise agreed in writing). Evidence of usage may be supplied as utility account summaries, meter readings, or other reasonable records consistent with how similar properties are typically managed through the platform.',
          nextKey(),
        ),
      )
    }
    paragraphs.push(
      body(
        'The tenant must not deliberately waste utilities or circumvent metering. Where excessive usage is clearly tenant-caused, the landlord may request reimbursement in addition to any excess-usage amount, acting reasonably and with supporting information where practicable.',
        nextKey(),
      ),
    )
  } else if (tier === 'managed' && props.allInclusive) {
    paragraphs.push(body(`Rent is calculated on an all-inclusive basis covering ${desc.toLowerCase()}.`, nextKey()))
    paragraphs.push(
      body(
        'The tenant must not deliberately waste utilities or circumvent metering. Where excessive usage is clearly tenant-caused, the landlord may request reimbursement, acting reasonably and with supporting information where practicable.',
        nextKey(),
      ),
    )
  } else if (tier === 'managed') {
    paragraphs.push(
      body(`Utilities for this Managed tenancy are charged as disclosed for the property: ${desc}`, nextKey()),
    )
    if (disclosure) paragraphs.push(body(disclosure, nextKey()))
    paragraphs.push(
      body(
        'Rent is not calculated on an all-inclusive utilities basis for this tenancy. The tenant must pay utility charges they are responsible for as set out above (and on the prescribed agreement where applicable).',
        nextKey(),
      ),
    )
  } else {
    paragraphs.push(
      body(
        props.billsIncluded || props.allInclusive
          ? `Utilities for this listing tenancy are as disclosed for the property: ${desc}`
          : `The tenant is responsible for utility charges as disclosed for this property: ${desc}`,
        nextKey(),
      ),
    )
    if (disclosure) paragraphs.push(body(disclosure, nextKey()))
  }

  paragraphs.push(
    body(
      'Where internet is included, connection or resumption of service may depend on supplier processes. The tenant must not reconfigure network equipment in a way that could impair other occupants or security devices. Personal streaming, gaming, or study use within ordinary household norms is expected; commercial server hosting or resale of bandwidth is not permitted unless agreed in writing.',
      nextKey(),
    ),
  )

  return (
    <View style={{ marginBottom: 10 }}>
      <OccupancyMatchSectionHeading num={5} title="Utilities & bills" />
      {paragraphs}
    </View>
  )
}
