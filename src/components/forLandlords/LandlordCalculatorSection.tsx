import { useState, type CSSProperties } from 'react'
import { LedgerCalculator, RENT_DEFAULT } from '../desk'
import DeskSectionKicker from './DeskSectionKicker'
import { feeInDays } from '../../lib/forLandlordsState'
import { ACCEPTANCE_FEE_AUD } from '../../lib/forLandlordsSections'

type LandlordCalculatorSectionProps = {
  onRentChange?: (rent: number) => void
  className?: string
  style?: CSSProperties
}

/** Section 7 — calculator demoted to a cream window + fee-in-days line. */
export default function LandlordCalculatorSection({
  onRentChange,
  className = '',
  style,
}: LandlordCalculatorSectionProps) {
  const [rent, setRent] = useState(RENT_DEFAULT)

  function handleRentChange(next: number) {
    setRent(next)
    onRentChange?.(next)
  }

  const days = feeInDays(rent)

  return (
    <section
      className={[
        'desk-settle desk-bg-numbers-wash flex flex-col gap-[var(--space-3)] rounded-[var(--radius-lg)]',
        'border border-[var(--quni-cream-border)] p-[var(--space-4)] shadow-[var(--shadow-1)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      aria-labelledby="landlord-numbers-heading"
    >
      <DeskSectionKicker index="05" label="Your number" />
      <h2
        id="landlord-numbers-heading"
        className="m-0 font-display text-quni-h4 font-normal text-[var(--quni-ink-2)]"
      >
        One spare room, or the whole house.
      </h2>
      <div className="max-w-md">
        <LedgerCalculator compact onRentChange={handleRentChange} />
      </div>
      <p className="m-0 text-quni-caption font-semibold text-[var(--quni-ink-3)]">
        The ${ACCEPTANCE_FEE_AUD} — paid once, and only if you accept — is about{' '}
        <span className="font-extrabold text-[var(--quni-coral-active)]">{days}</span> days of this
        rent.
      </p>
    </section>
  )
}
