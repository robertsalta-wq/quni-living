import type { VicRoomingPayMethods } from '../../../api/lib/tenancy/vicRoomingHouse'

export type VicRoomingHouseFieldValues = {
  capacity: string
  roomNumber: string
  itemsLet: string
  houseRules: string
  licenceNumber: string
  registrationNumber: string
  operatorAcceptsElectronicService: boolean | null
  attestationCurrent: boolean
  unsharedWeeklyRent: string
  pay: VicRoomingPayMethods
}

export const VIC_ROOMING_FURNISHED_ITEMS_LET = 'Bed, mattress, desk, chair, wardrobe'

function FieldHint({ children }: { children: string }) {
  return <span className="mt-1 block text-xs text-admin-ink-5">{children}</span>
}

const PAY_ROWS: { key: keyof VicRoomingPayMethods; label: string }[] = [
  { key: 'bankDeposit', label: 'Bank deposit (fee-free). The account on this listing is printed on the agreement.' },
  { key: 'bpay', label: 'BPAY (fee-free). No biller code is stored. The tick is printed on its own.' },
  { key: 'otherEft', label: 'Other electronic method, including Centrepay (fee-free). No Centrepay details are stored.' },
  { key: 'directDebit', label: 'Direct debit (not fee-free, so it cannot be the only method).' },
  { key: 'cash', label: 'Cash (not fee-free).' },
  { key: 'cheque', label: 'Cheque or money order (not fee-free).' },
]

export function emptyVicRoomingHouseFieldValues(): VicRoomingHouseFieldValues {
  return {
    capacity: '',
    roomNumber: '',
    itemsLet: '',
    houseRules: '',
    licenceNumber: '',
    registrationNumber: '',
  operatorAcceptsElectronicService: null,
  attestationCurrent: false,
  unsharedWeeklyRent: '',
  pay: {
      directDebit: false,
      bankDeposit: false,
      cash: false,
      cheque: false,
      bpay: false,
      otherEft: false,
    },
  }
}

export function VicRoomingHouseFields({
  showRoomingFields,
  showUnsharedRent,
  values,
  onChange,
}: {
  showRoomingFields: boolean
  showUnsharedRent: boolean
  values: VicRoomingHouseFieldValues
  onChange: (next: VicRoomingHouseFieldValues) => void
}) {
  const setPay = (key: keyof VicRoomingPayMethods, checked: boolean) => {
    onChange({ ...values, pay: { ...values.pay, [key]: checked } })
  }
  return (
    <div className="space-y-4 rounded-admin-md border border-admin-line bg-admin-surface-1 p-4">
      <label className="block text-sm text-admin-ink-2">
        <span className="font-semibold">How many people can the building hold in total?</span>
        <input
          className="mt-1 w-full rounded-admin-md border border-admin-line px-3 py-2"
          inputMode="numeric"
          value={values.capacity}
          onChange={(e) => onChange({ ...values, capacity: e.target.value })}
        />
        <FieldHint>This decides which Victorian agreement the resident signs.</FieldHint>
      </label>
      {showRoomingFields ? (
        <>
          {showUnsharedRent ? (
            <label className="block text-sm text-admin-ink-2">
              <span className="font-semibold">Weekly rent if this room were not shared ($)</span>
              <input
                id="pf-unshared-weekly-rent"
                className="mt-1 w-full rounded-admin-md border border-admin-line px-3 py-2"
                inputMode="decimal"
                value={values.unsharedWeeklyRent}
                onChange={(e) => onChange({ ...values, unsharedWeeklyRent: e.target.value })}
              />
              <FieldHint>Printed on the shared room notice. It must be higher than the weekly rent the resident pays.</FieldHint>
            </label>
          ) : null}
          <label className="block text-sm text-admin-ink-2">
            <span className="font-semibold">Room number</span>
            <input
              className="mt-1 w-full rounded-admin-md border border-admin-line px-3 py-2"
              value={values.roomNumber}
              onChange={(e) => onChange({ ...values, roomNumber: e.target.value })}
            />
            <FieldHint>Printed on the resident's agreement.</FieldHint>
          </label>
          <label className="block text-sm text-admin-ink-2">
            <span className="font-semibold">Items let with the room</span>
            <textarea
              className="mt-1 w-full rounded-admin-md border border-admin-line px-3 py-2"
              rows={2}
              value={values.itemsLet}
              onChange={(e) => onChange({ ...values, itemsLet: e.target.value })}
            />
            <FieldHint>Printed on the resident's agreement.</FieldHint>
          </label>
          <label className="block text-sm text-admin-ink-2">
            <span className="font-semibold">House rules</span>
            <textarea
              className="mt-1 w-full rounded-admin-md border border-admin-line px-3 py-2"
              rows={4}
              value={values.houseRules}
              onChange={(e) => onChange({ ...values, houseRules: e.target.value })}
            />
            <FieldHint>The resident signs these words. This is the only house rules text on the agreement.</FieldHint>
          </label>
          <label className="block text-sm text-admin-ink-2">
            <span className="font-semibold">Council registration number</span>
            <input
              className="mt-1 w-full rounded-admin-md border border-admin-line px-3 py-2"
              value={values.registrationNumber}
              onChange={(e) => onChange({ ...values, registrationNumber: e.target.value })}
            />
            <FieldHint>Required to publish. Quni records it and does not check the register.</FieldHint>
          </label>
          <label className="block text-sm text-admin-ink-2">
            <span className="font-semibold">Operator licence number</span>
            <input
              className="mt-1 w-full rounded-admin-md border border-admin-line px-3 py-2"
              value={values.licenceNumber}
              onChange={(e) => onChange({ ...values, licenceNumber: e.target.value })}
            />
            <FieldHint>Required to publish. Quni records it and does not check the register.</FieldHint>
          </label>
          <fieldset className="space-y-2 text-sm text-admin-ink-2">
            <legend className="font-semibold">How can the resident pay rent?</legend>
            <FieldHint>Printed as the payment boxes on the resident's agreement.</FieldHint>
            {PAY_ROWS.map((row) => (
              <label key={row.key} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={values.pay[row.key]}
                  onChange={(e) => setPay(row.key, e.target.checked)}
                />
                <span>{row.label}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="space-y-2 text-sm text-admin-ink-2">
            <legend className="font-semibold">Can Quni email you notices about this agreement?</legend>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="vic-operator-email"
                checked={values.operatorAcceptsElectronicService === true}
                onChange={() => onChange({ ...values, operatorAcceptsElectronicService: true })}
              />
              Yes
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="vic-operator-email"
                checked={values.operatorAcceptsElectronicService === false}
                onChange={() => onChange({ ...values, operatorAcceptsElectronicService: false })}
              />
              No. The agreement cannot be sent, because Quni sends it by email.
            </label>
            <FieldHint>Printed on the resident's agreement. Quni sends the agreement by email.</FieldHint>
          </fieldset>
          <label className="flex items-start gap-2 text-sm text-admin-ink-2">
            <input
              type="checkbox"
              className="mt-1"
              checked={values.attestationCurrent}
              onChange={(e) => onChange({ ...values, attestationCurrent: e.target.checked })}
            />
            <span>
              The council registration and the operator licence are both current.
              <FieldHint>Quni records this declaration and does not check the register.</FieldHint>
            </span>
          </label>
        </>
      ) : null}
    </div>
  )
}
