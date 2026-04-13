import type { ReactNode } from 'react'
import { Document, Page, Text, View } from '@react-pdf/renderer'
import type { QuniPlatformAddendumProps } from '../../../api/documents/rtaTypes.js'
import {
  OccupancyMatchFixedHeader,
  OccupancyMatchFooter,
  OccupancyMatchScheduleTable,
  OccupancyMatchSectionHeading,
  occupancyMatchPdf,
} from './quniDocumentPdfTheme.js'

const QUNI_MAINTENANCE_PORTAL_URL = 'https://quni.com.au/maintenance'
const QUNI_MOVE_OUT_FORM_URL = 'https://quni.com.au/move-out'

function formatMoney(n: number) {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}

function formatAuDate(iso: string) {
  const d = iso.slice(0, 10)
  const parts = d.split('-')
  if (parts.length !== 3) return iso
  const [y, m, day] = parts
  if (!y || !m || !day) return iso
  return `${day}/${m}/${y}`
}

function yn(v: boolean | null) {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  return '—'
}

function formatBsbDisplay(raw: string) {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return raw.trim()
}

/** Section 1 — Tenancy summary (two-column schedule table). */
function Section1TenancySummary(props: QuniPlatformAddendumProps) {
  const { landlord, tenant, premises, term, rent, bond, utilitiesDescription } = props

  const landlordDisplay = landlord.companyName
    ? `${landlord.fullName} (${landlord.companyName})`
    : landlord.fullName

  const endDateText =
    term.periodic || !term.endDate ? 'Periodic tenancy (no fixed end date)' : formatAuDate(term.endDate)

  const bondText =
    bond.amount != null && Number.isFinite(bond.amount) ? formatMoney(bond.amount) : '—'

  const rows: { label: string; value: ReactNode }[] = [
    { label: 'Property address:', value: premises.addressLine },
    { label: 'Room type:', value: premises.roomType?.trim() || '—' },
    { label: 'Landlord:', value: landlordDisplay },
    { label: 'Landlord email:', value: landlord.email },
    { label: 'Landlord phone:', value: landlord.phone },
    { label: 'Tenant:', value: tenant.fullName },
    { label: 'Tenant email:', value: tenant.email },
    { label: 'Tenant phone:', value: tenant.phone },
  ]

  if (tenant.dateOfBirth) {
    rows.push({ label: 'Tenant date of birth:', value: formatAuDate(tenant.dateOfBirth) })
  }

  rows.push(
    { label: 'Tenancy start date:', value: formatAuDate(term.startDate) },
    { label: 'Tenancy end date:', value: endDateText },
    { label: 'Lease length:', value: term.leaseLengthDescription },
    { label: 'Weekly rent:', value: formatMoney(rent.weeklyRent) },
    { label: 'Payment method (as stated in the agreement):', value: rent.paymentMethod },
    { label: 'Bond amount:', value: bondText },
    { label: 'Furnished:', value: yn(premises.furnished) },
    { label: 'Linen supplied:', value: yn(premises.linenSupplied) },
    { label: 'Weekly cleaning service:', value: yn(premises.weeklyCleaningService) },
    {
      label: 'Utilities / services (summary):',
      value: utilitiesDescription.trim() || '—',
    },
  )

  return (
    <View style={{ marginTop: 4, marginBottom: 10 }}>
      <OccupancyMatchSectionHeading num={1} title="Tenancy summary" />
      <OccupancyMatchScheduleTable rows={rows} />
    </View>
  )
}

