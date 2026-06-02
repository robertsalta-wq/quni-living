import { Link } from 'react-router-dom'
import type { UserDashboardCrumb } from '../../lib/userDashboardNav'

type Props = {
  segments: UserDashboardCrumb[]
  className?: string
}

export default function UserDashboardBreadcrumb({ segments, className = '' }: Props) {
  if (segments.length === 0) return null

  return (
    <nav
      className={`flex flex-nowrap items-center gap-x-2 min-w-0 w-full text-left text-sm text-stone-600 overflow-hidden ${className}`}
      aria-label="Breadcrumb"
    >
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1
        return (
          <span key={`${segment.label}-${index}`} className="flex min-w-0 items-center gap-x-2">
            {index > 0 ? (
              <span className="shrink-0 text-stone-300" aria-hidden>
                /
              </span>
            ) : null}
            {segment.to && !isLast ? (
              <Link to={segment.to} className="shrink-0 hover:text-stone-900 transition-colors">
                {segment.label}
              </Link>
            ) : (
              <span
                className={`min-w-0 truncate ${isLast ? 'text-[#FF6F61] font-medium' : 'text-stone-600'}`}
                title={segment.label}
                aria-current={isLast ? 'page' : undefined}
              >
                {segment.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
