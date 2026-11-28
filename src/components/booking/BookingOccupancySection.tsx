import {
  VIC_ROOMING_RESIDENT_2_EMAIL_REQUIRED,
  VIC_ROOMING_RESIDENT_EMAIL_REQUIRED,
} from '../../../api/lib/tenancy/vicRoomingHouse'
import type { ListingLettingOption, LettingChoice } from '../../lib/lettingChoice'
import type { RentBreakdownAud } from '../../lib/pricing'
import { AUDateField } from '../AUDateField'

export type CoTenantFormState = {
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
  acceptsElectronicService: boolean | null
}

type Props = {
  maxOccupants: number
  parkingAvailable: boolean
  occupantCount: 1 | 2
  onOccupantCountChange: (n: 1 | 2) => void
  /** When set, these choices replace the occupant stepper. Shared rooms leave this empty. */
  lettingOptions?: ListingLettingOption[]
  lettingChoice?: LettingChoice
  onLettingChoiceChange?: (choice: LettingChoice) => void
  parkingSelected: boolean
  onParkingSelectedChange: (v: boolean) => void
  coTenant: CoTenantFormState
  onCoTenantChange: (patch: Partial<CoTenantFormState>) => void
  coTenantEmailWarning: boolean
  studentEmail: string | null
  showElectronicService?: boolean
  residentAcceptsElectronicService?: boolean | null
  onResidentAcceptsElectronicService?: (value: boolean) => void
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
  /** Primary tenant email - co-tenant must differ for separate DocuSeal signatures. */
  primaryTenantEmail?: string | null
  showElectronicService?: boolean
  residentAcceptsElectronicService?: boolean | null
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
    if (opts.showElectronicService && opts.coTenant.acceptsElectronicService == null) {
      return VIC_ROOMING_RESIDENT_2_EMAIL_REQUIRED
    }
  }
  if (
    opts.showElectronicService &&
    opts.residentAcceptsElectronicService !== true &&
    opts.residentAcceptsElectronicService !== false
  ) {
    return VIC_ROOMING_RESIDENT_EMAIL_REQUIRED
  }
  return null
}

