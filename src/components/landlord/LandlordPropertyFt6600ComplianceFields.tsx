import {
  missingNswFt6600ComplianceFieldLabels,
  NSW_FT6600_COMPLIANCE_FIELD_LABELS,
  NSW_FT6600_STRATA_SCHEME_LABEL,
} from '../../../api/lib/documents/propertyFt6600Compliance.js'
import { RequiredMark } from './RequiredMark'

export type TriState = 'yes' | 'no' | ''

export type LandlordFt6600ComplianceFormState = {
  smokeAlarmType: '' | 'hardwired' | 'battery'
  smokeAlarmBatteryTenantReplaceable: TriState
  smokeAlarmBatteryType: string
  smokeAlarmBackupTenantReplaceable: TriState
  smokeAlarmBackupBatteryType: string
  isStrataScheme: TriState
  strataOcResponsibleForAlarms: TriState
  waterUsageChargedSeparately: TriState
  electricityEmbeddedNetwork: TriState
  gasEmbeddedNetwork: TriState
  strataBylawsApplicable: TriState
}

export function emptyLandlordFt6600ComplianceFormState(): LandlordFt6600ComplianceFormState {
  return {
    smokeAlarmType: '',
    smokeAlarmBatteryTenantReplaceable: '',
    smokeAlarmBatteryType: '',
    smokeAlarmBackupTenantReplaceable: '',
    smokeAlarmBackupBatteryType: '',
    isStrataScheme: '',
    strataOcResponsibleForAlarms: '',
    waterUsageChargedSeparately: '',
    electricityEmbeddedNetwork: '',
    gasEmbeddedNetwork: '',
    strataBylawsApplicable: '',
  }
}

export function boolColToTri(v: boolean | null | undefined): TriState {
  if (v === true) return 'yes'
  if (v === false) return 'no'
  return ''
}

export function triToBool(v: TriState): boolean | null {
  if (v === 'yes') return true
  if (v === 'no') return false
  return null
}

export function ft6600ComplianceFormStateFromProperty(prop: {
  smoke_alarm_type?: string | null
  smoke_alarm_battery_tenant_replaceable?: boolean | null
  smoke_alarm_battery_type?: string | null
  smoke_alarm_backup_tenant_replaceable?: boolean | null
  smoke_alarm_backup_battery_type?: string | null
  strata_oc_responsible_for_alarms?: boolean | null
  water_usage_charged_separately?: boolean | null
  electricity_embedded_network?: boolean | null
  gas_embedded_network?: boolean | null
  strata_bylaws_applicable?: boolean | null
}): LandlordFt6600ComplianceFormState {
  const smokeType =
    prop.smoke_alarm_type === 'hardwired' || prop.smoke_alarm_type === 'battery'
      ? prop.smoke_alarm_type
      : ''
  // OC answered means the property is in a scheme. By-laws false means it is not.
  // By-laws true, with no OC answer yet, still means it is in a scheme.
  const isStrataScheme: TriState =
    prop.strata_oc_responsible_for_alarms === true || prop.strata_oc_responsible_for_alarms === false
      ? 'yes'
      : prop.strata_bylaws_applicable === true
        ? 'yes'
        : prop.strata_bylaws_applicable === false
          ? 'no'
          : ''

  return {
    smokeAlarmType: smokeType,
    smokeAlarmBatteryTenantReplaceable: boolColToTri(prop.smoke_alarm_battery_tenant_replaceable),
    smokeAlarmBatteryType: prop.smoke_alarm_battery_type?.trim() ?? '',
    smokeAlarmBackupTenantReplaceable: boolColToTri(prop.smoke_alarm_backup_tenant_replaceable),
    smokeAlarmBackupBatteryType: prop.smoke_alarm_backup_battery_type?.trim() ?? '',
    isStrataScheme,
    strataOcResponsibleForAlarms: boolColToTri(prop.strata_oc_responsible_for_alarms),
    waterUsageChargedSeparately: boolColToTri(prop.water_usage_charged_separately),
    electricityEmbeddedNetwork: boolColToTri(prop.electricity_embedded_network),
    gasEmbeddedNetwork: boolColToTri(prop.gas_embedded_network),
    strataBylawsApplicable: boolColToTri(prop.strata_bylaws_applicable),
  }
}

