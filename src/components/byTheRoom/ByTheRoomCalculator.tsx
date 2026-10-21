import { useId, useState } from 'react'
import DeskPen from '../desk/DeskPen'
import '../desk/desk.css'
import { formatAud } from '../../lib/formatAud'
import {
  BY_THE_ROOM_DISCLAIMER,
  BY_THE_ROOM_FEE_LINE,
  BY_THE_ROOM_LIST_PATH,
  ROOMS_MAX,
  ROOMS_MIN,
  WEEKS_PER_YEAR,
  evaluateByTheRoom,
  parseResidentCount,
  visibleStateNote,
  type ByTheRoomStateCode,
} from '../../lib/byTheRoom'

const fieldClass =
  'w-full max-w-xs rounded-admin-md border border-admin-line bg-admin-surface-1 px-3 py-2 text-sm text-admin-ink shadow-admin-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-coral'

const stepBtnClass =
  'inline-flex h-9 w-9 items-center justify-center bg-admin-surface-2 text-base font-semibold text-admin-ink-2 hover:bg-admin-coral-tint disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-coral'

const STATUS_COPY = {
  'need-rents': 'Enter your weekly rents to see your figures.',
  'need-furnishing-years': 'Enter how many years to spread the furnishing cost.',
  'empty-weeks': `Empty weeks has to be between 0 and ${WEEKS_PER_YEAR}.`,
} as const

function keepMoneyDraft(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, '')
  const [whole, ...rest] = cleaned.split('.')
  if (rest.length === 0) return whole ?? ''
  return `${whole}.${rest.join('').slice(0, 2)}`
}

function keepIntDraft(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 4)
}

function blankToZero(value: string): string {
  return value.trim() === '' ? '0' : value
}

function showMoney(amount: number | null): string {
  if (amount == null || !Number.isFinite(amount)) return '-'
  return formatAud(amount)
}

type MoneyFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  hint?: string
}

function MoneyField({ id, label, value, onChange, onBlur, hint }: MoneyFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-admin-ink">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="mb-1 text-xs text-admin-ink-5">
          {hint}
        </p>
      ) : null}
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(keepMoneyDraft(e.target.value))}
        onBlur={onBlur}
        inputMode="decimal"
        autoComplete="off"
        aria-describedby={hintId}
        className={fieldClass}
      />
    </div>
  )
}

