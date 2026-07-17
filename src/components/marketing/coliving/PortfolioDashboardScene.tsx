import { motion, useReducedMotion } from 'framer-motion'
import { CORAL } from './tokens'

type RoomState = 'filled' | 'vacant' | 'signing'

type HouseCard = {
  name: string
  suburb: string
  rooms: RoomState[]
}

const HOUSES: HouseCard[] = [
  { name: 'Carlton Terraces', suburb: 'Carlton', rooms: ['filled', 'filled', 'vacant', 'signing'] },
  { name: 'Parkville Rooms', suburb: 'Parkville', rooms: ['filled', 'vacant', 'filled'] },
  { name: 'Kensington Share', suburb: 'Kensington', rooms: ['filled', 'filled', 'filled', 'vacant'] },
]

function RoomDot({ state, delay }: { state: RoomState; delay: number }) {
  const reduce = useReducedMotion()
  const color =
    state === 'filled' ? CORAL : state === 'signing' ? '#F59E0B' : '#E5E7EB'
  const label = state === 'filled' ? 'Filled' : state === 'signing' ? 'Signing' : 'Vacant'

  return (
    <motion.span
      title={label}
      aria-label={label}
      className="inline-block h-3 w-3 rounded-full sm:h-3.5 sm:w-3.5"
      style={{ backgroundColor: color }}
      animate={
        reduce
          ? undefined
          : state === 'vacant'
            ? { opacity: [0.45, 1, 0.45], scale: [1, 1.08, 1] }
            : state === 'signing'
              ? { opacity: [0.55, 1, 0.55] }
              : { scale: [1, 1.04, 1] }
      }
      transition={
        reduce
          ? undefined
          : {
              duration: state === 'vacant' ? 2.4 : 3.2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay,
            }
      }
    />
  )
}

type Props = {
  /** Slightly denser layout used by Moment 4. */
  expanded?: boolean
}

/**
 * Stylised multi-property occupancy board - coded illustration, not a screenshot.
 */
export default function PortfolioDashboardScene({ expanded = false }: Props) {
  const reduce = useReducedMotion()

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-2xl border border-[#FF6F61]/25 bg-gradient-to-br from-white via-[#FFF9F7] to-[#FDF0EC] p-4 shadow-sm sm:p-5 ${
        expanded ? 'lg:p-6' : ''
      }`}
      aria-hidden
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FF6F61]">Portfolio</p>
          <p className="mt-0.5 font-display text-lg font-bold text-gray-900 sm:text-xl">Your houses</p>
        </div>
        <div className="rounded-xl bg-white/80 px-2.5 py-1.5 text-right shadow-sm ring-1 ring-gray-100">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Rooms live</p>
          <p className="font-display text-base font-bold text-gray-900 sm:text-lg">11</p>
        </div>
      </div>

      <div className={`grid gap-3 ${expanded ? 'sm:grid-cols-1' : 'sm:grid-cols-1'}`}>
        {HOUSES.map((house, hi) => (
          <motion.div
            key={house.name}
            className="rounded-xl border border-gray-100 bg-white/90 p-3 shadow-sm sm:p-3.5"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduce ? 0 : 0.12 + hi * 0.1, duration: 0.45 }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{house.name}</p>
                <p className="text-xs text-gray-500">{house.suburb}</p>
              </div>
              <svg viewBox="0 0 40 32" className="h-7 w-9 shrink-0 text-[#FF6F61]/80" fill="currentColor">
                <path d="M20 2 L38 16 H32 V30 H8 V16 H2 Z" opacity="0.9" />
                <rect x="16" y="20" width="8" height="10" fill="white" opacity="0.85" />
              </svg>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {house.rooms.map((state, ri) => (
                <div
                  key={`${house.name}-${ri}`}
                  className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2 py-1.5 ring-1 ring-gray-100"
                >
                  <RoomDot state={state} delay={hi * 0.2 + ri * 0.15} />
                  <span className="text-[10px] font-medium text-gray-600">R{ri + 1}</span>
                </div>
              ))}
            </div>
            {expanded && hi === 0 && (
              <motion.div
                className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-[#FF6F61]/40 bg-[#FF6F61]/[0.06] px-2.5 py-2"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <span className="rounded-md bg-[#FF6F61] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Duplicate
                </span>
                <span className="text-[11px] text-gray-600">Room 3 copied across 3 sister houses</span>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#FF6F61]" /> Filled
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#F59E0B]" /> Signing
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-gray-200" /> Vacant
        </span>
      </div>
    </div>
  )
}
