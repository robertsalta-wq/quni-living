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
  const isStrataScheme: TriState =
    prop.strata_bylaws_applicable === true || prop.strata_oc_responsible_for_alarms === true
      ? 'yes'
      : prop.strata_bylaws_applicable === false &&
          prop.strata_oc_responsible_for_alarms === false &&
          smokeType
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
  return {
    smoke_alarm_type: smokeType,
    smoke_alarm_battery_tenant_replaceable:
      smokeType === 'battery' ? triToBool(form.smokeAlarmBatteryTenantReplaceable) : null,
    smoke_alarm_battery_type:
      smokeType === 'battery' &&
      form.smokeAlarmBatteryTenantReplaceable === 'yes' &&
      form.smokeAlarmBatteryType.trim()
        ? form.smokeAlarmBatteryType.trim()
        : null,
    smoke_alarm_backup_tenant_replaceable:
      smokeType === 'hardwired' ? triToBool(form.smokeAlarmBackupTenantReplaceable) : null,
    smoke_alarm_backup_battery_type:
      smokeType === 'hardwired' &&
      form.smokeAlarmBackupTenantReplaceable === 'yes' &&
      form.smokeAlarmBackupBatteryType.trim()
        ? form.smokeAlarmBackupBatteryType.trim()
        : null,
    strata_oc_responsible_for_alarms:
      form.isStrataScheme === 'yes'
        ? triToBool(form.strataOcResponsibleForAlarms)
        : form.isStrataScheme === 'no'
          ? false
          : null,
    water_usage_charged_separately: triToBool(form.waterUsageChargedSeparately),
    electricity_embedded_network: triToBool(form.electricityEmbeddedNetwork),
    gas_embedded_network: triToBool(form.gasEmbeddedNetwork),
    strata_bylaws_applicable: triToBool(form.strataBylawsApplicable),
  }
}

type Props = {
  form: LandlordFt6600ComplianceFormState
  onChange: (patch: Partial<LandlordFt6600ComplianceFormState>) => void
  inputClass: string
  labelClass: string
}

function YesNoField({
  id,
  label,
  value,
  onChange,
  labelClass,
}: {
  id: string
  label: string
  value: TriState
  onChange: (v: TriState) => void
  labelClass: string
}) {
  return (
    <fieldset className="space-y-2">
      <legend className={labelClass}>{label}</legend>
      <div className="flex flex-wrap gap-4">
        <label htmlFor={`${id}-yes`} className="flex items-center gap-2 cursor-pointer text-sm text-gray-800">
          <input
            id={`${id}-yes`}
            type="radio"
            name={id}
            checked={value === 'yes'}
            onChange={() => onChange('yes')}
            className="h-4 w-4 accent-[#D85A30]"
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
            className="h-4 w-4 accent-[#D85A30]"
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
}: Props) {
  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-600 leading-relaxed">
        Required for NSW residential tenancy agreements (FT6600). Premises inclusions on the lease are taken from the
        Inclusions &amp; features section above.
      </p>

      <fieldset className="space-y-2">
        <legend className={labelClass}>Smoke alarm type</legend>
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
                className="h-4 w-4 accent-[#D85A30]"
              />
              {type === 'hardwired' ? 'Hardwired' : 'Battery operated'}
            </label>
          ))}
        </div>
      </fieldset>

      {form.smokeAlarmType === 'battery' ? (
        <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
          <YesNoField
            id="ft6600-battery-replaceable"
            label="Can the tenant replace smoke alarm batteries?"
            value={form.smokeAlarmBatteryTenantReplaceable}
            onChange={(v) =>
              onChange({
                smokeAlarmBatteryTenantReplaceable: v,
                smokeAlarmBatteryType: v === 'yes' ? form.smokeAlarmBatteryType : '',
              })
            }
            labelClass={labelClass}
          />
          {form.smokeAlarmBatteryTenantReplaceable === 'yes' ? (
            <div>
              <label htmlFor="ft6600-battery-type" className={labelClass}>
                Battery type
              </label>
              <input
                id="ft6600-battery-type"
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

      {form.smokeAlarmType === 'hardwired' ? (
        <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
          <YesNoField
            id="ft6600-backup-replaceable"
            label="Can the tenant replace backup batteries in hardwired alarms?"
            value={form.smokeAlarmBackupTenantReplaceable}
            onChange={(v) =>
              onChange({
                smokeAlarmBackupTenantReplaceable: v,
                smokeAlarmBackupBatteryType: v === 'yes' ? form.smokeAlarmBackupBatteryType : '',
              })
            }
            labelClass={labelClass}
          />
          {form.smokeAlarmBackupTenantReplaceable === 'yes' ? (
            <div>
              <label htmlFor="ft6600-backup-type" className={labelClass}>
                Backup battery type
              </label>
              <input
                id="ft6600-backup-type"
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
        id="ft6600-strata-scheme"
        label="Is the property in a strata or community scheme?"
        value={form.isStrataScheme}
        onChange={(v) =>
          onChange({
            isStrataScheme: v,
            strataOcResponsibleForAlarms: v === 'yes' ? form.strataOcResponsibleForAlarms : '',
          })
        }
        labelClass={labelClass}
      />

      {form.isStrataScheme === 'yes' ? (
        <YesNoField
          id="ft6600-strata-oc"
          label="Is the owners corporation responsible for smoke alarm repair and replacement?"
          value={form.strataOcResponsibleForAlarms}
          onChange={(v) => onChange({ strataOcResponsibleForAlarms: v })}
          labelClass={labelClass}
        />
      ) : null}

      <YesNoField
        id="ft6600-water-usage"
        label="Is water usage charged separately to the tenant?"
        value={form.waterUsageChargedSeparately}
        onChange={(v) => onChange({ waterUsageChargedSeparately: v })}
        labelClass={labelClass}
      />

      <YesNoField
        id="ft6600-elec-embedded"
        label="Is electricity supplied via an embedded network?"
        value={form.electricityEmbeddedNetwork}
        onChange={(v) => onChange({ electricityEmbeddedNetwork: v })}
        labelClass={labelClass}
      />

      <YesNoField
        id="ft6600-gas-embedded"
        label="Is gas supplied via an embedded network?"
        value={form.gasEmbeddedNetwork}
        onChange={(v) => onChange({ gasEmbeddedNetwork: v })}
        labelClass={labelClass}
      />

      <YesNoField
        id="ft6600-strata-bylaws"
        label="Do strata or community scheme by-laws apply to the premises?"
        value={form.strataBylawsApplicable}
        onChange={(v) => onChange({ strataBylawsApplicable: v })}
        labelClass={labelClass}
      />
    </div>
  )
}
