import { motion, useReducedMotion } from 'framer-motion'

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
    state === 'filled' ? '#22D3EE' : state === 'signing' ? '#F472B6' : 'rgba(255,255,255,0.25)'
  const glow =
    state === 'filled'
      ? '0 0 12px rgba(34,211,238,0.8)'
      : state === 'signing'
        ? '0 0 12px rgba(244,114,182,0.8)'
        : 'none'

  return (
    <motion.span
      className="inline-block h-3 w-3 rounded-full sm:h-3.5 sm:w-3.5"
      style={{ backgroundColor: color, boxShadow: glow }}
      animate={
        reduce
          ? undefined
          : state === 'vacant'
            ? { opacity: [0.35, 0.9, 0.35] }
            : { scale: [1, 1.12, 1] }
      }
      transition={reduce ? undefined : { duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  )
}

type Props = { expanded?: boolean }

export default function PortfolioDashboardScene({ expanded = false }: Props) {
  const reduce = useReducedMotion()

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-4 shadow-[0_0_40px_rgba(168,85,247,0.2)] backdrop-blur-md sm:p-5"
      aria-hidden
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">Portfolio</p>
          <p className="mt-0.5 font-display text-lg font-bold text-white sm:text-xl">Your houses</p>
        </div>
        <div className="rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 text-right backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Rooms live</p>
          <p className="font-display text-base font-bold text-fuchsia-300 sm:text-lg">11</p>
        </div>
      </div>

      <div className="grid gap-3">
        {HOUSES.map((house, hi) => (
          <motion.div
            key={house.name}
            className="rounded-xl border border-white/15 bg-slate-950/40 p-3 backdrop-blur-sm sm:p-3.5"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduce ? 0 : 0.12 + hi * 0.1, duration: 0.45 }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{house.name}</p>
                <p className="text-xs text-slate-400">{house.suburb}</p>
              </div>
              <svg viewBox="0 0 40 32" className="h-7 w-9 shrink-0 text-violet-400" fill="currentColor">
                <path d="M20 2 L38 16 H32 V30 H8 V16 H2 Z" opacity="0.9" />
                <rect x="16" y="20" width="8" height="10" fill="#020617" opacity="0.85" />
              </svg>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {house.rooms.map((state, ri) => (
                <div
                  key={`${house.name}-${ri}`}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5"
                >
                  <RoomDot state={state} delay={hi * 0.2 + ri * 0.15} />
                  <span className="text-[10px] font-medium text-slate-300">R{ri + 1}</span>
                </div>
              ))}
            </div>
            {expanded && hi === 0 && (
              <motion.div
                className="mt-3 flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-2"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <span className="rounded-md bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Duplicate
                </span>
                <span className="text-[11px] text-slate-300">Room 3 copied across 3 sister houses</span>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22D3EE]" /> Filled
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-fuchsia-400 shadow-[0_0_8px_#F472B6]" /> Signing
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-white/25" /> Vacant
        </span>
      </div>
    </div>
  )
}
