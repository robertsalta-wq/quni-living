import type { RentBreakdownAud } from '../../lib/pricing'
import { AUDateField } from '../AUDateField'

export type CoTenantFormState = {
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
}

type Props = {
  maxOccupants: number
  parkingAvailable: boolean
  occupantCount: 1 | 2
  onOccupantCountChange: (n: 1 | 2) => void
  parkingSelected: boolean
  onParkingSelectedChange: (v: boolean) => void
  coTenant: CoTenantFormState
  onCoTenantChange: (patch: Partial<CoTenantFormState>) => void
  coTenantEmailWarning: boolean
  studentEmail: string | null
  breakdownAud: RentBreakdownAud
  weeklyRent: number
  occupancyError: string | null
  inputClass: string
  labelClass: string
  onFieldFocus?: (el: HTMLElement) => void
}

export function validateBookingOccupancy(opts: {
  maxOccupants: number
  occupantCount: 1 | 2
  parkingSelected: boolean
  parkingAvailable: boolean
  coTenant: CoTenantFormState
  /** Primary tenant email — co-tenant must differ for separate DocuSeal signatures. */
  primaryTenantEmail?: string | null
}): string | null {
  if (opts.occupantCount > opts.maxOccupants) {
    return opts.maxOccupants === 1
      ? 'This listing is for one occupant only.'
      : `This listing allows at most ${opts.maxOccupants} occupants.`
  }
  if (opts.parkingSelected && !opts.parkingAvailable) {
    return 'Parking is not available on this listing.'
  }
  if (opts.occupantCount === 2) {
    if (opts.coTenant.fullName.trim().length < 2) return 'Please enter your co-tenant’s full name.'
    const email = opts.coTenant.email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email for your co-tenant.'
    const primary = (opts.primaryTenantEmail ?? '').trim().toLowerCase()
    if (primary && email.toLowerCase() === primary) {
      return 'Your co-tenant must use a different email from yours so each of you can sign the lease separately.'
    }
    if (opts.coTenant.phone.trim().length < 6) return 'Please enter a phone number for your co-tenant.'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.coTenant.dateOfBirth.trim())) {
      return 'Please enter your co-tenant’s date of birth (YYYY-MM-DD).'
    }
  }
  return null
}

