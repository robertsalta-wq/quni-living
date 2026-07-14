import { useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useInViewOnce } from './useInViewOnce'

type Route = {
  room: string
  path: 'authority' | 'landlord'
}

const ROUTES: Route[] = [
  { room: 'Room 1', path: 'authority' },
  { room: 'Room 2', path: 'landlord' },
  { room: 'Room 3', path: 'authority' },
  { room: 'Room 4', path: 'landlord' },
]

/**
 * Animated bond routing diagram.
 * Destinations: bond authority or landlord - never Quni.
 * Avoids: "we hold", "custody", "escrow".
 */
export default function BondRoutingScene() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInViewOnce(ref)
  const reduce = useReducedMotion()
  const play = reduce || inView

  return (
    <div
      ref={ref}
      className="relative h-full min-h-[280px] w-full overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:min-h-[320px] sm:p-5"
      aria-hidden
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FF6F61]">Bond routing</p>
      <p className="mt-1 text-sm font-semibold text-gray-900">Per room, per arrangement</p>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:gap-3">
        <div className="space-y-2.5">
          {ROUTES.map((r, i) => (
            <motion.div
              key={r.room}
              className="rounded-lg border border-gray-100 bg-[#FDF8F5] px-2.5 py-2 text-xs font-medium text-gray-800"
              initial={reduce ? false : { opacity: 0, x: -12 }}
              animate={play ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }}
              transition={{ delay: reduce ? 0 : 0.1 + i * 0.08 }}
            >
              {r.room}
            </motion.div>
          ))}
        </div>

        <svg viewBox="0 0 80 200" className="h-[200px] w-14 sm:w-16" fill="none">
          {ROUTES.map((r, i) => {
            const y = 18 + i * 48
            const endY = r.path === 'authority' ? 40 : 160
            return (
              <g key={r.room}>
                <motion.path
                  d={`M 4 ${y} C 28 ${y}, 40 ${endY}, 76 ${endY}`}
                  stroke={r.path === 'authority' ? '#FF6F61' : '#9CA3AF'}
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                  animate={play ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                  transition={{ delay: reduce ? 0 : 0.35 + i * 0.12, duration: 0.7 }}
                />
                <motion.circle
                  cx="76"
                  cy={endY}
                  r="3.5"
                  fill={r.path === 'authority' ? '#FF6F61' : '#6B7280'}
                  initial={reduce ? false : { opacity: 0, scale: 0 }}
                  animate={play ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                  transition={{ delay: reduce ? 0 : 0.9 + i * 0.12 }}
                />
              </g>
            )
          })}
        </svg>

        <div className="flex h-[200px] flex-col justify-between py-1">
          <motion.div
            className="rounded-xl border border-[#FF6F61]/30 bg-[#FF6F61]/[0.08] p-3"
            initial={reduce ? false : { opacity: 0, x: 12 }}
            animate={play ? { opacity: 1, x: 0 } : { opacity: 0, x: 12 }}
            transition={{ delay: reduce ? 0 : 0.5 }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#FF6F61]">
              Bond authority
            </p>
            <p className="mt-1 text-xs leading-snug text-gray-600">Lodged where the law requires</p>
            <p className="mt-2 font-display text-lg font-bold text-gray-900">Receipt issued</p>
          </motion.div>
          <motion.div
            className="rounded-xl border border-gray-200 bg-gray-50 p-3"
            initial={reduce ? false : { opacity: 0, x: 12 }}
            animate={play ? { opacity: 1, x: 0 } : { opacity: 0, x: 12 }}
            transition={{ delay: reduce ? 0 : 0.65 }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Landlord-held
            </p>
            <p className="mt-1 text-xs leading-snug text-gray-600">When the arrangement allows it</p>
            <p className="mt-2 font-display text-lg font-bold text-gray-900">You hold it</p>
          </motion.div>
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] text-gray-500">Quni never holds the bond</p>
    </div>
  )
}
