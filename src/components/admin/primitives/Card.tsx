import type { CSSProperties, ReactNode } from 'react'

export interface CardProps {
  padding?: number
  hoverable?: boolean
  children: ReactNode
  className?: string
  style?: CSSProperties
}

/**
 * White surface with a 1px line, 16px radius, and `admin-card` shadow.
 *
 * `padding` is a pixel number (prototype convention) and renders inline so
 * pages can override per-context (e.g. dense tables vs. zone cards). When
 * `hoverable` is set, hover bumps to `admin-card-hover`.
 */
export function Card({ padding = 24, hoverable = false, children, className, style }: CardProps) {
  const cls = [
    'rounded-admin-lg border border-admin-line bg-white shadow-admin-card transition-shadow',
    hoverable ? 'hover:shadow-admin-card-hover' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls} style={{ padding, ...style }}>
      {children}
    </div>
  )
}