export function BookingOccupancySection({
  maxOccupants,
  parkingAvailable,
  occupantCount,
  onOccupantCountChange,
  lettingOptions,
  lettingChoice,
  onLettingChoiceChange,
  parkingSelected,
  onParkingSelectedChange,
  coTenant,
  onCoTenantChange,
  coTenantEmailWarning,
  studentEmail,
  showElectronicService = false,
  residentAcceptsElectronicService = null,
  onResidentAcceptsElectronicService,
  breakdownAud,
  weeklyRent,
  occupancyError,
  inputClass,
  labelClass,
  onFieldFocus,
}: Props) {
  const coupleAllowed = maxOccupants >= 2
  const fmt = (n: number) => n.toLocaleString('en-AU', { maximumFractionDigits: 0 })
  const lettingMode = (lettingOptions?.length ?? 0) > 0

  return (
    <div className="rounded-admin-lg border border-admin-line-soft bg-white p-5 space-y-5">
      <div>
        <h2 className="text-sm font-bold text-admin-ink">
          {lettingMode ? 'How will you rent this room?' : 'Who will be living here?'}
        </h2>
        <p className="text-xs text-admin-ink-4 mt-1 leading-relaxed">
          {lettingMode
            ? 'This is the weekly rent on the agreement. You can change it until you send the request.'
            : 'This sets your weekly rent and who appears on the lease. You can change it until you pay the deposit.'}
        </p>
      </div>

      {lettingMode ? (
        <fieldset className="space-y-2">
          <legend className="sr-only">How you will rent this room</legend>
          {lettingOptions!.map((option) => (
            <label
              key={option.choice}
              className="flex items-center justify-between gap-3 cursor-pointer rounded-admin-md border border-admin-line px-4 py-3 has-[:checked]:border-admin-coral has-[:checked]:bg-admin-coral/5"
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="bk-letting-choice"
                  checked={lettingChoice === option.choice}
                  onChange={() => onLettingChoiceChange?.(option.choice)}
                  className="h-4 w-4 accent-admin-coral"
                />
                <span className="text-sm font-medium text-admin-ink">{option.label}</span>
              </span>
              <span className="text-sm font-semibold text-admin-ink tabular-nums">
                ${fmt(option.weeklyRent)}
                <span className="font-medium text-admin-ink-4"> / week</span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : (
      <fieldset className="space-y-2">
        <legend className="sr-only">Number of occupants</legend>
        <label className="flex items-center gap-3 cursor-pointer rounded-admin-md border border-admin-line px-4 py-3 has-[:checked]:border-admin-coral has-[:checked]:bg-admin-coral/5">
          <input
            type="radio"
            name="bk-occupants"
            checked={occupantCount === 1}
            onChange={() => onOccupantCountChange(1)}
            className="h-4 w-4 accent-admin-coral"
          />
          <span className="text-sm font-medium text-admin-ink">Just me (1 person)</span>
        </label>
        <label
          className={`flex items-center gap-3 rounded-admin-md border border-admin-line px-4 py-3 ${
            coupleAllowed ? 'cursor-pointer has-[:checked]:border-admin-coral has-[:checked]:bg-admin-coral/5' : 'opacity-50 cursor-not-allowed'
          }`}
        >
          <input
            type="radio"
            name="bk-occupants"
            checked={occupantCount === 2}
            disabled={!coupleAllowed}
            onChange={() => onOccupantCountChange(2)}
            className="h-4 w-4 accent-admin-coral disabled:cursor-not-allowed"
          />
          <span className="text-sm font-medium text-admin-ink">Two of us (2 people)</span>
        </label>
      </fieldset>
      )}

      {showElectronicService ? (
        <ElectronicServiceQuestion
          legend="Can Quni and the operator email you notices and other documents?"
          name="bk-resident-electronic-service"
          value={residentAcceptsElectronicService}
          onChange={(value) => onResidentAcceptsElectronicService?.(value)}
        />
      ) : null}

      {occupantCount === 2 ? (
        <div className="space-y-3 pt-1 border-t border-admin-line-soft">
          <p className="text-xs font-semibold text-admin-ink-5 uppercase tracking-wide">
            {lettingMode ? 'Second resident' : 'Co-tenant details'}
          </p>
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
              <p className="mt-1.5 text-xs text-admin-warning-fg bg-admin-warning-bg border border-admin-warning rounded-admin-sm px-3 py-2">
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
              <span className="block text-xs font-normal text-admin-ink-5 mt-0.5">
                Australian format: day / month / year
              </span>
            </label>
            <AUDateField
              id="bk-co-dob"
              birthDate
              value={coTenant.dateOfBirth}
              onChange={(iso) => onCoTenantChange({ dateOfBirth: iso })}
              onFocus={(e) => onFieldFocus?.(e.target)}
              className={inputClass}
            />
          </div>
          {showElectronicService ? (
            <ElectronicServiceQuestion
              legend="Can Quni and the operator email the second resident notices and other documents?"
              name="bk-resident-2-electronic-service"
              value={coTenant.acceptsElectronicService}
              onChange={(value) => onCoTenantChange({ acceptsElectronicService: value })}
            />
          ) : null}
        </div>
      ) : null}

      {parkingAvailable ? (
        <label className="flex items-start gap-3 cursor-pointer pt-1 border-t border-admin-line-soft">
          <input
            type="checkbox"
            checked={parkingSelected}
            onChange={(e) => onParkingSelectedChange(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-admin-line accent-admin-coral"
          />
          <span className="text-sm text-admin-ink-2">
            <span className="font-semibold text-admin-ink">Include carpark</span>
            {breakdownAud.parking != null && breakdownAud.parking > 0 ? (
              <span className="text-admin-ink-4"> (+${fmt(breakdownAud.parking)}/week)</span>
            ) : null}
          </span>
        </label>
      ) : null}

      <div className="rounded-admin-md bg-admin-surface-2 border border-admin-line-soft px-4 py-3 space-y-1.5 text-sm">
        <p className="text-xs font-semibold text-admin-ink-5 uppercase tracking-wide">Weekly rent summary</p>
        <div className="flex justify-between">
          <span className="text-admin-ink-4">Base rent</span>
          <span className="tabular-nums font-medium">${fmt(breakdownAud.base)}</span>
        </div>
        {breakdownAud.couple != null && breakdownAud.couple > 0 ? (
          <div className="flex justify-between">
            <span className="text-admin-ink-4">Second person</span>
            <span className="tabular-nums font-medium">+${fmt(breakdownAud.couple)}</span>
          </div>
        ) : null}
        {breakdownAud.parking != null && breakdownAud.parking > 0 && parkingSelected ? (
          <div className="flex justify-between">
            <span className="text-admin-ink-4">Carpark</span>
            <span className="tabular-nums font-medium">+${fmt(breakdownAud.parking)}</span>
          </div>
        ) : null}
        <div className="flex justify-between pt-1.5 border-t border-admin-line font-semibold text-admin-ink">
          <span>Total per week</span>
          <span className="tabular-nums">${fmt(weeklyRent)}</span>
        </div>
      </div>

      {occupancyError ? (
        <p className="text-sm text-admin-danger-fg bg-admin-danger-bg border border-admin-danger rounded-admin-sm px-3 py-2" role="alert">
          {occupancyError}
        </p>
      ) : null}
    </div>
  )
}

function ElectronicServiceQuestion({
  legend,
  name,
  value,
  onChange,
}: {
  legend: string
  name: string
  value: boolean | null
  onChange: (value: boolean) => void
}) {
  return (
    <fieldset className="space-y-2 pt-1 border-t border-admin-line-soft">
      <legend className="text-sm font-semibold text-admin-ink">{legend}</legend>
      <p className="text-xs text-admin-ink-4">Printed on the resident's agreement.</p>
      <label className="flex items-center gap-2 text-sm text-admin-ink">
        <input type="radio" name={name} checked={value === true} onChange={() => onChange(true)} />
        Yes
      </label>
      <label className="flex items-center gap-2 text-sm text-admin-ink">
        <input type="radio" name={name} checked={value === false} onChange={() => onChange(false)} />
        No
      </label>
    </fieldset>
  )
}
