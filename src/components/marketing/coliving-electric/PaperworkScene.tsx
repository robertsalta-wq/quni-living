import { useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useInViewOnce } from '../coliving/useInViewOnce'

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
      <div className="relative w-full max-w-sm rounded-2xl border border-white/20 bg-white/10 p-5 shadow-[0_0_40px_rgba(168,85,247,0.25)] backdrop-blur-md sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">Agreement</p>
            <p className="mt-0.5 text-sm font-semibold text-white">Jurisdiction-correct draft</p>
          </div>
          <span className="rounded-md border border-fuchsia-400/40 bg-fuchsia-500/20 px-2 py-1 text-[10px] font-medium text-fuchsia-200">
            Auto-selected
          </span>
        </div>

        <div className="space-y-2.5">
          {LINES.map((line, i) => (
            <motion.div
              key={i}
              className={`h-2 origin-left rounded-full ${
                line.accent
                  ? 'bg-gradient-to-r from-fuchsia-400 to-cyan-300'
                  : 'bg-gradient-to-r from-white/25 to-white/10'
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

        <div className="mt-6 border-t border-dashed border-white/15 pt-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Landlord signature</p>
          <svg viewBox="0 0 220 48" className="mt-1 h-12 w-full" fill="none">
            <defs>
              <linearGradient id="sigGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#F472B6" />
                <stop offset="50%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#22D3EE" />
              </linearGradient>
            </defs>
            <motion.path
              d="M8 32 C 28 8, 42 40, 58 24 S 88 10, 102 28 S 130 44, 148 22 S 180 8, 208 30"
              stroke="url(#sigGrad)"
              strokeWidth="2.4"
              strokeLinecap="round"
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              animate={play ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
              transition={{ delay: reduce ? 0 : 1.05, duration: 1.1, ease: 'easeInOut' }}
            />
          </svg>
          <motion.p
            className="mt-1 bg-gradient-to-r from-fuchsia-300 to-cyan-300 bg-clip-text text-xs font-medium text-transparent"
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
