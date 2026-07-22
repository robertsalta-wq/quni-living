import { useState } from 'react'
import { FileText } from 'lucide-react'
import type { Database } from '../../../lib/database.types'
import { formatDate } from '../../../pages/admin/adminUi'
import {
  parseCoTenantSnapshot,
  parseRentBreakdownAud,
  formatOccupantCountLabel,
} from '../../../lib/pricing/bookingOccupancySnapshot'
import {
  resolveBookingReviewHoldNote,
  resolveBookingReviewHoldRow,
  resolveBookingReviewRentBreakdownRows,
} from '../../../lib/booking/bookingReviewTermsSummary'
import LandlordBookingTermsEditor from '../../landlord/LandlordBookingTermsEditor'
import LandlordBookingAgreedRentEditor from '../../landlord/LandlordBookingAgreedRentEditor'
import { resolveBookingReviewTermsEditorMode } from '../../../lib/booking/bookingReviewTermsEditorMode'

type BookingRow = Database['public']['Tables']['bookings']['Row']

export type BookingReviewTermsRailProps = {
  booking: BookingRow
  propertyBondWeeks: number | null
  tier: 'listing' | 'managed'
  /** Resolved bond figure for display (property default or booking override). */
  bondDisplayAud: number | null
  serviceTierTitle: string
  leaseHolderName: string
  /** True on expired / cancelled / declined shells — hides Edit entirely. */
  inputsDisabled: boolean
  onSaved: () => void
}

