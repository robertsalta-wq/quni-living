import { propertyBillsIncluded } from '../../lib/propertyFeatureSignals'
import {
  CAPTURABLE_UTILITY_SERVICE_IDS,
  UTILITY_SERVICE_DISPLAY_LABELS,
  type CapturableUtilityServiceId,
} from '../../lib/propertyUtilitiesServices'
import { missingPerServiceUtilitiesFormMessages } from '../../lib/propertyUtilitiesFormValidation'
import type {
  LandlordPropertyUtilitiesFormState,
  PerServiceUtilitiesFormState,
} from '../../lib/propertyUtilitiesFormState'
import {
  WATER_SEPARATELY_METERED_ATTESTATION_BULLETS,
  WATER_SEPARATELY_METERED_ATTESTATION_FOOTER,
  WATER_SEPARATELY_METERED_ATTESTATION_INTRO,
  WATER_SEPARATELY_METERED_ATTESTATION_LABEL,
} from '../../lib/waterSeparatelyMeteredAttestation'
import { type TriState } from './LandlordPropertyFt6600ComplianceFields'
import { RequiredMark } from './RequiredMark'

export type { LandlordPropertyUtilitiesFormState, PerServiceUtilitiesFormState } from '../../lib/propertyUtilitiesFormState'
export {
  emptyLandlordPropertyUtilitiesFormState,
  landlordPropertyUtilitiesColumnsFromFormState,
  landlordPropertyUtilitiesFormStateFromProperty,
} from '../../lib/propertyUtilitiesFormState'

export function missingLandlordPropertyUtilitiesFormMessages(
  form: LandlordPropertyUtilitiesFormState,
  opts: { billsIncluded: boolean },
): string[] {
  if (opts.billsIncluded) return []
  return missingPerServiceUtilitiesFormMessages(form)
}

type YesNoFieldProps = {
  id: string
  label: string
  helperText?: string
  value: TriState
  onChange: (v: TriState) => void
  labelClass: string
}

