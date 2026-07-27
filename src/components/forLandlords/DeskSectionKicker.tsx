type DeskSectionKickerProps = {
  index: string
  label: string
  className?: string
}

/** Engraved section label on cream windows — no brass plate. */
export default function DeskSectionKicker({ index, label, className = '' }: DeskSectionKickerProps) {
  return (
    <p className={['desk-kicker m-0', className].filter(Boolean).join(' ')}>
      {index} · {label}
    </p>
  )
}