function fmtAud(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return 'No bond'
  return `$${Number(n).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

/**
 * Zone 3 rail — "Terms" card. Landlord-only. Edit opens a modal (the editor forms are too wide
 * for the 356px rail); summary + disclosure render inline. HTML visual SoT ~1217-1269.
 */
export default function BookingReviewTermsRail({
  booking,
  propertyBondWeeks,
  tier,
  bondDisplayAud,
  serviceTierTitle,
  leaseHolderName,
  inputsDisabled,
  onSaved,
}: BookingReviewTermsRailProps) {
  const [detailOpen, setDetailOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)

  const weeklyRentAud = booking.weekly_rent != null ? Number(booking.weekly_rent) : null
  const moveIn = (booking.move_in_date || booking.start_date || '').slice(0, 10)
  const breakdown = parseRentBreakdownAud(booking.rent_breakdown)
  const coTenant = parseCoTenantSnapshot(booking.co_tenant)

  const editorMode = resolveBookingReviewTermsEditorMode({
    status: booking.status,
    serviceTierAtRequest: booking.service_tier_at_request,
    serviceTierFinal: booking.service_tier_final,
    rentBreakdown: booking.rent_breakdown,
    inputsDisabled,
  })
  const canEdit = editorMode !== 'none'

  const holdRow = resolveBookingReviewHoldRow({
    tier,
    status: booking.status,
    depositAmountCents: booking.deposit_amount ?? null,
    depositReleasedAt: booking.deposit_released_at ?? null,
  })
  const holdNote = resolveBookingReviewHoldNote({
    tier,
    status: booking.status,
    depositAmountCents: booking.deposit_amount ?? null,
    depositReleasedAt: booking.deposit_released_at ?? null,
  })
  const breakdownRows = resolveBookingReviewRentBreakdownRows({
    weeklyRentAud,
    breakdown,
    parkingSelected: booking.parking_selected,
  })

  const handleSaved = () => {
    onSaved()
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-admin-md bg-admin-coral-tint text-admin-coral [&_svg]:h-[18px] [&_svg]:w-[18px]">
            <FileText />
          </span>
          <span className="text-[15px] font-semibold text-admin-ink">Terms</span>
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="shrink-0 text-[13px] font-semibold text-admin-coral hover:text-admin-coral-hover"
          >
            Edit
          </button>
        ) : null}
      </div>

      <div className="flex flex-col">
        <div className="flex items-baseline justify-between gap-3 border-b border-admin-line-soft py-2">
          <span className="text-[13px] text-admin-ink-4">Rent</span>
          <span className="text-right text-sm font-semibold text-admin-ink">
            {weeklyRentAud != null ? fmtAud(weeklyRentAud) : '-'}{' '}
            {weeklyRentAud != null ? <span className="text-xs font-medium text-admin-ink-5">/wk</span> : null}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-b border-admin-line-soft py-2">
          <span className="text-[13px] text-admin-ink-4">Bond</span>
          <span className="text-sm font-semibold text-admin-ink">{fmtAud(bondDisplayAud)}</span>
        </div>
        {holdRow.show ? (
          <div className="flex items-baseline justify-between gap-3 border-b border-admin-line-soft py-2">
            <span className="text-[13px] text-admin-ink-4">
              Quni holds
              {holdRow.caption ? <span className="mt-0.5 block text-[11px] text-admin-ink-5">{holdRow.caption}</span> : null}
            </span>
            <span className={`text-sm font-semibold ${holdRow.toneClass}`}>{holdRow.valueLabel}</span>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between gap-3 border-b border-admin-line-soft py-2">
          <span className="text-[13px] text-admin-ink-4">Move-in</span>
          <span className="text-sm font-semibold text-admin-ink">{moveIn ? formatDate(moveIn) : '-'}</span>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-b border-admin-line-soft py-2">
          <span className="text-[13px] text-admin-ink-4">Lease</span>
          <span className="text-sm font-semibold text-admin-ink">{booking.lease_length?.trim() || '-'}</span>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-b border-admin-line-soft py-2">
          <span className="text-[13px] text-admin-ink-4">Occupants</span>
          <span className="text-right text-sm font-semibold text-admin-ink">
            {formatOccupantCountLabel(booking.occupant_count)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-2">
          <span className="text-[13px] text-admin-ink-4">Service</span>
          <span className="text-right text-sm font-semibold text-admin-ink">{serviceTierTitle}</span>
        </div>
      </div>

      <div className="mt-2 border-t border-admin-line-soft pt-2.5">
        <button
          type="button"
          onClick={() => setDetailOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2.5 bg-transparent px-0 py-0.5 text-left"
        >
          <span className="text-[12.5px] font-semibold text-admin-ink-3">Rent breakdown &amp; occupants</span>
          <span
            className={`text-xs text-admin-ink-4 transition-transform ${detailOpen ? 'rotate-90' : ''}`}
            aria-hidden
          >
            ▶
          </span>
        </button>

        {detailOpen ? (
          <div className="mt-2.5 space-y-3.5">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-admin-ink-5">
                Rent breakdown
              </p>
              <div className="divide-y divide-admin-line-soft overflow-hidden rounded-admin-sm border border-admin-line-soft">
                {breakdownRows.map((row) => (
                  <div
                    key={row.key}
                    className={`flex items-baseline justify-between gap-3 px-3 py-2 ${
                      row.emphasis ? 'bg-admin-surface-2' : ''
                    }`}
                  >
                    <span
                      className={`text-xs ${
                        row.muted ? 'text-admin-ink-5' : row.emphasis ? 'font-semibold text-admin-ink' : 'text-admin-ink-4'
                      }`}
                    >
                      {row.label}
                    </span>
                    <span
                      className={`text-sm ${
                        row.muted ? 'text-admin-ink-5' : row.emphasis ? 'font-bold text-admin-ink' : 'font-medium text-admin-ink-2'
                      }`}
                    >
                      {row.valueLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-admin-ink-5">Occupants</p>
              <div className="flex items-center gap-2.5 rounded-admin-sm border border-admin-line-soft px-3 py-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-admin-navy-tint text-[10.5px] font-semibold text-admin-navy">
                  {initialsFor(leaseHolderName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-admin-ink">{leaseHolderName}</p>
                  <p className="text-[11.5px] text-admin-ink-5">
                    {coTenant ? 'Lease-holder' : 'Sole occupant · lease-holder'}
                  </p>
                </div>
              </div>
              {coTenant ? (
                <dl className="mt-2 space-y-1.5 rounded-admin-sm border border-admin-line-soft px-3 py-2.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-admin-ink-5">Co-tenant</dt>
                    <dd className="text-right font-medium text-admin-ink">{coTenant.full_name}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-admin-ink-5">Email</dt>
                    <dd className="break-all text-right font-medium text-admin-ink">{coTenant.email}</dd>
                  </div>
                  {coTenant.phone ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-admin-ink-5">Phone</dt>
                      <dd className="text-right font-medium text-admin-ink">{coTenant.phone}</dd>
                    </div>
                  ) : null}
                  {coTenant.date_of_birth ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-admin-ink-5">Date of birth</dt>
                      <dd className="text-right font-medium text-admin-ink">{formatDate(coTenant.date_of_birth)}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : (
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-admin-ink-5">
                  No co-tenant on this booking. A second occupant&rsquo;s details (name, email, phone, date of birth)
                  appear here when added.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-3 rounded-admin-sm bg-admin-surface-2 px-3 py-2.5">
        <p className="text-xs leading-relaxed text-admin-ink-4">{holdNote}</p>
      </div>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => setEditorOpen(false)}
          />
          <div className="quni-modal relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto p-1">
            <div className="flex items-center justify-between border-b border-admin-line px-5 py-4">
              <h3 className="text-base font-semibold text-admin-ink">Edit terms</h3>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                aria-label="Close"
                className="text-2xl leading-none text-admin-ink-4 hover:text-admin-ink"
              >
                ×
              </button>
            </div>
            <div className="p-5">
              {editorMode === 'listing_terms' ? (
                <LandlordBookingTermsEditor
                  bookingId={booking.id}
                  status={booking.status}
                  serviceTierAtRequest={booking.service_tier_at_request}
                  serviceTierFinal={booking.service_tier_final}
                  weeklyRent={weeklyRentAud}
                  bondAmount={booking.bond_amount != null ? Number(booking.bond_amount) : null}
                  rentBreakdown={booking.rent_breakdown}
                  propertyBondWeeks={propertyBondWeeks}
                  moveInDate={booking.move_in_date}
                  startDate={booking.start_date}
                  leaseLength={booking.lease_length}
                  occupantCount={booking.occupant_count}
                  notes={booking.notes}
                  coTenant={coTenant}
                  onSaved={handleSaved}
                  embedded
                />
              ) : (
                <LandlordBookingAgreedRentEditor
                  bookingId={booking.id}
                  status={booking.status}
                  weeklyRent={weeklyRentAud}
                  bondAmount={booking.bond_amount != null ? Number(booking.bond_amount) : null}
                  rentBreakdown={booking.rent_breakdown}
                  propertyBondWeeks={propertyBondWeeks}
                  serviceTierAtRequest={booking.service_tier_at_request}
                  onSaved={handleSaved}
                  embedded
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
