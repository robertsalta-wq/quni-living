import type { QldNoticeConsentFormState, QldYesNo } from '../../lib/tenancy/qldRoomingListingFields'

type Props = {
  legend: string
  helperText: string
  partyLabel: string
  value: QldNoticeConsentFormState
  onChange: (next: QldNoticeConsentFormState) => void
  labelClass: string
  inputClass: string
}

function YesNo({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: QldYesNo
  onChange: (v: QldYesNo) => void
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-900">{label}</p>
      <div className="mt-2 flex flex-wrap gap-4">
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

export function QldNoticeConsentFields({
  legend,
  helperText,
  partyLabel,
  value,
  onChange,
  labelClass,
  inputClass,
}: Props) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-medium text-gray-900">{legend}</legend>
      <p className="text-xs text-gray-600 leading-relaxed">{helperText}</p>
      <YesNo
        id={`${partyLabel}-email`}
        label="Email"
        value={value.emailPermitted}
        onChange={(emailPermitted) =>
          onChange({
            ...value,
            emailPermitted,
            emailAddress: emailPermitted === 'yes' ? value.emailAddress : '',
          })
        }
      />
      {value.emailPermitted === 'yes' ? (
        <div>
          <label htmlFor={`${partyLabel}-email-address`} className={labelClass}>
            Email address for notices
          </label>
          <input
            id={`${partyLabel}-email-address`}
            type="email"
            value={value.emailAddress}
            onChange={(e) => onChange({ ...value, emailAddress: e.target.value })}
            className={inputClass}
            autoComplete="email"
          />
        </div>
      ) : null}
      <YesNo
        id={`${partyLabel}-sms`}
        label="Text message"
        value={value.smsPermitted}
        onChange={(smsPermitted) =>
          onChange({
            ...value,
            smsPermitted,
            smsAddress: smsPermitted === 'yes' ? value.smsAddress : '',
          })
        }
      />
      {value.smsPermitted === 'yes' ? (
        <div>
          <label htmlFor={`${partyLabel}-sms-address`} className={labelClass}>
            Mobile number for text-message notices
          </label>
          <input
            id={`${partyLabel}-sms-address`}
            type="tel"
            value={value.smsAddress}
            onChange={(e) => onChange({ ...value, smsAddress: e.target.value })}
            className={inputClass}
            autoComplete="tel"
          />
        </div>
      ) : null}
    </fieldset>
  )
}