/** Landlord comparison. Rents stay blank until typed. Costs default to 0. */
export default function ByTheRoomCalculator() {
  const [wholeHome, setWholeHome] = useState('')
  const [rooms, setRooms] = useState(ROOMS_MIN)
  const [differentRents, setDifferentRents] = useState(false)
  const [sharedRent, setSharedRent] = useState('')
  const [roomRents, setRoomRents] = useState<string[]>([''])
  const [utilities, setUtilities] = useState('0')
  const [internet, setInternet] = useState('0')
  const [furnishing, setFurnishing] = useState('0')
  const [furnishingYears, setFurnishingYears] = useState('')
  const [emptyWeeks, setEmptyWeeks] = useState('0')
  const [stateCode, setStateCode] = useState<ByTheRoomStateCode | ''>('')
  const [residentsRaw, setResidentsRaw] = useState('')
  const residentsHintId = useId()
  const statusId = useId()

  function setRoomCount(next: number) {
    const clamped = Math.min(ROOMS_MAX, Math.max(ROOMS_MIN, next))
    setRooms(clamped)
    setRoomRents((prev) => {
      const copy = prev.slice(0, clamped)
      while (copy.length < clamped) copy.push('')
      return copy
    })
  }

  const rentsForCalc = differentRents
    ? roomRents.slice(0, rooms)
    : Array.from({ length: rooms }, () => sharedRent)

  const evaluation = evaluateByTheRoom({
    wholeHomeWeekly: wholeHome,
    roomRentsWeekly: rentsForCalc,
    utilitiesWeekly: utilities,
    internetWeekly: internet,
    furnishingOnce: furnishing,
    furnishingYears,
    emptyWeeks,
  })

  const figures = evaluation.status === 'ready' ? evaluation.figures : null
  const residents = parseResidentCount(residentsRaw)
  const note = visibleStateNote(stateCode, residents)

  const rows: {
    label: string
    detail?: string
    weekly: number | null
    annual: number | null
    emphasis?: boolean
  }[] = [
    { label: 'Current income', weekly: figures?.currentWeekly ?? null, annual: figures?.currentAnnual ?? null },
    {
      label: 'By the room, gross',
      weekly: figures?.grossWeekly ?? null,
      annual: figures?.grossAnnual ?? null,
    },
    {
      label: 'By the room, net',
      detail: 'After your costs and empty weeks',
      weekly: figures?.netWeekly ?? null,
      annual: figures?.netAnnual ?? null,
    },
    {
      label: 'Difference',
      detail: 'Net minus what you get now',
      weekly: figures?.differenceWeekly ?? null,
      annual: figures?.differenceAnnual ?? null,
      emphasis: true,
    },
  ]

  return (
    <div className="mt-6 max-w-3xl">
      <form
        className="flex flex-col gap-8"
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <fieldset className="flex flex-col gap-4">
          <legend className="font-display text-lg font-bold text-admin-ink">What you get now</legend>
          <MoneyField
            id="btr-whole-home"
            label="Whole home ($/wk)"
            value={wholeHome}
            onChange={setWholeHome}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="font-display text-lg font-bold text-admin-ink">By the room</legend>
          <div className="flex items-center justify-between gap-3 max-w-xs">
            <span id="btr-rooms-label" className="text-sm font-medium text-admin-ink">
              Rooms to let
            </span>
            <div
              className="inline-flex overflow-hidden rounded-admin-md border border-admin-line"
              role="group"
              aria-labelledby="btr-rooms-label"
            >
              <button
                type="button"
                aria-label="One room fewer"
                disabled={rooms <= ROOMS_MIN}
                onClick={() => setRoomCount(rooms - 1)}
                className={stepBtnClass}
              >
                −
              </button>
              <span
                className="flex min-w-9 items-center justify-center border-x border-admin-line font-display text-base font-bold tabular-nums text-admin-ink"
                aria-live="polite"
              >
                {rooms}
              </span>
              <button
                type="button"
                aria-label="One room more"
                disabled={rooms >= ROOMS_MAX}
                onClick={() => setRoomCount(rooms + 1)}
                className={stepBtnClass}
              >
                +
              </button>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-admin-ink">
            <input
              type="checkbox"
              checked={differentRents}
              onChange={(e) => {
                const on = e.target.checked
                setDifferentRents(on)
                if (!on) return
                setRoomRents((prev) => {
                  const copy = prev.slice(0, rooms)
                  while (copy.length < rooms) copy.push('')
                  return copy.map((rent) => (rent.trim() === '' ? sharedRent : rent))
                })
              }}
              className="h-4 w-4 accent-admin-coral focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-coral"
            />
            Different rent for each room
          </label>

          {differentRents ? (
            <div className="flex flex-col gap-3">
              {roomRents.slice(0, rooms).map((rent, index) => (
                <MoneyField
                  key={`room-${index}`}
                  id={`btr-room-rent-${index + 1}`}
                  label={`Room ${index + 1} ($/wk)`}
                  value={rent}
                  onChange={(next) =>
                    setRoomRents((prev) => {
                      const copy = prev.slice()
                      copy[index] = next
                      return copy
                    })
                  }
                />
              ))}
            </div>
          ) : (
            <MoneyField
              id="btr-shared-rent"
              label="Rent per room ($/wk)"
              value={sharedRent}
              onChange={setSharedRent}
            />
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="font-display text-lg font-bold text-admin-ink">Costs you would take on</legend>
          <p className="m-0 max-w-xl text-sm text-admin-ink-4">
            Optional. Each starts at $0. Utilities and internet run all {WEEKS_PER_YEAR} weeks, including empty weeks.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyField
              id="btr-utilities"
              label="Utilities ($/wk)"
              value={utilities}
              onChange={setUtilities}
              onBlur={() => setUtilities((v) => blankToZero(v))}
            />
            <MoneyField
              id="btr-internet"
              label="Internet ($/wk)"
              value={internet}
              onChange={setInternet}
              onBlur={() => setInternet((v) => blankToZero(v))}
            />
            <MoneyField
              id="btr-furnishing"
              label="Furnishing, one-off ($)"
              value={furnishing}
              onChange={setFurnishing}
              onBlur={() => setFurnishing((v) => blankToZero(v))}
            />
            <div>
              <label htmlFor="btr-furnishing-years" className="mb-1 block text-sm font-medium text-admin-ink">
                Spread furnishing over (years)
              </label>
              <p id="btr-years-hint" className="mb-1 text-xs text-admin-ink-5">
                Needed when furnishing is more than $0.
              </p>
              <input
                id="btr-furnishing-years"
                value={furnishingYears}
                onChange={(e) => setFurnishingYears(keepIntDraft(e.target.value))}
                inputMode="numeric"
                autoComplete="off"
                aria-describedby="btr-years-hint"
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="btr-empty-weeks" className="mb-1 block text-sm font-medium text-admin-ink">
                Expected empty weeks per year
              </label>
              <p id="btr-empty-hint" className="mb-1 text-xs text-admin-ink-5">
                0 to {WEEKS_PER_YEAR}. Empty weeks reduce rent only.
              </p>
              <input
                id="btr-empty-weeks"
                value={emptyWeeks}
                onChange={(e) => setEmptyWeeks(keepIntDraft(e.target.value))}
                onBlur={() => setEmptyWeeks((v) => blankToZero(v))}
                inputMode="numeric"
                autoComplete="off"
                aria-describedby="btr-empty-hint"
                className={fieldClass}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="font-display text-lg font-bold text-admin-ink">State and household</legend>
          <div>
            <label htmlFor="btr-state" className="mb-1 block text-sm font-medium text-admin-ink">
              State
            </label>
            <select
              id="btr-state"
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value as ByTheRoomStateCode | '')}
              className={fieldClass}
            >
              <option value="">Select state</option>
              <option value="NSW">NSW</option>
              <option value="QLD">QLD</option>
            </select>
          </div>
          <div>
            <label htmlFor="btr-residents" className="mb-1 block text-sm font-medium text-admin-ink">
              How many people will live there in total? <span className="font-normal text-admin-ink-5">Required</span>
            </label>
            <p id={residentsHintId} className="mb-1 max-w-xl text-xs text-admin-ink-5">
              A room can hold more than one person. Count everyone who would live there.
            </p>
            <input
              id="btr-residents"
              value={residentsRaw}
              onChange={(e) => setResidentsRaw(keepIntDraft(e.target.value))}
              inputMode="numeric"
              autoComplete="off"
              aria-required="true"
              aria-describedby={residentsHintId}
              className={fieldClass}
            />
          </div>
          {note ? (
            <p role="note" className="max-w-xl rounded-admin-md border border-admin-line bg-admin-surface-1 px-4 py-3 text-sm text-admin-ink">
              {note}
            </p>
          ) : null}
        </fieldset>
      </form>

      <section className="mt-8" aria-labelledby="btr-figures-heading">
        <h2 id="btr-figures-heading" className="font-display text-lg font-bold text-admin-ink">
          Your figures
        </h2>
        <p id={statusId} role="status" aria-live="polite" className="mt-2 text-sm text-admin-ink-3">
          {evaluation.status === 'ready' ? 'Figures use only the amounts you entered.' : STATUS_COPY[evaluation.status]}
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full max-w-xl text-sm text-admin-ink">
            <caption className="sr-only">Your figures, weekly and annual</caption>
            <thead>
              <tr className="border-b border-admin-line text-xs font-semibold uppercase tracking-wide text-admin-ink-5">
                <th scope="col" className="py-2 pr-3 text-left font-semibold">
                  <span className="sr-only">Line</span>
                </th>
                <th scope="col" className="py-2 px-3 text-right font-semibold">
                  Weekly
                </th>
                <th scope="col" className="py-2 pl-3 text-right font-semibold">
                  Annual
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-admin-line">
                  <th scope="row" className={`py-2 pr-3 text-left font-medium ${row.emphasis ? 'font-bold' : ''}`}>
                    {row.label}
                    {row.detail ? <span className="mt-0.5 block text-xs font-normal text-admin-ink-5">{row.detail}</span> : null}
                  </th>
                  <td className={`py-2 px-3 text-right tabular-nums ${row.emphasis ? 'font-bold' : ''}`}>
                    {showMoney(row.weekly)}
                  </td>
                  <td className={`py-2 pl-3 text-right tabular-nums ${row.emphasis ? 'font-bold' : ''}`}>
                    {showMoney(row.annual)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-admin-ink-5">{BY_THE_ROOM_DISCLAIMER}</p>
      </section>

      <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <DeskPen to={BY_THE_ROOM_LIST_PATH} variant="coral" className="!w-auto self-start">
          List my rooms <span className="desk-pen-arw" aria-hidden>→</span>
        </DeskPen>
        <p className="m-0 text-sm text-admin-ink-3">{BY_THE_ROOM_FEE_LINE}</p>
      </div>
    </div>
  )
}