/** Section 2 — Quni platform & service fee. */
function Section2QuniPlatformAndFee(props: QuniPlatformAddendumProps) {
  const { rent, rentPaymentMethod, bankDetails } = props
  const bsb = formatBsbDisplay(bankDetails.bsb.trim())
  const acct = bankDetails.accountNumber.trim()
  const name = bankDetails.accountName.trim()
  const bankName = bankDetails.bankName.trim()

  const bankRows: { label: string; value: string }[] = [
    { label: 'Account name:', value: name || '—' },
    { label: 'BSB:', value: bsb || '—' },
    { label: 'Account number:', value: acct || '—' },
    { label: 'Bank:', value: bankName || '—' },
  ]

  const cardDomestic = '1.7% + $0.30 per transaction (domestic cards)'
  const cardInternational = '3.5% + $0.30 per transaction (international cards)'

  return (
    <View style={{ marginBottom: 10 }}>
      <OccupancyMatchSectionHeading num={2} title="Quni platform & service fee" />

      <Text style={occupancyMatchPdf.bodyParagraph}>
        Quni Living Pty Ltd (the &quot;Platform&quot;) operates an online marketplace and payment facilitation
        service. The Platform is not the landlord, property manager, or agent for the residential premises unless
        separately appointed in writing. The landlord remains responsible for managing the tenancy and the premises
        in accordance with the Residential Tenancies Act 2010 (NSW) and the standard form agreement.
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        A service fee of 10% of the gross weekly rent is deducted from amounts payable to the landlord through the
        Platform before payout to the landlord, as disclosed in the landlord service agreement and listing terms.
        The tenant&apos;s agreed weekly rent is not increased by this fee.
      </Text>

      <Text style={[occupancyMatchPdf.bodyParagraph, { marginTop: 6 }]}>
        Rent is payable by direct bank transfer using the following account details (reference your name and the
        property address when transferring):
      </Text>

      <OccupancyMatchScheduleTable rows={bankRows.map((r) => ({ label: r.label, value: r.value }))} />

      {rentPaymentMethod === 'quni_platform' ? (
        <View style={[occupancyMatchPdf.noteBox, { marginTop: 6 }]}>
          <Text style={occupancyMatchPdf.noteItalicMuted}>
            The tenant has elected (where available) to pay recurring rent via card through the Quni platform. Card
            payments incur a payment processing surcharge passed through at Stripe&apos;s actual cost — typically{' '}
            {cardDomestic}, or {cardInternational}. The agreed rent amount is unchanged; the surcharge is shown
            separately at checkout.
          </Text>
        </View>
      ) : null}

      <Text style={[occupancyMatchPdf.bodyParagraph, { marginTop: 6 }]}>
        A fee-free bank transfer option remains available at all times for recurring rent in accordance with the
        Residential Tenancies Act 2010 (NSW) (including section 35 where applicable).
      </Text>

      <Text style={[occupancyMatchPdf.bodyParagraph, { marginTop: 4 }]}>
        The payment method summary in the tenancy agreement (Section 1 above) remains part of the agreed rent
        arrangements: {rent.paymentMethod}
      </Text>
    </View>
  )
}

/** Section 3 — Communication channels. */
function Section3CommunicationChannels(props: QuniPlatformAddendumProps) {
  const { emergencyContact, rentEnquiriesEmail, generalEnquiriesEmail, houseCommunicationsChannel } = props

  const rows: { label: string; value: string }[] = [
    { label: 'Maintenance portal (non-urgent requests):', value: QUNI_MAINTENANCE_PORTAL_URL },
    { label: 'Emergency contact (urgent repairs):', value: emergencyContact.trim() || '—' },
    { label: 'Move-out notice form:', value: QUNI_MOVE_OUT_FORM_URL },
    { label: 'Rent account enquiries:', value: rentEnquiriesEmail.trim() || '—' },
    { label: 'General enquiries:', value: generalEnquiriesEmail.trim() || '—' },
    { label: 'House communications:', value: houseCommunicationsChannel.trim() || '—' },
  ]

  return (
    <View style={{ marginBottom: 10 }}>
      <OccupancyMatchSectionHeading num={3} title="Communication channels" />
      <Text style={[occupancyMatchPdf.bodyParagraph, { marginBottom: 6 }]}>
        The tenant should use the channels below for requests, notices and day-to-day communication. Urgent safety
        issues should be directed to the emergency contact immediately.
      </Text>
      <OccupancyMatchScheduleTable rows={rows.map((r) => ({ label: r.label, value: r.value }))} />
    </View>
  )
}

/** Section 4 — Maintenance & repairs. */
function Section4MaintenanceAndRepairs(_props: QuniPlatformAddendumProps) {
  return (
    <View style={{ marginBottom: 10 }}>
      <OccupancyMatchSectionHeading num={4} title="Maintenance & repairs" />

      <Text style={occupancyMatchPdf.bodyParagraph}>
        Non-urgent maintenance requests (for example dripping taps, minor appliance faults, or common-area cleaning
        issues) must be lodged through the maintenance portal listed in Section 3. The tenant should include a
        clear description, photos where helpful, and safe access notes.
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        Urgent repairs that affect health, safety, or security — including burst pipes, electrical hazards, gas
        smells, serious leaks, or a failure of essential services — must be reported immediately using the emergency
        contact in Section 3. If the emergency contact cannot be reached and there is an immediate risk to persons
        or property, the tenant should also follow any emergency services guidance (including 000 where appropriate).
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        The landlord (or their authorised tradesperson) will use reasonable endeavours to respond to urgent items
        without undue delay. Response times for non-urgent items depend on severity, parts availability, and access;
        the parties agree to communicate promptly through the portal where additional information is required.
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        The tenant is responsible for damage caused by the tenant, their guests, or invitees (including through misuse,
        negligence, or failure to report issues promptly). Fair wear and tear is excluded. Where damage is tenant
        caused, the landlord may seek reimbursement in accordance with the Residential Tenancies Act 2010 (NSW) and
        the standard form agreement, including via bond claim processes where applicable.
      </Text>
    </View>
  )
}