export function ft6600ComplianceColumnsFromFormState(
  form: LandlordFt6600ComplianceFormState,
): {
  smoke_alarm_type: 'hardwired' | 'battery' | null
  smoke_alarm_battery_tenant_replaceable: boolean | null
  smoke_alarm_battery_type: string | null
  smoke_alarm_backup_tenant_replaceable: boolean | null
  smoke_alarm_backup_battery_type: string | null
  strata_oc_responsible_for_alarms: boolean | null
  water_usage_charged_separately: boolean | null
  electricity_embedded_network: boolean | null
  gas_embedded_network: boolean | null
  strata_bylaws_applicable: boolean | null
} {
  const smokeType = form.smokeAlarmType || null
  const ocResponsibleForAlarms =
    form.isStrataScheme === 'yes' && form.strataOcResponsibleForAlarms === 'yes'
  return {
    smoke_alarm_type: smokeType,
    smoke_alarm_battery_tenant_replaceable:
      smokeType === 'battery' && !ocResponsibleForAlarms
        ? triToBool(form.smokeAlarmBatteryTenantReplaceable)
        : null,
    smoke_alarm_battery_type:
      smokeType === 'battery' &&
      !ocResponsibleForAlarms &&
      form.smokeAlarmBatteryTenantReplaceable === 'yes' &&
      form.smokeAlarmBatteryType.trim()
        ? form.smokeAlarmBatteryType.trim()
        : null,
    smoke_alarm_backup_tenant_replaceable:
      smokeType === 'hardwired' && !ocResponsibleForAlarms
        ? triToBool(form.smokeAlarmBackupTenantReplaceable)
        : null,
    smoke_alarm_backup_battery_type:
      smokeType === 'hardwired' &&
      !ocResponsibleForAlarms &&
      form.smokeAlarmBackupTenantReplaceable === 'yes' &&
      form.smokeAlarmBackupBatteryType.trim()
        ? form.smokeAlarmBackupBatteryType.trim()
        : null,
    strata_oc_responsible_for_alarms:
      form.isStrataScheme === 'yes' ? triToBool(form.strataOcResponsibleForAlarms) : null,
    water_usage_charged_separately: triToBool(form.waterUsageChargedSeparately),
    electricity_embedded_network: triToBool(form.electricityEmbeddedNetwork),
    gas_embedded_network: triToBool(form.gasEmbeddedNetwork),
    strata_bylaws_applicable:
      form.isStrataScheme === 'yes'
        ? triToBool(form.strataBylawsApplicable)
        : form.isStrataScheme === 'no'
          ? false
          : null,
  }
}

/** Scroll target for the first missing NSW compliance answer. */
export function ft6600ComplianceFieldIdForLabel(label: string): string {
  switch (label) {
    case NSW_FT6600_STRATA_SCHEME_LABEL:
      return 'ft6600-strata-scheme'
    case NSW_FT6600_COMPLIANCE_FIELD_LABELS.smoke_alarm_type:
      return 'ft6600-smoke-type'
    case NSW_FT6600_COMPLIANCE_FIELD_LABELS.strata_oc_responsible_for_alarms:
      return 'ft6600-strata-oc'
    case NSW_FT6600_COMPLIANCE_FIELD_LABELS.smoke_alarm_battery_tenant_replaceable:
      return 'ft6600-battery-replaceable'
    case NSW_FT6600_COMPLIANCE_FIELD_LABELS.smoke_alarm_battery_type:
      return 'ft6600-battery-type'
    case NSW_FT6600_COMPLIANCE_FIELD_LABELS.smoke_alarm_backup_tenant_replaceable:
      return 'ft6600-backup-replaceable'
    case NSW_FT6600_COMPLIANCE_FIELD_LABELS.smoke_alarm_backup_battery_type:
      return 'ft6600-backup-type'
    case NSW_FT6600_COMPLIANCE_FIELD_LABELS.water_usage_charged_separately:
      return 'ft6600-water-usage'
    case NSW_FT6600_COMPLIANCE_FIELD_LABELS.electricity_embedded_network:
      return 'ft6600-elec-embedded'
    case NSW_FT6600_COMPLIANCE_FIELD_LABELS.gas_embedded_network:
      return 'ft6600-gas-embedded'
    case NSW_FT6600_COMPLIANCE_FIELD_LABELS.strata_bylaws_applicable:
      return 'ft6600-strata-bylaws'
    default:
      return 'section-ft6600-compliance'
  }
}

