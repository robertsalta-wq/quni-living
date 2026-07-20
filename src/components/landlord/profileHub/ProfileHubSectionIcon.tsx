import type { ReactNode, SVGProps } from 'react'
import type { LandlordProfileHubSectionId } from './profileHubSections'

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

/** Neutral glyphs for profile hub rows — same tile treatment as Listing Health. */
export function ProfileHubSectionIcon({ id }: { id: LandlordProfileHubSectionId }) {
  switch (id) {
    case 'personal':
      return (
        <Svg>
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </Svg>
      )
    case 'address':
      return (
        <Svg>
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
          <circle cx="12" cy="10" r="3" />
        </Svg>
      )
    case 'about':
      return (
        <Svg>
          <rect x="3" y="4.5" width="18" height="15" rx="2" />
          <circle cx="8.5" cy="10" r="1.6" />
          <path d="M21 16l-5-5-8 8" />
        </Svg>
      )
    case 'agreements':
      return (
        <Svg>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 17h5" />
        </Svg>
      )
    case 'payouts':
      return (
        <Svg>
          <rect x="2.5" y="6" width="19" height="12" rx="2" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M6 9v6M18 9v6" />
        </Svg>
      )
    case 'insurance':
      return (
        <Svg>
          <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
          <path d="M9 12l2 2 4-4" />
        </Svg>
      )
    case 'languages':
      return (
        <Svg>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" />
        </Svg>
      )
  }
}
