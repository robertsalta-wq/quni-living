import {
  WATER_SEPARATELY_METERED_ATTESTATION_BULLETS,
  WATER_SEPARATELY_METERED_ATTESTATION_FOOTER,
  WATER_SEPARATELY_METERED_ATTESTATION_INTRO,
  WATER_SEPARATELY_METERED_ATTESTATION_LABEL,
} from '../../lib/waterSeparatelyMeteredAttestation'
import {
  boolColToTri,
  triToBool,
  type TriState,
} from './LandlordPropertyFt6600ComplianceFields'

export type LandlordPropertyUtilitiesFormState = {
  waterUsageChargedSeparately: TriState
  waterSeparatelyMeteredAgreed: boolean
}

export function emptyLandlordPropertyUtilitiesFormState(): LandlordPropertyUtilitiesFormState {
  return {
    waterUsageChargedSeparately: '',
    waterSeparatelyMeteredAgreed: false,
  }
}

export function landlordPropertyUtilitiesFormStateFromProperty(prop: {
  water_usage_charged_separately?: boolean | null
  water_separately_metered_efficient_attested_at?: string | null
}): LandlordPropertyUtilitiesFormState {
  const attested = Boolean(prop.water_separately_metered_efficient_attested_at)
  return {
    waterUsageChargedSeparately: boolColToTri(prop.water_usage_charged_separately),
    waterSeparatelyMeteredAgreed: attested,
  }
}

export function landlordPropertyUtilitiesColumnsFromFormState(
  form: LandlordPropertyUtilitiesFormState,
): { water_usage_charged_separately: boolean | null } {
  return {
    water_usage_charged_separately: triToBool(form.waterUsageChargedSeparately),
  }
}

type YesNoFieldProps = {
  id: string
  label: string
  helperText?: string
  value: TriState
  onChange: (v: TriState) => void
  labelClass: string
}

function YesNoField({ id, label, helperText, value, onChange, labelClass }: YesNoFieldProps) {
  return (
    <div>
      <p className={labelClass}>{label}</p>
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

type Props = {
  form: LandlordPropertyUtilitiesFormState
  onChange: (patch: Partial<LandlordPropertyUtilitiesFormState>) => void
  labelClass: string
  waterAttestationPersisted: boolean
}

export function LandlordPropertyUtilitiesFields({
  form,
  onChange,
  labelClass,
  waterAttestationPersisted,
}: Props) {
  const showWaterAttestation = form.waterUsageChargedSeparately === 'yes'

  return (
    <div className="space-y-5">
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
        <div id="section-water-metered-attestation">
          <label className="flex gap-3 items-start cursor-pointer text-sm text-gray-800 leading-relaxed rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
            <input
              type="checkbox"
              checked={form.waterSeparatelyMeteredAgreed}
              onChange={(e) => onChange({ waterSeparatelyMeteredAgreed: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#FF6F61] focus:ring-[#FF6F61]"
            />
            <span className="space-y-2">
              <span className="block font-medium text-gray-900">
                {WATER_SEPARATELY_METERED_ATTESTATION_LABEL}
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
