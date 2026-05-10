/**
 * Admin UI primitives barrel.
 *
 * Page code imports from `src/components/admin/primitives` only — never
 * directly from a primitive file. Keeps the surface narrow and rename-safe.
 */
export { Button } from './Button'
export type { ButtonProps, ButtonKind, ButtonSize } from './Button'

export { Pill } from './Pill'
export type { PillProps, PillTone, PillDot } from './Pill'

export { Card } from './Card'
export type { CardProps } from './Card'

export { Eyebrow } from './Eyebrow'
export type { EyebrowProps, EyebrowTone } from './Eyebrow'

export { Sparkline } from './Sparkline'
export type { SparklineProps, SparklineColor } from './Sparkline'

export { EmptyState } from './EmptyState'
export type { EmptyStateProps } from './EmptyState'

export { LoadingState } from './LoadingState'
export type { LoadingStateProps } from './LoadingState'

export { ErrorState } from './ErrorState'
export type { ErrorStateProps } from './ErrorState'
