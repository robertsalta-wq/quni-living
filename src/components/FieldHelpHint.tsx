import { useState, type ReactNode } from 'react'

type Props = {
  label: string
  children: ReactNode
}

/** Touch-friendly explainer beside a form label. */
export default function FieldHelpHint({ label, children }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle">
      <button
        type="button"
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-[11px] font-bold text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </button>
      {open ? (
        <span className="block w-full basis-full text-xs font-normal text-gray-600 leading-relaxed max-w-lg mt-1">
          {children}
        </span>
      ) : null}
    </span>
  )
}
