/**
 * Composite admin UI patterns barrel.
 *
 * One level above primitives - these are tuned to a specific layout role
 * (Living Console zone cards, attention strip, Marketplace Pulse cells, etc.)
 * and shouldn't be reused outside the admin redesign without justification.
 */
export { AttentionStrip } from './AttentionStrip'
export type { AttentionStripProps, AttentionItem, AttentionTone } from './AttentionStrip'

export { ZoneCard } from './ZoneCard'
export type { ZoneCardProps, ZoneCardRow, ZoneIconTone, ZoneRowTone } from './ZoneCard'

export { MarketplacePulseCell } from './MarketplacePulseCell'
export type { MarketplacePulseCellProps, PulseDeltaTone } from './MarketplacePulseCell'

export { ChipFilter } from './ChipFilter'
export type { ChipFilterProps, ChipFilterOption } from './ChipFilter'

export { DetailDrawer } from './DetailDrawer'
export type { DetailDrawerProps } from './DetailDrawer'

export { Tabs } from './Tabs'
export type { TabsProps, TabItem } from './Tabs'