/** Section 5 — Utilities & bills. */
function Section5UtilitiesAndBills(props: QuniPlatformAddendumProps) {
  return (
    <View style={{ marginBottom: 10 }}>
      <OccupancyMatchSectionHeading num={5} title="Utilities & bills" />

      <Text style={occupancyMatchPdf.bodyParagraph}>
        Rent is calculated on an all-inclusive basis covering {props.utilitiesDescription.toLowerCase()}.
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        A utilities allowance of {formatMoney(props.utilitiesCap)} per quarter applies. Usage within this allowance is
        included in rent.
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        Usage in excess of the quarterly allowance must be paid by the tenant within 14 days of invoice (or as
        otherwise agreed in writing). Evidence of usage may be supplied as utility account summaries, meter readings,
        or other reasonable records consistent with how similar properties are typically managed through the platform.
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        The tenant must not deliberately waste utilities or circumvent metering. Where excessive usage is clearly
        tenant-caused, the landlord may request reimbursement in addition to any excess-usage amount, acting reasonably
        and with supporting information where practicable.
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        Where internet is included, connection or resumption of service may depend on supplier processes. The tenant must
        not reconfigure network equipment in a way that could impair other occupants or security devices. Personal
        streaming, gaming, or study use within ordinary household norms is expected; commercial server hosting or resale
        of bandwidth is not permitted unless agreed in writing.
      </Text>
    </View>
  )
}

/** Section 6 — House rules. */
function Section6HouseRules(props: QuniPlatformAddendumProps) {
  const text = (props.houseRules ?? '').trim()
  if (!text) return null

  const blocks = text.split(/\n{2,}/)

  return (
    <View style={{ marginBottom: 10 }}>
      <OccupancyMatchSectionHeading num={6} title="House rules" />

      {blocks.map((block, i) => {
        const lines = block.split('\n')
        const first = (lines[0] ?? '').trim()
        const looksLikeCapsHeading =
          first.length > 0 &&
          first.length <= 72 &&
          first === first.toUpperCase() &&
          /^[A-Z0-9][A-Z0-9 &,.()/\-]+$/.test(first)
        const rest = looksLikeCapsHeading ? lines.slice(1).join('\n').trim() : block.trim()

        return (
          <View key={i} wrap={false} style={{ marginBottom: 6 }}>
            {looksLikeCapsHeading ? (
              <Text style={occupancyMatchPdf.clauseSectionCaps}>{first}</Text>
            ) : null}
            {rest ? (
              <Text style={occupancyMatchPdf.bodyParagraph}>{rest}</Text>
            ) : looksLikeCapsHeading ? null : (
              <Text style={occupancyMatchPdf.bodyParagraph}>{block.trim()}</Text>
            )}
          </View>
        )
      })}
    </View>
  )
}

/** Section 7 — Mould prevention. */
function Section7MouldPrevention(_props: QuniPlatformAddendumProps) {
  return (
    <View style={{ marginBottom: 10 }}>
      <OccupancyMatchSectionHeading num={7} title="Mould prevention" />

      <Text style={occupancyMatchPdf.bodyParagraph}>
        The tenant must keep the premises reasonably ventilated, including by using exhaust fans or opening windows
        when cooking, showering, or drying laundry indoors, where safe and consistent with security.
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        Condensation on windows or walls should be wiped dry promptly. The tenant must not block fixed ventilation
        grilles, subfloor vents, or weep holes, and must not store belongings or materials in a way that traps moisture
        against walls, floors, or joinery.
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        Any visible mould, persistent damp smell, water ingress, or bubbling paint or plaster must be reported through
        the maintenance portal without delay. Early reporting helps limit damage and repair cost.
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        The tenant is responsible for day-to-day cleaning of surfaces they use (including bathrooms and kitchen areas)
        in line with ordinary household standards. Where mould arises from lack of ventilation or cleaning that a
        reasonable tenant would undertake, the tenant may be responsible for remediation costs acting reasonably and
        in accordance with the Residential Tenancies Act 2010 (NSW).
      </Text>
    </View>
  )
}

