import { useMemo, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useInViewOnce } from './useInViewOnce'
import { CORAL } from './tokens'

const BUBBLE_COUNT = 40

const APPLICANTS = [
  { name: 'A. Chen', badge: 'ID verified', detail: 'Passport + liveness' },
  { name: 'J. Okonkwo', badge: 'Enrolment verified', detail: 'University email OTP' },
  { name: 'M. Patel', badge: 'AI fit assessment', detail: 'Rules, dates, budget aligned' },
] as const

function seededPositions(count: number) {
  const out: { x: number; y: number; w: number; delay: number }[] = []
  let seed = 17
  for (let i = 0; i < count; i++) {
    seed = (seed * 16807) % 2147483647
    const r1 = (seed % 1000) / 1000
    seed = (seed * 16807) % 2147483647
    const r2 = (seed % 1000) / 1000
    seed = (seed * 16807) % 2147483647
    const r3 = (seed % 1000) / 1000
    out.push({
      x: 4 + r1 * 88,
      y: 6 + r2 * 78,
      w: 42 + r3 * 36,
      delay: (i % 12) * 0.03,
    })
  }
  return out
}

/** Forty noisy bubbles collapse into three verified applicant cards. */
export default function ShortlistScene() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInViewOnce(ref)
  const reduce = useReducedMotion()
  const bubbles = useMemo(() => seededPositions(BUBBLE_COUNT), [])
  const collapsed = inView && !reduce

  return (
    <div
      ref={ref}
      className="relative h-full min-h-[280px] w-full overflow-hidden rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:min-h-[320px] sm:p-4"
      aria-hidden
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
        {collapsed ? 'Shortlist' : 'Inbox'}
      </p>

      <div className="relative h-[240px] w-full sm:h-[280px] lg:h-[320px]">
        <AnimatePresence>
          {!collapsed &&
            bubbles.map((b, i) => (
              <motion.div
                key={`b-${i}`}
                className="absolute rounded-2xl rounded-bl-sm bg-gray-100 px-2 py-1.5 text-[9px] text-gray-500 shadow-sm"
                style={{
                  left: `${b.x}%`,
                  top: `${b.y}%`,
                  width: b.w,
                  transform: 'translate(-50%, -50%)',
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.55 + (i % 5) * 0.08, scale: 1 }}
                exit={{
                  opacity: 0,
                  scale: 0.4,
                  x: (1.5 - (i % 3)) * 40,
                  y: 80 + (i % 4) * 10,
                  transition: { duration: 0.45, delay: b.delay },
                }}
              >
                <span className="block h-1.5 w-[70%] rounded bg-gray-300/80" />
                <span className="mt-1 block h-1 w-[45%] rounded bg-gray-200" />
              </motion.div>
            ))}
        </AnimatePresence>

        <div className="absolute inset-x-0 bottom-0 top-8 flex flex-col justify-end gap-2.5 sm:gap-3">
          {APPLICANTS.map((a, i) => (
            <motion.div
              key={a.badge}
              className="rounded-xl border border-gray-100 bg-[#FDF8F5] p-3 shadow-sm ring-1 ring-[#FF6F61]/15"
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={
                reduce || collapsed
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 24 }
              }
              transition={{ delay: reduce ? 0 : 0.35 + i * 0.12, duration: 0.45 }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">{a.name}</p>
                <span
                  className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold text-white"
                  style={{ backgroundColor: CORAL }}
                >
                  {a.badge}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{a.detail}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
