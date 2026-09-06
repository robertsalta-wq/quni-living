import { QldNoticeConsentFields } from '../tenancy/QldNoticeConsentFields'
import {
  QLD_ITEM_11_HELPER,
  QLD_ITEM_13_2_HELPER,
  QLD_ITEM_5_PROVIDER_HELPER,
  QLD_LEVEL_1_LOCKED_COPY,
  QLD_RENT_ACCOMMODATION_ONLY_HELPER,
  QLD_STUDENT_ACCOMMODATION_HELPER,
  type QldRoomingListingFormState,
  type QldYesNo,
} from '../../lib/tenancy/qldRoomingListingFields'

type Props = {
  form: QldRoomingListingFormState
  onChange: (patch: Partial<QldRoomingListingFormState>) => void
  labelClass: string
  inputClass: string
}

const CHECKBOX_CLASS =
  'h-4 w-4 flex-shrink-0 rounded border-gray-300 accent-[var(--quni-rust)] cursor-pointer'

export function QldRoomingParticularsFields({ form, onChange, labelClass, inputClass }: Props) {
  return (
    <div id="section-qld-rooming-particulars" className="space-y-5 rounded-xl border border-stone-200 bg-stone-50 p-4">
      <p className="text-sm font-medium text-gray-900">Queensland rooming particulars</p>
      <p className="text-xs text-gray-600 leading-relaxed">{QLD_LEVEL_1_LOCKED_COPY}</p>
      <p className="text-xs text-gray-600 leading-relaxed">{QLD_RENT_ACCOMMODATION_ONLY_HELPER}</p>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.studentAccommodation}
          onChange={(e) => onChange({ studentAccommodation: e.target.checked })}
          className={CHECKBOX_CLASS}
        />
        <span>
          <span className="block text-sm text-gray-800">Student accommodation</span>
          <span className="block text-xs text-gray-600 mt-0.5">{QLD_STUDENT_ACCOMMODATION_HELPER}</span>
        </span>
      </label>

      <div>
        <label htmlFor="pf-qld-persons-premises" className={labelClass}>
          People allowed at the premises
        </label>
        <p className="text-xs text-gray-600 mt-0.5 mb-1">
          The whole home, including this room. Not only the people in this room.
        </p>
        <input
          id="pf-qld-persons-premises"
          type="number"
          min={1}
          max={99}
          value={form.personsAtPremises}
          onChange={(e) => onChange({ personsAtPremises: e.target.value })}
          className={inputClass}
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-gray-900">How the resident pays rent</legend>
        <p className="text-xs text-gray-600 leading-relaxed">{QLD_ITEM_11_HELPER}</p>
        <div>
          <label htmlFor="pf-qld-rent-method-1" className={labelClass}>
            Method 1
          </label>
          <input
            id="pf-qld-rent-method-1"
            type="text"
            value={form.rentPaymentMethod1}
            onChange={(e) => onChange({ rentPaymentMethod1: e.target.value })}
            className={inputClass}
            placeholder="e.g. Direct credit"
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="pf-qld-rent-method-2" className={labelClass}>
            Method 2
          </label>
          <input
            id="pf-qld-rent-method-2"
            type="text"
            value={form.rentPaymentMethod2}
            onChange={(e) => onChange({ rentPaymentMethod2: e.target.value })}
            className={inputClass}
            placeholder="e.g. BPAY"
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="pf-qld-rent-bank" className={labelClass}>
            Bank
          </label>
          <input
            id="pf-qld-rent-bank"
            type="text"
            value={form.rentPayeeBankName}
            onChange={(e) => onChange({ rentPayeeBankName: e.target.value })}
            className={inputClass}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="pf-qld-rent-account-name" className={labelClass}>
            Account name
          </label>
          <input
            id="pf-qld-rent-account-name"
            type="text"
            value={form.rentPayeeAccountName}
            onChange={(e) => onChange({ rentPayeeAccountName: e.target.value })}
            className={inputClass}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="pf-qld-rent-bsb" className={labelClass}>
            BSB
          </label>
          <input
            id="pf-qld-rent-bsb"
            type="text"
            inputMode="numeric"
            value={form.rentPayeeBsb}
            onChange={(e) => onChange({ rentPayeeBsb: e.target.value })}
            className={inputClass}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="pf-qld-rent-account-number" className={labelClass}>
            Account number
          </label>
          <input
            id="pf-qld-rent-account-number"
            type="text"
            inputMode="numeric"
            value={form.rentPayeeAccountNumber}
            onChange={(e) => onChange({ rentPayeeAccountNumber: e.target.value })}
            className={inputClass}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="pf-qld-rent-reference" className={labelClass}>
            Payment reference
          </label>
          <input
            id="pf-qld-rent-reference"
            type="text"
            value={form.rentPaymentReference}
            onChange={(e) => onChange({ rentPaymentReference: e.target.value })}
            className={inputClass}
            autoComplete="off"
          />
        </div>
      </fieldset>

      <div>
        <label htmlFor="pf-qld-rent-last-increased" className={labelClass}>
          Date rent was last increased for this room
        </label>
        <p className="text-xs text-gray-600 mt-0.5 mb-1">{QLD_ITEM_13_2_HELPER}</p>
        <input
          id="pf-qld-rent-last-increased"
          type="date"
          value={form.rentLastIncreasedOn}
          onChange={(e) => onChange({ rentLastIncreasedOn: e.target.value })}
          className={inputClass}
        />
      </div>

      <QldNoticeConsentFields
        legend="Notices to you (the provider)"
        helperText={QLD_ITEM_5_PROVIDER_HELPER}
        partyLabel="qld-provider"
        value={form.providerNotice}
        onChange={(providerNotice) => onChange({ providerNotice })}
        labelClass={labelClass}
        inputClass={inputClass}
      />
    </div>
  )
}

export function QldSharesKitchenOrBathroomField({
  value,
  onChange,
  labelClass,
}: {
  value: QldYesNo
  onChange: (v: QldYesNo) => void
  labelClass: string
}) {
  return (
    <div>
      <p className={labelClass}>Does the renter share a kitchen or bathroom with anyone else?</p>
      <p className="text-xs text-gray-600 mt-0.5 mb-2">
        Yes if they share a kitchen or bathroom with you or with another resident. No if this room has its own
        kitchen and bathroom.
      </p>
      <div className="flex flex-wrap gap-4">
        <label htmlFor="pf-qld-shares-yes" className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
          <input
            id="pf-qld-shares-yes"
            type="radio"
            name="pf-qld-shares"
            checked={value === 'yes'}
            onChange={() => onChange('yes')}
          />
          Yes
        </label>
        <label htmlFor="pf-qld-shares-no" className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
          <input
            id="pf-qld-shares-no"
            type="radio"
            name="pf-qld-shares"
            checked={value === 'no'}
            onChange={() => onChange('no')}
          />
          No
        </label>
      </div>
    </div>
  )
}
