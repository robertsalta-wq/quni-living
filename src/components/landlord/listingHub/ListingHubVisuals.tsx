import type { ReactNode, SVGProps } from 'react'
import type { ListingHubSectionId, ListingHubSectionStatus } from '../../../lib/listingEditHubHealth'

function Svg(props: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  const { children, ...rest } = props
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  )
}

export function ListingHubSectionIcon({ id }: { id: ListingHubSectionId }) {
  switch (id) {
    case 'basic':
      return (
        <Svg>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-4" />
          <path d="M12 8.5h.01" />
        </Svg>
      )
    case 'property':
      return (
        <Svg>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5" />
          <path d="M9.5 21v-6h5v6" />
        </Svg>
      )
    case 'inclusions':
      return (
        <Svg>
          <path d="M4 4.5h6v6H4z" />
          <path d="M14 4.5h6v6h-6z" />
          <path d="M14 13.5h6v6h-6z" />
          <path d="M4 13.5h6v6H4z" />
        </Svg>
      )
    case 'rules':
      return (
        <Svg>
          <path d="M9 4.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-13a2 2 0 0 0-2-2h-2" />
          <path d="M9 4.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4.5V5.5H9z" />
          <path d="M9 12h6" />
          <path d="M9 16h4" />
        </Svg>
      )
    case 'location':
      return (
        <Svg>
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
          <circle cx="12" cy="10" r="3" />
        </Svg>
      )
    case 'description':
      return (
        <Svg>
          <path d="M4 6.5h16" />
          <path d="M4 12h16" />
          <path d="M4 17.5h10" />
        </Svg>
      )
    case 'pricing':
      return (
        <Svg>
          <path d="M12 2.5v19" />
          <path d="M16.5 6H9.75a3.25 3.25 0 0 0 0 6.5h4.5a3.25 3.25 0 0 1 0 6.5H7" />
        </Svg>
      )
    case 'photos':
      return (
        <Svg>
          <path d="M4 4.5h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1z" />
          <circle cx="8.5" cy="9" r="1.6" />
          <path d="M21 15.5l-5-5-8 8" />
        </Svg>
      )
  }
}

export function ListingHubStatusDot({
  status,
  label,
}: {
  status: ListingHubSectionStatus
  label?: string
}) {
  const aria =
    label ??
    (status === 'complete' ? 'Complete' : status === 'attention' ? 'Needs attention' : 'Not started')

  if (status === 'complete') {
    return (
      <span
        className="inline-flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full bg-[var(--quni-success)] text-white"
        aria-label={aria}
        title={aria}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 12.5l5 5L20 6"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    )
  }
  if (status === 'attention') {
    return (
      <span
        className="inline-flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full bg-[var(--quni-warning)] text-[14px] font-extrabold leading-none text-white"
        aria-label={aria}
        title={aria}
      >
        !
      </span>
    )
  }
  return (
    <span
      className="inline-block h-[23px] w-[23px] shrink-0 rounded-full border-2 border-[#CFC9D3] bg-white"
      aria-label={aria}
      title={aria}
    />
  )
}

/**
 * Quality ring — label centred over the SVG; stroke colour is green only at 100%.
 * Ring stays 82px; type is sized so the widest label ("100%") spans ~65% of the
 * inner diameter (~57px) and never touches the stroke.
 */
export function ListingHubQualityRing({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score))
  const complete = clamped >= 100
  const r = 52
  const c = 2 * Math.PI * r
  const off = c * (1 - clamped / 100)
  const stroke = complete ? 'var(--quni-success)' : 'var(--quni-coral)'
  const track = complete ? 'var(--quni-success-bg)' : 'var(--quni-coral-tint-15)'

  return (
    <div className="relative h-[82px] w-[82px] shrink-0" aria-hidden>
      <svg
        className="absolute inset-0 h-full w-full"
        width={82}
        height={82}
        viewBox="0 0 132 132"
      >
        <circle cx={66} cy={66} r={r} fill="none" stroke={track} strokeWidth={12} />
        <circle
          cx={66}
          cy={66}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          transform="rotate(-90 66 66)"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="flex max-w-[70%] flex-col items-center leading-none">
          <span
            className="text-[var(--quni-ink)]"
            style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-sans)' }}
          >
            {clamped}%
          </span>
          <span
            className="mt-0.5 text-[var(--quni-ink-5)]"
            style={{
              fontSize: 7,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              letterSpacing: '0.06em',
            }}
          >
            QUALITY
          </span>
        </div>
      </div>
    </div>
  )
}
