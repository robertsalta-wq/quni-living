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

const fieldHelperClass = 'text-xs text-gray-500 mt-0.5 mb-1 leading-relaxed'

function YesNoField({
  id,
  label,
  helperText,
  value,
  onChange,
  labelClass,
}: {
  id: string
  label: string
  helperText?: string
  value: TriState
  onChange: (v: TriState) => void
  labelClass: string
}) {
  return (
    <fieldset className="space-y-2">
      <legend className={labelClass}>{label}</legend>
      {helperText ? <p className={fieldHelperClass}>{helperText}</p> : null}
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
  const ocResponsibleForAlarms =
    form.isStrataScheme === 'yes' && form.strataOcResponsibleForAlarms === 'yes'
  const showSmokeAlarmReplaceability = !ocResponsibleForAlarms

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500 leading-relaxed">
        These details are required for the NSW residential tenancy agreement (FT6600) and appear on the signed lease, so
        please answer accurately. You&apos;ll need to complete this section before you can accept a booking for this
        property. (Premises inclusions are taken from the Inclusions &amp; features section above.)
      </p>

      <fieldset className="space-y-2">
        <legend className={labelClass}>Smoke alarm type</legend>
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
                className="h-4 w-4 accent-[#D85A30]"
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
          })
        }
        labelClass={labelClass}
      />

      {form.isStrataScheme === 'yes' ? (
        <YesNoField
          id="ft6600-strata-oc"
          label="Is the owners corporation responsible for smoke alarm repair and replacement?"
          helperText="In some schemes the owners corporation maintains alarms in each lot. Check your by-laws or strata manager — if Yes, those duties sit with the OC, not you."
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
        />
      ) : null}

      {showSmokeAlarmReplaceability && form.smokeAlarmType === 'battery' ? (
        <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
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
          />
          {form.smokeAlarmBatteryTenantReplaceable === 'yes' ? (
            <div>
              <label htmlFor="ft6600-battery-type" className={labelClass}>
                Battery type
              </label>
              <p className={fieldHelperClass}>e.g. 9V or AA, so the tenant knows what to buy.</p>
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

      {showSmokeAlarmReplaceability && form.smokeAlarmType === 'hardwired' ? (
        <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
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
          />
          {form.smokeAlarmBackupTenantReplaceable === 'yes' ? (
            <div>
              <label htmlFor="ft6600-backup-type" className={labelClass}>
                Backup battery type
              </label>
              <p className={fieldHelperClass}>e.g. 9V, the backup the tenant would replace.</p>
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
        id="ft6600-water-usage"
        label="Is water usage charged separately to the tenant?"
        helperText="Yes only if you pass metered water-usage charges to the tenant (allowed when separately metered and meeting water-efficiency standards). No if water is included in rent."
        value={form.waterUsageChargedSeparately}
        onChange={(v) => onChange({ waterUsageChargedSeparately: v })}
        labelClass={labelClass}
      />

      <YesNoField
        id="ft6600-elec-embedded"
        label="Is electricity supplied via an embedded network?"
        helperText="An embedded network is where the building buys energy in bulk and on-sells to residents, rather than the tenant holding a direct retail account. Standard metered connections are No."
        value={form.electricityEmbeddedNetwork}
        onChange={(v) => onChange({ electricityEmbeddedNetwork: v })}
        labelClass={labelClass}
      />

      <YesNoField
        id="ft6600-gas-embedded"
        label="Is gas supplied via an embedded network?"
        helperText="Same as above, for gas. No for a standard direct connection."
        value={form.gasEmbeddedNetwork}
        onChange={(v) => onChange({ gasEmbeddedNetwork: v })}
        labelClass={labelClass}
      />

      <YesNoField
        id="ft6600-strata-bylaws"
        label="Do strata or community scheme by-laws apply to the premises?"
        helperText="By-laws are the owners-corporation rules (noise, pets, common areas). If the property's in a strata/community scheme they usually apply, and you must give the tenant a copy."
        value={form.strataBylawsApplicable}
        onChange={(v) => onChange({ strataBylawsApplicable: v })}
        labelClass={labelClass}
      />
    </div>
  )
}
