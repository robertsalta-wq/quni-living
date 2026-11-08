import type { ReactNode } from 'react'

function ExampleStamp() {
  return (
    <div className="pointer-events-none absolute right-0 top-0 z-10 h-[4.5rem] w-[4.5rem] overflow-hidden" aria-hidden>
      <span className="absolute right-[-2.1rem] top-3 w-28 rotate-45 bg-[var(--quni-coral)] py-1 text-center text-[11px] font-bold uppercase tracking-wide text-white">
        Example
      </span>
    </div>
  )
}

/** Simple phone bezel. The only control inside a screen is passed in by that step. */
export default function DemoPhone({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[20rem] md:mx-0">
      <div className="rounded-[1.75rem] bg-[var(--quni-ink)] p-2 shadow-[var(--shadow-2)]">
        <div className="relative overflow-hidden rounded-[1.25rem] bg-[var(--quni-surface-1)]">
          <ExampleStamp />
          {children}
        </div>
      </div>
    </div>
  )
}