function YesNoField({
  id,
  label,
  helperText,
  value,
  onChange,
  labelClass,
  required,
  invalid,
  errorMessage,
}: YesNoFieldProps & { required?: boolean; invalid?: boolean; errorMessage?: string | null }) {
  return (
    <div id={id} className={invalid ? 'rounded-[10px] ring-2 ring-red-600 ring-offset-2' : undefined}>
      <p className={labelClass}>
        {label}
        {required ? <RequiredMark /> : null}
      </p>
      {invalid && errorMessage ? (
        <p className="mb-2 text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {helperText ? <p className="mb-2 text-xs text-gray-600">{helperText}</p> : null}
      <div className="flex flex-wrap gap-4">
        <label htmlFor={`${id}-yes`} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
          <input
            id={`${id}-yes`}
            type="radio"
            name={id}
            checked={value === 'yes'}
            onChange={() => onChange('yes')}
          />
          Yes
        </label>
        <label htmlFor={`${id}-no`} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
          <input
            id={`${id}-no`}
            type="radio"
            name={id}
            checked={value === 'no'}
            onChange={() => onChange('no')}
          />
          No
        </label>
      </div>
    </div>
  )
}

type PerServiceFieldsProps = {
  serviceId: CapturableUtilityServiceId
  form: PerServiceUtilitiesFormState
  onChange: (patch: Partial<PerServiceUtilitiesFormState>) => void
  labelClass: string
  inputClass: string
}

function PerServiceUtilitiesFields({
  serviceId,
  form,
  onChange,
  labelClass,
  inputClass,
  errorFieldId,
  errorMessage,
}: PerServiceFieldsProps & { errorFieldId?: string | null; errorMessage?: string | null }) {
  const label = UTILITY_SERVICE_DISPLAY_LABELS[serviceId]
  const tenantPays = form.tenantPays === 'yes'

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-gray-900">{label}</p>
      <YesNoField
        id={`utilities-${serviceId}-tenant-pays`}
        label={`Does the tenant pay for ${label.toLowerCase()}?`}
        value={form.tenantPays}
        onChange={(v) =>
          onChange({
            tenantPays: v,
            ...(v !== 'yes'
              ? { individuallyMetered: '', apportionmentPercent: '', howMustBePaid: '' }
              : {}),
          })
        }
        labelClass={labelClass}
        required
        invalid={errorFieldId === `utilities-${serviceId}-tenant-pays`}
        errorMessage={errorFieldId === `utilities-${serviceId}-tenant-pays` ? errorMessage : null}
      />
      {tenantPays ? (
        <>
          <YesNoField
            id={`utilities-${serviceId}-metered`}
            label={`Is ${label.toLowerCase()} individually metered for the tenant?`}
            helperText="Yes if the tenant has their own meter or retail account. No if the tenant's share is worked out by apportionment (Item 14)."
            value={form.individuallyMetered}
            onChange={(v) =>
              onChange({
                individuallyMetered: v,
                ...(v === 'yes' ? { apportionmentPercent: '' } : {}),
              })
            }
            labelClass={labelClass}
            required
            invalid={errorFieldId === `utilities-${serviceId}-metered`}
            errorMessage={errorFieldId === `utilities-${serviceId}-metered` ? errorMessage : null}
          />
          {form.individuallyMetered === 'no' ? (
            <div id={`utilities-${serviceId}-apportionment`} className={errorFieldId === `utilities-${serviceId}-apportionment` ? 'rounded-[10px] ring-2 ring-red-600 ring-offset-2' : undefined}>
              {errorFieldId === `utilities-${serviceId}-apportionment` && errorMessage ? (
                <p className="mb-1 text-sm text-red-700" role="alert">
                  {errorMessage}
                </p>
              ) : null}
              <label htmlFor={`utilities-${serviceId}-apportionment-input`} className={labelClass}>
                Percentage of total {label.toLowerCase()} charge (Form 18a Item 14)
                <RequiredMark />
              </label>
              <p className="mb-2 text-xs text-gray-600">
                The tenant pays this percentage of the total charge (1–100, one decimal allowed).
              </p>
              <div className="flex items-center gap-1.5">
                <input
                  id={`utilities-${serviceId}-apportionment-input`}
                  type="number"
                  min={1}
                  max={100}
                  step={0.1}
                  inputMode="decimal"
                  value={form.apportionmentPercent}
                  onChange={(e) => onChange({ apportionmentPercent: e.target.value })}
                  className={`${inputClass} !w-20 shrink-0`}
                  placeholder="25"
                />
                <span className="text-sm text-gray-600">%</span>
              </div>
            </div>
          ) : null}
          <div id={`utilities-${serviceId}-how-paid`} className={errorFieldId === `utilities-${serviceId}-how-paid` ? 'rounded-[10px] ring-2 ring-red-600 ring-offset-2' : undefined}>
            {errorFieldId === `utilities-${serviceId}-how-paid` && errorMessage ? (
              <p className="mb-1 text-sm text-red-700" role="alert">
                {errorMessage}
              </p>
            ) : null}
            <label htmlFor={`utilities-${serviceId}-how-paid-input`} className={labelClass}>
              How the tenant must pay (Form 18a Item 15)
              <RequiredMark />
            </label>
            <p className="mb-2 text-xs text-gray-600">
              e.g. direct to retailer, invoiced quarterly, or paid with rent.
            </p>
            <input
              id={`utilities-${serviceId}-how-paid-input`}
              type="text"
              value={form.howMustBePaid}
              onChange={(e) => onChange({ howMustBePaid: e.target.value })}
              className={inputClass}
              placeholder="e.g. Invoiced quarterly by the retailer"
            />
          </div>
        </>
      ) : null}
    </div>
  )
}

type Props = {
  form: LandlordPropertyUtilitiesFormState
  onChange: (patch: Partial<LandlordPropertyUtilitiesFormState>) => void
  onServiceChange: (serviceId: CapturableUtilityServiceId, patch: Partial<PerServiceUtilitiesFormState>) => void
  labelClass: string
  inputClass: string
  waterAttestationPersisted: boolean
  billsIncluded: boolean
  /** When set, replaces the default Form 18a instrument mention. */
  utilitiesAgreementHint?: string | null
  errorFieldId?: string | null
  errorMessage?: string | null
}

export function LandlordPropertyUtilitiesFields({
  form,
  onChange,
  onServiceChange,
  labelClass,
  inputClass,
  waterAttestationPersisted,
  billsIncluded,
  utilitiesAgreementHint,
  errorFieldId = null,
  errorMessage = null,
}: Props) {
  const showWaterAttestation = form.waterUsageChargedSeparately === 'yes'
  const showPerServiceCapture = !billsIncluded

  return (
    <div className="space-y-5">
      {showPerServiceCapture ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            {utilitiesAgreementHint ??
              'Bills are not included in the rent. Specify who pays for electricity and gas so the tenancy agreement and listing can state this lawfully (QLD Form 18a Items 13 to 15).'}
          </p>
          {CAPTURABLE_UTILITY_SERVICE_IDS.map((serviceId) => (
            <PerServiceUtilitiesFields
              key={serviceId}
              serviceId={serviceId}
              form={form[serviceId]}
              onChange={(patch) => onServiceChange(serviceId, patch)}
              labelClass={labelClass}
              inputClass={inputClass}
              errorFieldId={errorFieldId}
              errorMessage={errorMessage}
            />
          ))}
        </div>
      ) : null}

      <YesNoField
        id="utilities-water-usage"
        label="Is water usage charged separately to the tenant?"
        helperText="Yes only if you pass metered water-usage charges to the tenant (allowed when separately metered and meeting water-efficiency standards). No if water is included in rent."
        value={form.waterUsageChargedSeparately}
        onChange={(v) => {
          onChange({
            waterUsageChargedSeparately: v,
            ...(v !== 'yes' ? { waterSeparatelyMeteredAgreed: waterAttestationPersisted } : {}),
          })
        }}
        labelClass={labelClass}
      />

        {showWaterAttestation && !waterAttestationPersisted ? (
        <div
          id="utilities-water-attestation"
          className={errorFieldId === 'utilities-water-attestation' ? 'rounded-[10px] ring-2 ring-red-600 ring-offset-2' : undefined}
        >
          {errorFieldId === 'utilities-water-attestation' && errorMessage ? (
            <p className="mb-2 text-sm text-red-700" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <label className="flex gap-3 items-start cursor-pointer text-sm text-gray-800 leading-relaxed rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
            <input
              type="checkbox"
              checked={form.waterSeparatelyMeteredAgreed}
              onChange={(e) => onChange({ waterSeparatelyMeteredAgreed: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[var(--quni-coral)] focus:ring-[var(--quni-coral)]"
            />
            <span className="space-y-2">
              <span className="block font-medium text-gray-900">
                {WATER_SEPARATELY_METERED_ATTESTATION_LABEL}
                <RequiredMark />
              </span>
              <span className="block text-gray-800">{WATER_SEPARATELY_METERED_ATTESTATION_INTRO}</span>
              <ul className="list-disc space-y-1 pl-5 text-gray-800">
                {WATER_SEPARATELY_METERED_ATTESTATION_BULLETS.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              <span className="block text-gray-800">{WATER_SEPARATELY_METERED_ATTESTATION_FOOTER}</span>
            </span>
          </label>
        </div>
      ) : showWaterAttestation && waterAttestationPersisted ? (
        <p className="text-sm text-emerald-700" role="status">
          Water metering and efficiency attestation recorded.
        </p>
      ) : null}
    </div>
  )
}

/** Whether bills-included feature is ticked from landlord feature selection. */
export function billsIncludedFromFeatureSelection(
  features: { id: string; name: string }[],
  selectedFeatureIds: Set<string>,
): boolean {
  const names = features
    .filter((f) => selectedFeatureIds.has(f.id))
    .map((f) => f.name.trim().toLowerCase())
  return propertyBillsIncluded(names)
}