/** Section 8 — Condition report. */
function Section8ConditionReport(_props: QuniPlatformAddendumProps) {
  return (
    <View style={{ marginBottom: 10 }}>
      <OccupancyMatchSectionHeading num={8} title="Condition report" />

      <Text style={occupancyMatchPdf.bodyParagraph}>
        The parties acknowledge that an ingoing condition report may be prepared for the premises (or the rented part of
        the premises) in accordance with the Residential Tenancies Act 2010 (NSW) and the standard form agreement. The
        tenant will be given a reasonable opportunity to review and comment on the report and to attach photographs where
        appropriate.
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        The tenant should return a signed copy (or written comments) within the timeframe notified by the landlord or the
        platform, failing which the report may be taken as accepted except for manifest errors or items the tenant could
        not reasonably have inspected.
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        At the end of the tenancy, an outgoing condition report may be used to compare the state of the premises with the
        ingoing report, fair wear and tear excepted. The tenant should attend any scheduled inspection where practicable
        and should lodge final meter readings or other handover items through the move-out workflow when requested.
      </Text>
    </View>
  )
}

/** Section 9 — Move-out procedures. */
function Section9MoveOutProcedures(props: QuniPlatformAddendumProps) {
  const dailyRent = props.rent.weeklyRent / 7
  const feeRows: { label: string; value: string }[] = [
    {
      label: 'Cleaning (if not to standard)',
      value: '$150 per hour, minimum charge $150',
    },
    {
      label: 'Removal of personal items / rubbish left behind',
      value: '$250 per hour, minimum charge $250',
    },
    {
      label: 'Late checkout (after 10:00am on vacate date)',
      value: '$50 flat fee',
    },
    {
      label: 'Late checkout (still occupying after midnight on vacate date)',
      value: `Full day rent (${formatMoney(dailyRent)} — one-seventh of the agreed weekly rent)`,
    },
    {
      label: 'Linen replacement if significantly damaged',
      value: 'Replacement cost (charged at actual cost)',
    },
    {
      label: 'International bank transfer administration (bond refund)',
      value: '$50 flat fee',
    },
  ]

  return (
    <View style={{ marginBottom: 10 }}>
      <OccupancyMatchSectionHeading num={9} title="Move-out procedures" />

      <Text style={occupancyMatchPdf.bodyParagraph}>
        To end the tenancy, the tenant must give notice in accordance with the Residential Tenancies Act 2010 (NSW), the
        standard form agreement, and any agreed notice period. Where the platform collects a move-out notice, the tenant
        should complete the move-out notice form at {QUNI_MOVE_OUT_FORM_URL} and keep a copy of any confirmation received.
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        Unless otherwise agreed in writing, the tenant must vacate and return possession by{' '}
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>10:00am</Text> on the agreed vacate date. If the tenant remains
        after 10:00am, a <Text style={{ fontFamily: 'Helvetica-Bold' }}>$50</Text> late checkout flat fee applies. If the
        tenant is still occupying the room after midnight on the vacate date, the tenant agrees that{' '}
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>full day rent</Text> applies for that day, calculated as one
        day&apos;s rent (one-seventh of the agreed weekly rent), currently {formatMoney(dailyRent)} per day, in addition
        to any other amounts lawfully payable.
      </Text>

      <Text style={[occupancyMatchPdf.bodyParagraph, { marginTop: 4, fontFamily: 'Helvetica-Bold' }]}>
        Cleaning checklist — the tenant must leave the room in the following condition:
      </Text>
      <View style={{ marginBottom: 6, paddingLeft: 4 }}>
        <Text style={occupancyMatchPdf.bodyParagraph}>
          • Vacuum and mop all floors including under bed and furniture{'\n'}• Wipe walls, skirting boards, windowsills,
          and windows{'\n'}• Clean all cupboards, drawers, and storage used by the tenant{'\n'}• Clean bathroom and toilet
          thoroughly{'\n'}• Remove all personal items from the room, bathroom, kitchen, and communal areas{'\n'}• Wash and
          return all provided linen clean{'\n'}• Ensure all light fittings have working globes{'\n'}• Remove food from the
          fridge and clean the tenant&apos;s allocated fridge space{'\n'}• Return all keys as directed
        </Text>
      </View>

      <Text style={[occupancyMatchPdf.bodyParagraph, { marginTop: 4, fontFamily: 'Helvetica-Bold' }]}>
        Fee schedule (indicative — charged where applicable and lawfully recoverable):
      </Text>
      <OccupancyMatchScheduleTable rows={feeRows.map((r) => ({ label: r.label, value: r.value }))} />

      <Text style={[occupancyMatchPdf.bodyParagraph, { marginTop: 4 }]}>
        The tenant should supply a forwarding address and contact details for bond and correspondence. Bond release (if
        applicable) will follow NSW Fair Trading requirements and any instructions given through the signing or bond
        workflow. The parties agree to cooperate promptly with reasonable requests for information needed to finalise the
        tenancy.
      </Text>
    </View>
  )
}

