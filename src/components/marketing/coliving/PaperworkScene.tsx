import { useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useInViewOnce } from './useInViewOnce'
import { CORAL } from './tokens'

const LINES = [
  { w: '72%', accent: true },
  { w: '100%', accent: false },
  { w: '94%', accent: false },
  { w: '88%', accent: false },
  { w: '96%', accent: false },
  { w: '70%', accent: false },
  { w: '100%', accent: false },
  { w: '82%', accent: false },
] as const

/** Document draws line-by-line; signature completes on scroll entry. */
export default function PaperworkScene() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInViewOnce(ref)
  const reduce = useReducedMotion()
  const play = reduce || inView

  return (
    <div
      ref={ref}
      className="relative flex h-full min-h-[280px] items-center justify-center sm:min-h-[320px]"
      aria-hidden
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-md sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FF6F61]">
              Agreement
            </p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900">Jurisdiction-correct draft</p>
          </div>
          <span className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600">
            Auto-selected
          </span>
        </div>

        <div className="space-y-2.5">
          {LINES.map((line, i) => (
            <motion.div
              key={i}
              className={`h-2 origin-left rounded-full ${
                line.accent ? 'bg-[#FF6F61]/35' : 'bg-gray-100'
              }`}
              style={{ width: line.w }}
              initial={reduce ? false : { scaleX: 0, opacity: 0 }}
              animate={play ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
              transition={{
                delay: reduce ? 0 : 0.15 + i * 0.09,
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          ))}
        </div>

        <div className="mt-6 border-t border-dashed border-gray-200 pt-4">
          <p className="text-[10px] uppercase tracking-wide text-gray-400">Landlord signature</p>
          <svg viewBox="0 0 220 48" className="mt-1 h-12 w-full text-[#1a1a1a]" fill="none">
            <motion.path
              d="M8 32 C 28 8, 42 40, 58 24 S 88 10, 102 28 S 130 44, 148 22 S 180 8, 208 30"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              animate={play ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
              transition={{ delay: reduce ? 0 : 1.05, duration: 1.1, ease: 'easeInOut' }}
            />
          </svg>
          <motion.p
            className="mt-1 text-xs font-medium"
            style={{ color: CORAL }}
            initial={reduce ? false : { opacity: 0 }}
            animate={play ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: reduce ? 0 : 2 }}
          >
            Signed · parties complete
          </motion.p>
        </div>
      </div>
    </div>
  )
}