export function BookingOccupancySection({
  maxOccupants,
  parkingAvailable,
  occupantCount,
  onOccupantCountChange,
  parkingSelected,
  onParkingSelectedChange,
  coTenant,
  onCoTenantChange,
  coTenantEmailWarning,
  studentEmail,
  breakdownAud,
  weeklyRent,
  occupancyError,
  inputClass,
  labelClass,
  onFieldFocus,
}: Props) {
  const coupleAllowed = maxOccupants >= 2
  const fmt = (n: number) => n.toLocaleString('en-AU', { maximumFractionDigits: 0 })

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-5">
      <div>
        <h2 className="text-sm font-bold text-gray-900">Who will be living here?</h2>
        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
          This sets your weekly rent and who appears on the lease. You can change it until you pay the deposit.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="sr-only">Number of occupants</legend>
        <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-stone-200 px-4 py-3 has-[:checked]:border-[#FF6F61] has-[:checked]:bg-[#FF6F61]/5">
          <input
            type="radio"
            name="bk-occupants"
            checked={occupantCount === 1}
            onChange={() => onOccupantCountChange(1)}
            className="h-4 w-4 accent-[#FF6F61]"
          />
          <span className="text-sm font-medium text-gray-900">Just me (1 person)</span>
        </label>
        <label
          className={`flex items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 ${
            coupleAllowed ? 'cursor-pointer has-[:checked]:border-[#FF6F61] has-[:checked]:bg-[#FF6F61]/5' : 'opacity-50 cursor-not-allowed'
          }`}
        >
          <input
            type="radio"
            name="bk-occupants"
            checked={occupantCount === 2}
            disabled={!coupleAllowed}
            onChange={() => onOccupantCountChange(2)}
            className="h-4 w-4 accent-[#FF6F61] disabled:cursor-not-allowed"
          />
          <span className="text-sm font-medium text-gray-900">Two of us (2 people)</span>
        </label>
      </fieldset>

      {occupantCount === 2 ? (
        <div className="space-y-3 pt-1 border-t border-stone-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Co-tenant details</p>
          <div>
            <label htmlFor="bk-co-name" className={labelClass}>
              Full name
            </label>
            <input
              id="bk-co-name"
              type="text"
              autoComplete="name"
              value={coTenant.fullName}
              onChange={(e) => onCoTenantChange({ fullName: e.target.value })}
              onFocus={(e) => onFieldFocus?.(e.target)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="bk-co-email" className={labelClass}>
              Email
            </label>
            <input
              id="bk-co-email"
              type="email"
              autoComplete="email"
              value={coTenant.email}
              onChange={(e) => onCoTenantChange({ email: e.target.value })}
              onFocus={(e) => onFieldFocus?.(e.target)}
              className={inputClass}
            />
            {coTenantEmailWarning && studentEmail ? (
              <p className="mt-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                This matches your account email ({studentEmail}). Your partner may not receive a separate copy of
                signing emails until we add a second signer.
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="bk-co-phone" className={labelClass}>
              Phone
            </label>
            <input
              id="bk-co-phone"
              type="tel"
              autoComplete="tel"
              value={coTenant.phone}
              onChange={(e) => onCoTenantChange({ phone: e.target.value })}
              onFocus={(e) => onFieldFocus?.(e.target)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="bk-co-dob" className={labelClass}>
              Date of birth
            </label>
            <AUDateField
              id="bk-co-dob"
              value={coTenant.dateOfBirth}
              onChange={(iso) => onCoTenantChange({ dateOfBirth: iso })}
              onFocus={(e) => onFieldFocus?.(e.target)}
              className={inputClass}
            />
          </div>
        </div>
      ) : null}

      {parkingAvailable ? (
        <label className="flex items-start gap-3 cursor-pointer pt-1 border-t border-stone-100">
          <input
            type="checkbox"
            checked={parkingSelected}
            onChange={(e) => onParkingSelectedChange(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 accent-[#FF6F61]"
          />
          <span className="text-sm text-gray-800">
            <span className="font-semibold text-gray-900">Include carpark</span>
            {breakdownAud.parking != null && breakdownAud.parking > 0 ? (
              <span className="text-gray-600"> (+${fmt(breakdownAud.parking)}/week)</span>
            ) : null}
          </span>
        </label>
      ) : null}

      <div className="rounded-xl bg-stone-50 border border-stone-100 px-4 py-3 space-y-1.5 text-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Weekly rent summary</p>
        <div className="flex justify-between">
          <span className="text-gray-600">Base rent</span>
          <span className="tabular-nums font-medium">${fmt(breakdownAud.base)}</span>
        </div>
        {breakdownAud.couple != null && breakdownAud.couple > 0 ? (
          <div className="flex justify-between">
            <span className="text-gray-600">Second person</span>
            <span className="tabular-nums font-medium">+${fmt(breakdownAud.couple)}</span>
          </div>
        ) : null}
        {breakdownAud.parking != null && breakdownAud.parking > 0 && parkingSelected ? (
          <div className="flex justify-between">
            <span className="text-gray-600">Carpark</span>
            <span className="tabular-nums font-medium">+${fmt(breakdownAud.parking)}</span>
          </div>
        ) : null}
        <div className="flex justify-between pt-1.5 border-t border-stone-200 font-semibold text-gray-900">
          <span>Total per week</span>
          <span className="tabular-nums">${fmt(weeklyRent)}</span>
        </div>
      </div>

      {occupancyError ? (
        <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          {occupancyError}
        </p>
      ) : null}
    </div>
  )
}