export function missingFt6600ComplianceFieldLabelsFromForm(
  form: LandlordFt6600ComplianceFormState,
): string[] {
  const cols = ft6600ComplianceColumnsFromFormState(form)
  const isStrataScheme =
    form.isStrataScheme === 'yes' ? true : form.isStrataScheme === 'no' ? false : null
  const missing = missingNswFt6600ComplianceFieldLabels(cols, { isStrataScheme })
  if (form.isStrataScheme === '') {
    missing.unshift(NSW_FT6600_STRATA_SCHEME_LABEL)
  }
  return missing
}

type Props = {
  form: LandlordFt6600ComplianceFormState
  onChange: (patch: Partial<LandlordFt6600ComplianceFormState>) => void
  inputClass: string
  labelClass: string
  errorFieldId?: string | null
  errorMessage?: string | null
}

const fieldHelperClass = 'text-xs text-gray-500 mt-0.5 mb-1 leading-relaxed'

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
}: {
  id: string
  label: string
  helperText?: string
  value: TriState
  onChange: (v: TriState) => void
  labelClass: string
  required?: boolean
  invalid?: boolean
  errorMessage?: string | null
}) {
  return (
    <fieldset id={id} className={`space-y-2 ${invalid ? 'rounded-[10px] ring-2 ring-red-600 ring-offset-2' : ''}`}>
      <legend className={labelClass}>
        {label}
        {required ? <RequiredMark /> : null}
      </legend>
      {helperText ? <p className={fieldHelperClass}>{helperText}</p> : null}
      {invalid && errorMessage ? (
        <p id={`${id}-error`} className="text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-4">
        <label htmlFor={`${id}-yes`} className="flex items-center gap-2 cursor-pointer text-sm text-gray-800">
          <input
            id={`${id}-yes`}
            type="radio"
            name={id}
            checked={value === 'yes'}
            onChange={() => onChange('yes')}
            className="h-4 w-4 accent-[var(--quni-rust)]"
          />
          Yes
        </label>
        <label htmlFor={`${id}-no`} className="flex items-center gap-2 cursor-pointer text-sm text-gray-800">
          <input
            id={`${id}-no`}
            type="radio"
            name={id}
            checked={value === 'no'}
            onChange={() => onChange('no')}
            className="h-4 w-4 accent-[var(--quni-rust)]"
          />
          No
        </label>
      </div>
    </fieldset>
  )
}

export default function LandlordPropertyFt6600ComplianceFields({
  form,
  onChange,
  inputClass,
  labelClass,
  errorFieldId = null,
  errorMessage = null,
}: Props) {
  const ocResponsibleForAlarms =
    form.isStrataScheme === 'yes' && form.strataOcResponsibleForAlarms === 'yes'
  const showSmokeAlarmReplaceability = !ocResponsibleForAlarms
  const fieldInvalid = (id: string) => errorFieldId === id
  const fieldError = (id: string) => (fieldInvalid(id) ? errorMessage : null)

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500 leading-relaxed">
        These details are required for the NSW residential tenancy agreement (FT6600) and appear on the signed lease, so
        please answer accurately. You&apos;ll need to complete this section before you can accept a booking for this
        property. (Premises inclusions are taken from the Inclusions &amp; features section above.)
      </p>

      <fieldset
        id="ft6600-smoke-type"
        className={`space-y-2 ${fieldInvalid('ft6600-smoke-type') ? 'rounded-[10px] ring-2 ring-red-600 ring-offset-2' : ''}`}
      >
        <legend className={labelClass}>
          Smoke alarm type
          <RequiredMark />
        </legend>
        {fieldError('ft6600-smoke-type') ? (
          <p id="ft6600-smoke-type-error" className="text-sm text-red-700" role="alert">
            {fieldError('ft6600-smoke-type')}
          </p>
        ) : null}
        <p className={fieldHelperClass}>
          Hardwired alarms run off mains power (usually with a backup battery); battery-operated alarms run on batteries
          only. Check the unit or ask your electrician if unsure.
        </p>
        <div className="flex flex-wrap gap-4">
          {(['hardwired', 'battery'] as const).map((type) => (
            <label
              key={type}
              htmlFor={`ft6600-smoke-${type}`}
              className="flex items-center gap-2 cursor-pointer text-sm text-gray-800 capitalize"
            >
              <input
                id={`ft6600-smoke-${type}`}
                type="radio"
                name="ft6600-smoke-type"
                checked={form.smokeAlarmType === type}
                onChange={() =>
                  onChange({
                    smokeAlarmType: type,
                    smokeAlarmBatteryTenantReplaceable: '',
                    smokeAlarmBatteryType: '',
                    smokeAlarmBackupTenantReplaceable: '',
                    smokeAlarmBackupBatteryType: '',
                  })
                }
                className="h-4 w-4 accent-[var(--quni-rust)]"
              />
              {type === 'hardwired' ? 'Hardwired' : 'Battery operated'}
            </label>
          ))}
        </div>
      </fieldset>

      <YesNoField
        id="ft6600-strata-scheme"
        label="Is the property in a strata or community scheme?"
        helperText="Yes for apartments, units and townhouses with shared common property and an owners corporation; usually No for a free-standing house on its own title. This decides who's responsible for smoke alarms."
        value={form.isStrataScheme}
        onChange={(v) =>
          onChange({
            isStrataScheme: v,
            strataOcResponsibleForAlarms: v === 'yes' ? form.strataOcResponsibleForAlarms : '',
            strataBylawsApplicable: v === 'yes' ? form.strataBylawsApplicable : '',
          })
        }
        labelClass={labelClass}
        required
        invalid={fieldInvalid('ft6600-strata-scheme')}
        errorMessage={fieldError('ft6600-strata-scheme')}
      />

      {form.isStrataScheme === 'yes' ? (
        <YesNoField
          id="ft6600-strata-oc"
          label="Is the owners corporation responsible for smoke alarm repair and replacement?"
          helperText="In some schemes the owners corporation maintains alarms in each lot. Check your by-laws or strata manager - if Yes, those duties sit with the OC, not you."
          value={form.strataOcResponsibleForAlarms}
          onChange={(v) =>
            onChange({
              strataOcResponsibleForAlarms: v,
              ...(v === 'yes'
                ? {
                    smokeAlarmBatteryTenantReplaceable: '',
                    smokeAlarmBatteryType: '',
                    smokeAlarmBackupTenantReplaceable: '',
                    smokeAlarmBackupBatteryType: '',
                  }
                : {}),
            })
          }
          labelClass={labelClass}
          required
          invalid={fieldInvalid('ft6600-strata-oc')}
          errorMessage={fieldError('ft6600-strata-oc')}
        />
      ) : null}

      {showSmokeAlarmReplaceability && form.smokeAlarmType === 'battery' ? (
        <div className="space-y-4">
          <YesNoField
            id="ft6600-battery-replaceable"
            label="Can the tenant replace smoke alarm batteries?"
            helperText="Yes if it takes standard removable batteries the tenant can swap; No if the battery is sealed in the unit."
            value={form.smokeAlarmBatteryTenantReplaceable}
            onChange={(v) =>
              onChange({
                smokeAlarmBatteryTenantReplaceable: v,
                smokeAlarmBatteryType: v === 'yes' ? form.smokeAlarmBatteryType : '',
              })
            }
            labelClass={labelClass}
            required
            invalid={fieldInvalid('ft6600-battery-replaceable')}
            errorMessage={fieldError('ft6600-battery-replaceable')}
          />
          {form.smokeAlarmBatteryTenantReplaceable === 'yes' ? (
            <div id="ft6600-battery-type" className={fieldInvalid('ft6600-battery-type') ? 'rounded-[10px] ring-2 ring-red-600 ring-offset-2' : ''}>
              {fieldError('ft6600-battery-type') ? (
                <p className="mb-1 text-sm text-red-700" role="alert">
                  {fieldError('ft6600-battery-type')}
                </p>
              ) : null}
              <label htmlFor="ft6600-battery-type-input" className={labelClass}>
                Battery type
                <RequiredMark />
              </label>
              <p className={fieldHelperClass}>e.g. 9V or AA, so the tenant knows what to buy.</p>
              <input
                id="ft6600-battery-type-input"
                type="text"
                value={form.smokeAlarmBatteryType}
                onChange={(e) => onChange({ smokeAlarmBatteryType: e.target.value })}
                className={inputClass}
                placeholder="e.g. 9V alkaline"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {showSmokeAlarmReplaceability && form.smokeAlarmType === 'hardwired' ? (
        <div className="space-y-4">
          <YesNoField
            id="ft6600-backup-replaceable"
            label="Can the tenant replace backup batteries in hardwired alarms?"
            helperText="Yes if the backup battery is removable; No if sealed."
            value={form.smokeAlarmBackupTenantReplaceable}
            onChange={(v) =>
              onChange({
                smokeAlarmBackupTenantReplaceable: v,
                smokeAlarmBackupBatteryType: v === 'yes' ? form.smokeAlarmBackupBatteryType : '',
              })
            }
            labelClass={labelClass}
            required
            invalid={fieldInvalid('ft6600-backup-replaceable')}
            errorMessage={fieldError('ft6600-backup-replaceable')}
          />
          {form.smokeAlarmBackupTenantReplaceable === 'yes' ? (
            <div id="ft6600-backup-type" className={fieldInvalid('ft6600-backup-type') ? 'rounded-[10px] ring-2 ring-red-600 ring-offset-2' : ''}>
              {fieldError('ft6600-backup-type') ? (
                <p className="mb-1 text-sm text-red-700" role="alert">
                  {fieldError('ft6600-backup-type')}
                </p>
              ) : null}
              <label htmlFor="ft6600-backup-type-input" className={labelClass}>
                Backup battery type
                <RequiredMark />
              </label>
              <p className={fieldHelperClass}>e.g. 9V, the backup the tenant would replace.</p>
              <input
                id="ft6600-backup-type-input"
                type="text"
                value={form.smokeAlarmBackupBatteryType}
                onChange={(e) => onChange({ smokeAlarmBackupBatteryType: e.target.value })}
                className={inputClass}
                placeholder="e.g. 9V alkaline"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <YesNoField
        id="ft6600-water-usage"
        label="Is water usage charged separately to the tenant?"
        helperText="Yes only if you pass metered water-usage charges to the tenant (allowed when separately metered and meeting water-efficiency standards). No if water is included in rent."
        value={form.waterUsageChargedSeparately}
        onChange={(v) => onChange({ waterUsageChargedSeparately: v })}
        labelClass={labelClass}
        required
        invalid={fieldInvalid('ft6600-water-usage')}
        errorMessage={fieldError('ft6600-water-usage')}
      />

      <YesNoField
        id="ft6600-elec-embedded"
        label="Is electricity supplied via an embedded network?"
        helperText="An embedded network is where the building buys energy in bulk and on-sells to residents, rather than the tenant holding a direct retail account. Standard metered connections are No."
        value={form.electricityEmbeddedNetwork}
        onChange={(v) => onChange({ electricityEmbeddedNetwork: v })}
        labelClass={labelClass}
        required
        invalid={fieldInvalid('ft6600-elec-embedded')}
        errorMessage={fieldError('ft6600-elec-embedded')}
      />

      <YesNoField
        id="ft6600-gas-embedded"
        label="Is gas supplied via an embedded network?"
        helperText="Same as above, for gas. No for a standard direct connection."
        value={form.gasEmbeddedNetwork}
        onChange={(v) => onChange({ gasEmbeddedNetwork: v })}
        labelClass={labelClass}
        required
        invalid={fieldInvalid('ft6600-gas-embedded')}
        errorMessage={fieldError('ft6600-gas-embedded')}
      />

      {form.isStrataScheme === 'yes' ? (
        <YesNoField
          id="ft6600-strata-bylaws"
          label="Do strata or community scheme by-laws apply to the premises?"
          helperText="By-laws are the owners-corporation rules (noise, pets, common areas). They usually apply in a strata or community scheme, and you must give the tenant a copy."
          value={form.strataBylawsApplicable}
          onChange={(v) => onChange({ strataBylawsApplicable: v })}
          labelClass={labelClass}
          required
          invalid={fieldInvalid('ft6600-strata-bylaws')}
          errorMessage={fieldError('ft6600-strata-bylaws')}
        />
      ) : null}
    </div>
  )
}