/** Section 10 — Bond. */
function Section10Bond(props: QuniPlatformAddendumProps) {
  const bond = props.bond.amount
  return (
    <View style={{ marginBottom: 10 }}>
      <OccupancyMatchSectionHeading num={10} title="Bond" />

      <Text style={occupancyMatchPdf.bodyParagraph}>
        Any bond paid or held for this tenancy is dealt with in accordance with the Residential Tenancies Act 2010 (NSW),
        the standard form agreement, and NSW Fair Trading requirements (including any applicable residential bond scheme
        rules).
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        The bond amount recorded in the tenancy agreement is{' '}
        {bond != null && Number.isFinite(bond) && bond > 0 ? formatMoney(bond) : 'as stated in the tenancy agreement'}. The
        parties agree to complete any bond lodgement, variation, or claim steps notified through the platform or the
        landlord&apos;s agent, and to provide accurate bank details for refunds where required.
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        Where an international bank transfer administration fee applies to a bond refund (as set out in the move-out fee
        schedule), that fee is separate from the bond amount and is payable only where applicable and lawfully
        recoverable.
      </Text>
    </View>
  )
}

/** Section 11 — Inspections & access. */
function Section11InspectionsAndAccess(_props: QuniPlatformAddendumProps) {
  const noticeRows: { purpose: string; notice: string }[] = [
    { purpose: 'Emergency repairs', notice: 'No notice required' },
    { purpose: 'Non-urgent repairs', notice: '24 hours' },
    {
      purpose: 'Routine inspection',
      notice: '7 days written notice (maximum 4 per year)',
    },
    {
      purpose: 'Show premises to prospective tenant',
      notice: '24 hours (last 14 days of agreement only)',
    },
    {
      purpose: 'Property valuation',
      notice: '7 days (maximum 1 per year)',
    },
  ]

  return (
    <View style={{ marginBottom: 10 }}>
      <OccupancyMatchSectionHeading num={11} title="Inspections & access" />

      <Text style={occupancyMatchPdf.bodyParagraph}>
        The landlord (or their authorised agent) may enter the premises to carry out inspections, repairs, maintenance, or
        compliance activities in accordance with the Residential Tenancies Act 2010 (NSW) and the standard form
        agreement, including the rules about notice and reasonable grounds.
      </Text>

      <View style={[occupancyMatchPdf.tableWrap, { marginTop: 6, marginBottom: 8 }]}>
        <View style={occupancyMatchPdf.thRow}>
          <View style={occupancyMatchPdf.thCell}>
            <Text style={occupancyMatchPdf.thText}>Purpose</Text>
          </View>
          <View style={occupancyMatchPdf.thCellLast}>
            <Text style={occupancyMatchPdf.thText}>Minimum notice required</Text>
          </View>
        </View>
        {noticeRows.map((r, i) => (
          <View
            key={i}
            style={[
              occupancyMatchPdf.dataRow,
              i % 2 === 0 ? occupancyMatchPdf.dataRowA : occupancyMatchPdf.dataRowB,
            ]}
          >
            <View style={occupancyMatchPdf.dataLabelCell}>
              <Text style={occupancyMatchPdf.dataLabel}>{r.purpose}</Text>
            </View>
            <View style={occupancyMatchPdf.dataValueCell}>
              <Text style={occupancyMatchPdf.dataValueBold}>{r.notice}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        Unless an emergency applies, entry should be arranged with reasonable written notice (or as otherwise required by
        law) and at a reasonable time. The tenant should not unreasonably withhold access where entry is lawful. Where the
        tenant cannot attend, they may propose an alternative reasonable time within the constraints of tradespeople or
        scheduled works.
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        Photographs or short videos taken during lawful inspections or maintenance visits must not capture unrelated
        private areas of the tenant&apos;s room beyond what is reasonably necessary for the stated purpose. Marketing or
        listing photography should not be taken in the tenant&apos;s private room without prior agreement consistent with
        the Act and any house rules.
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        The tenant must not change locks or security devices without consent except where permitted by law. Any keys, fobs,
        or access devices issued must be returned at the end of the tenancy as directed.
      </Text>
    </View>
  )
}

/** Section 12 — Termination. */
function Section12Termination(props: QuniPlatformAddendumProps) {
  const w = props.rent.weeklyRent
  const breakRows: { elapsed: string; fee: string }[] = [
    { elapsed: 'Less than 25% of the fixed term', fee: `4 weeks rent (${formatMoney(w * 4)})` },
    { elapsed: '25% to less than 50% of the fixed term', fee: `3 weeks rent (${formatMoney(w * 3)})` },
    { elapsed: '50% to less than 75% of the fixed term', fee: `2 weeks rent (${formatMoney(w * 2)})` },
    { elapsed: '75% or more of the fixed term', fee: `1 week rent (${formatMoney(w * 1)})` },
  ]

  return (
    <View style={{ marginBottom: 10 }}>
      <OccupancyMatchSectionHeading num={12} title="Termination" />

      <Text style={occupancyMatchPdf.bodyParagraph}>
        From <Text style={{ fontFamily: 'Helvetica-Bold' }}>19 May 2025</Text>, &apos;no grounds&apos; terminations by
        landlords were abolished for most residential tenancies in NSW. This addendum does not override the Residential
        Tenancies Act 2010 (NSW) or the prescribed standard form agreement.
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>Tenant pathways (summary):</Text> end a periodic tenancy by giving
        notice in the form and for the period required by the Act and agreement; end a fixed-term tenancy at expiry by
        vacating in accordance with notice rules; leave early where permitted (for example mutual consent, an order of
        the NSW Civil and Administrative Tribunal (NCAT), hardship provisions where they apply, or a break fee if a valid
        break-fee clause applies to a qualifying fixed term).
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>Landlord pathways (summary):</Text> end a tenancy only on grounds
        and by procedures permitted by the Act (including prescribed termination notices, breach processes where
        applicable, serious non-compliance pathways, sale or demolition provisions where they apply, and tribunal orders).
        Mutual agreement to end can be recorded in writing at any time where the parties choose that path.
      </Text>

      <Text style={[occupancyMatchPdf.bodyParagraph, { marginTop: 4, fontFamily: 'Helvetica-Bold' }]}>
        Break fee (fixed-term break) — where a compliant break-fee term applies under the Act:
      </Text>
      <View style={[occupancyMatchPdf.tableWrap, { marginTop: 4, marginBottom: 6 }]}>
        <View style={occupancyMatchPdf.thRow}>
          <View style={occupancyMatchPdf.thCell}>
            <Text style={occupancyMatchPdf.thText}>Period of fixed term elapsed</Text>
          </View>
          <View style={occupancyMatchPdf.thCellLast}>
            <Text style={occupancyMatchPdf.thText}>Break fee</Text>
          </View>
        </View>
        {breakRows.map((r, i) => (
          <View
            key={i}
            style={[
              occupancyMatchPdf.dataRow,
              i % 2 === 0 ? occupancyMatchPdf.dataRowA : occupancyMatchPdf.dataRowB,
            ]}
          >
            <View style={occupancyMatchPdf.dataLabelCell}>
              <Text style={occupancyMatchPdf.dataLabel}>{r.elapsed}</Text>
            </View>
            <View style={occupancyMatchPdf.dataValueCell}>
              <Text style={occupancyMatchPdf.dataValueBold}>{r.fee}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        A break fee of this kind applies only to <Text style={{ fontFamily: 'Helvetica-Bold' }}>fixed terms of 3 years or
        less</Text> where the tenancy agreement includes a compliant break-fee clause as permitted by the Act. It does not
        apply to periodic agreements or to fixed terms longer than 3 years unless the law and the agreement expressly
        provide otherwise.
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        If anything in this addendum is inconsistent with the Residential Tenancies Act 2010 (NSW) or the standard form
        residential tenancy agreement, the <Text style={{ fontFamily: 'Helvetica-Bold' }}>Act and the standard form
        agreement prevail</Text>.
      </Text>
    </View>
  )
}

/** Section 13 — Disputes. */
function Section13Disputes(_props: QuniPlatformAddendumProps) {
  return (
    <View style={{ marginBottom: 10 }}>
      <OccupancyMatchSectionHeading num={13} title="Disputes" />

      <Text style={occupancyMatchPdf.bodyParagraph}>
        The parties should attempt to resolve disagreements about this tenancy or the use of the Quni platform directly,
        promptly, and in good faith before escalating matters.
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        Quni Living may assist with facilitation or information exchange where appropriate and where all parties agree. For
        facilitation enquiries, contact <Text style={{ fontFamily: 'Helvetica-Bold' }}>info@quni.com.au</Text>. Quni Living
        does not provide legal advice and is not a substitute for independent legal advice where needed.
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        Either party may apply to the NSW Civil and Administrative Tribunal (NCAT) for orders in accordance with the
        Residential Tenancies Act 2010 (NSW) and tribunal rules. Quni Living is{' '}
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>not a party</Text> to NCAT proceedings between the landlord and tenant
        and <Text style={{ fontFamily: 'Helvetica-Bold' }}>cannot represent</Text> either party before NCAT.
      </Text>
    </View>
  )
}

/** Section 14 — Privacy. */
function Section14Privacy(_props: QuniPlatformAddendumProps) {
  return (
    <View style={{ marginBottom: 10 }}>
      <OccupancyMatchSectionHeading num={14} title="Privacy" />

      <Text style={occupancyMatchPdf.bodyParagraph}>
        Quni Living handles personal information in accordance with the{' '}
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>Privacy Act 1988 (Cth)</Text> and applicable Australian privacy
        principles, including information collected to facilitate this tenancy and to operate the Quni platform (for example
        identity, contact, tenancy, and payment-related details where relevant).
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        You may request access to, or correction of, personal information Quni Living holds about you by writing to{' '}
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>info@quni.com.au</Text>. Further detail is set out in the privacy policy
        at <Text style={{ fontFamily: 'Helvetica-Bold' }}>https://quni.com.au/privacy</Text>.
      </Text>
    </View>
  )
}

/** Section 15 — Electronic execution. */
function Section15ElectronicExecution(_props: QuniPlatformAddendumProps) {
  return (
    <View style={{ marginBottom: 10 }}>
      <OccupancyMatchSectionHeading num={15} title="Electronic execution" />

      <Text style={occupancyMatchPdf.bodyParagraph}>
        The parties agree that this addendum may be signed electronically where permitted by the{' '}
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>Electronic Transactions Act 2000 (NSW)</Text> and other applicable
        laws. Electronic signatures have the same effect as handwritten signatures when applied through an agreed signing
        workflow.
      </Text>

      <Text style={occupancyMatchPdf.bodyParagraph}>
        Each party consents to electronic signing, including the use of signature and date fields completed through the
        DocuSeal workflow at <Text style={{ fontFamily: 'Helvetica-Bold' }}>https://sign.quni.com.au</Text>.
      </Text>
    </View>
  )
}

/** Section 16 — Special conditions. */
function Section16SpecialConditions(_props: QuniPlatformAddendumProps) {
  return (
    <View style={{ marginBottom: 10 }}>
      <OccupancyMatchSectionHeading num={16} title="Special conditions" />

      <Text style={occupancyMatchPdf.bodyParagraph}>
        No special conditions apply unless recorded below or in an attachment signed by both parties.
      </Text>

      <View
        style={{
          marginTop: 8,
          minHeight: 96,
          borderWidth: 0.75,
          borderColor: '#C4B8A8',
          borderStyle: 'dashed',
          paddingHorizontal: 10,
          paddingVertical: 8,
          backgroundColor: '#FFFFFF',
        }}
      >
        <Text style={occupancyMatchPdf.noteItalicMuted}>
          Space for typed or handwritten special conditions (if any).
        </Text>
      </View>
    </View>
  )
}

/** Section 17 — Execution (signatures). */
function Section17Execution(props: QuniPlatformAddendumProps) {
  const landlordDisplay = props.landlord.companyName
    ? `${props.landlord.fullName} (${props.landlord.companyName})`
    : props.landlord.fullName

  return (
    <View>
      <OccupancyMatchSectionHeading num={17} title="Execution" />
      <Text style={occupancyMatchPdf.bodyParagraph}>
        Signed electronically where permitted. Each party&apos;s signature and date fields below are completed through the
        signing workflow.
      </Text>
      <View style={occupancyMatchPdf.sigTable}>
        <View style={occupancyMatchPdf.sigHeaderRow}>
          <View style={occupancyMatchPdf.sigHeaderCell}>
            <Text style={occupancyMatchPdf.thText}>Landlord</Text>
          </View>
          <View style={occupancyMatchPdf.sigHeaderCellLast}>
            <Text style={occupancyMatchPdf.thText}>Tenant</Text>
          </View>
        </View>
        <View style={occupancyMatchPdf.sigBodyRow}>
          <View style={occupancyMatchPdf.sigCol}>
            <Text style={occupancyMatchPdf.sigNameBold}>{landlordDisplay}</Text>
            <View style={occupancyMatchPdf.docusealSignatureFieldBox}>
              <View style={occupancyMatchPdf.sigLabelRow}>
                <Text style={occupancyMatchPdf.sigLabel}>Signature </Text>
                <Text style={occupancyMatchPdf.docusealTagOa}>
                  {'{{Addendum Landlord Signature;role=First Party;type=signature}}'}
                </Text>
              </View>
            </View>
            <View style={occupancyMatchPdf.docusealDateFieldBox}>
              <View style={occupancyMatchPdf.sigLabelRow}>
                <Text style={occupancyMatchPdf.sigLabel}>Date </Text>
                <Text style={occupancyMatchPdf.docusealTagOa}>
                  {'{{Addendum Landlord Date;role=First Party;type=date}}'}
                </Text>
              </View>
            </View>
          </View>
          <View style={occupancyMatchPdf.sigColLast}>
            <Text style={occupancyMatchPdf.sigNameBold}>{props.tenant.fullName}</Text>
            <View style={occupancyMatchPdf.docusealSignatureFieldBox}>
              <View style={occupancyMatchPdf.sigLabelRow}>
                <Text style={occupancyMatchPdf.sigLabel}>Signature </Text>
                <Text style={occupancyMatchPdf.docusealTagOa}>
                  {'{{Addendum Tenant Signature;role=Second Party;type=signature}}'}
                </Text>
              </View>
            </View>
            <View style={occupancyMatchPdf.docusealDateFieldBox}>
              <View style={occupancyMatchPdf.sigLabelRow}>
                <Text style={occupancyMatchPdf.sigLabel}>Date </Text>
                <Text style={occupancyMatchPdf.docusealTagOa}>
                  {'{{Addendum Tenant Date;role=Second Party;type=date}}'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
      <Text style={[occupancyMatchPdf.noteItalicMuted, { marginTop: 8 }]}>
        Signatures and dates are collected using DocuSeal (https://sign.quni.com.au). DocuSeal is a third-party e-signing
        service; Quni Living does not control DocuSeal&apos;s infrastructure beyond selecting it as the signing provider for
        this package.
      </Text>
    </View>
  )
}

export function QuniPlatformAddendum(props: QuniPlatformAddendumProps) {
  const { documentId, generatedAt } = props
  return (
    <Document>
      <Page size="A4" style={occupancyMatchPdf.page}>
        <OccupancyMatchFixedHeader
          documentTitle="Platform Addendum"
          subtitle="Supplementary to the Residential Tenancy Agreement"
        />
        <OccupancyMatchFooter documentId={documentId} generatedAt={generatedAt} variant="addendum" />
        <Text style={occupancyMatchPdf.bodyParagraph}>
          This addendum records how the Quni platform is used for the tenancy described below. It is intended
          to be signed together with the prescribed residential tenancy agreement in the same package.
        </Text>
        <Section1TenancySummary {...props} />
        <Section2QuniPlatformAndFee {...props} />
        <Section3CommunicationChannels {...props} />
        <Section4MaintenanceAndRepairs {...props} />
      </Page>
      <Page size="A4" style={occupancyMatchPdf.page}>
        <OccupancyMatchFixedHeader
          documentTitle="Platform Addendum"
          subtitle="Supplementary to the Residential Tenancy Agreement"
        />
        <OccupancyMatchFooter documentId={documentId} generatedAt={generatedAt} variant="addendum" />
        <Section5UtilitiesAndBills {...props} />
        <Section6HouseRules {...props} />
        <Section7MouldPrevention {...props} />
        <Section8ConditionReport {...props} />
        <Section9MoveOutProcedures {...props} />
        <Section10Bond {...props} />
        <Section11InspectionsAndAccess {...props} />
        <Section12Termination {...props} />
        <Section13Disputes {...props} />
        <Section14Privacy {...props} />
        <Section15ElectronicExecution {...props} />
        <Section16SpecialConditions {...props} />
        <Section17Execution {...props} />
      </Page>
    </Document>
  )
}
