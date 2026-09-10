import { QldNoticeConsentFields } from '../tenancy/QldNoticeConsentFields'
import {
  formatPropertyPayoutBsbDisplay,
  propertyPayoutDetailsQldRoomingComplete,
  type PropertyPayoutDetailsInput,
} from '../../lib/propertyPayoutDetails'
import {
  QLD_ITEM_11_HELPER,
  QLD_ITEM_11_METHOD_2_BENEFIT_HELPER,
  QLD_ITEM_11_METHOD_2_COSTS_HELPER,
  QLD_ITEM_13_2_HELPER,
  QLD_ITEM_5_PROVIDER_HELPER,
  QLD_LEVEL_1_LOCKED_COPY,
  QLD_RENT_ACCOMMODATION_ONLY_HELPER,
  QLD_RENT_PAYMENT_METHOD_1_DIRECT_CREDIT,
  QLD_STUDENT_ACCOMMODATION_HELPER,
  type QldRoomingListingFormState,
  type QldYesNo,
} from '../../lib/tenancy/qldRoomingListingFields'

type Props = {
  form: QldRoomingListingFormState
  onChange: (patch: Partial<QldRoomingListingFormState>) => void
  payout: PropertyPayoutDetailsInput
  labelClass: string
  inputClass: string
}

const CHECKBOX_CLASS =
  'h-4 w-4 flex-shrink-0 rounded border-gray-300 accent-[var(--quni-rust)] cursor-pointer'

export function QldRoomingParticularsFields({ form, onChange, payout, labelClass, inputClass }: Props) {
  const payoutComplete = propertyPayoutDetailsQldRoomingComplete(payout)
  const bsbDisplay = payout.bsb ? formatPropertyPayoutBsbDisplay(payout.bsb) : ''

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
          <p className={labelClass}>Method 1</p>
          <p className="text-sm text-gray-900">{QLD_RENT_PAYMENT_METHOD_1_DIRECT_CREDIT}</p>
          <p className="text-xs text-gray-600 mt-0.5">
            Fee-free except the resident&apos;s usual bank fees. Not editable.
          </p>
          {payoutComplete ? (
            <dl className="mt-2 space-y-1 text-sm text-gray-800">
              <div>
                <dt className="inline text-xs text-gray-500">Bank: </dt>
                <dd className="inline">{payout.bank_name?.trim()}</dd>
              </div>
              <div>
                <dt className="inline text-xs text-gray-500">Account name: </dt>
                <dd className="inline">{payout.account_name?.trim()}</dd>
              </div>
              <div>
                <dt className="inline text-xs text-gray-500">BSB: </dt>
                <dd className="inline tabular-nums">{bsbDisplay}</dd>
              </div>
              <div>
                <dt className="inline text-xs text-gray-500">Account number: </dt>
                <dd className="inline tabular-nums">{payout.account_number?.trim()}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-xs text-amber-800/90">
              Enter the account in{' '}
              <a href="#section-pricing-availability" className="underline">
                Payee bank details
              </a>
              . Required to save or publish this listing.
            </p>
          )}
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
          <label htmlFor="pf-qld-rent-method-2-costs" className={labelClass}>
            Costs of method 2 for the resident
          </label>
          <p className="text-xs text-gray-600 mt-0.5 mb-1 leading-relaxed">{QLD_ITEM_11_METHOD_2_COSTS_HELPER}</p>
          <input
            id="pf-qld-rent-method-2-costs"
            type="text"
            value={form.rentPaymentMethod2Costs}
            onChange={(e) => onChange({ rentPaymentMethod2Costs: e.target.value })}
            className={inputClass}
            placeholder="None"
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="pf-qld-rent-method-2-benefit" className={labelClass}>
            Financial benefit you receive from method 2
          </label>
          <p className="text-xs text-gray-600 mt-0.5 mb-1 leading-relaxed">{QLD_ITEM_11_METHOD_2_BENEFIT_HELPER}</p>
          <input
            id="pf-qld-rent-method-2-benefit"
            type="text"
            value={form.rentPaymentMethod2FinancialBenefit}
            onChange={(e) => onChange({ rentPaymentMethod2FinancialBenefit: e.target.value })}
            className={inputClass}
            placeholder="None"
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
