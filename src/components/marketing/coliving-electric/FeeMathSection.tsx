import { useEffect, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { motion, useReducedMotion } from 'framer-motion'
import { useInViewOnce } from '../coliving/useInViewOnce'
import SceneReveal from './SceneReveal'
import GlowCta from './GlowCta'

const SINGLE_ROOM = [
  { name: 'Agent (low)', fee: 300, fill: 'url(#barAgentLow)' },
  { name: 'Agent (high)', fee: 600, fill: 'url(#barAgentHigh)' },
  { name: 'Quni', fee: 99, fill: 'url(#barQuni)' },
]

const YEARLY = [
  { fills: 1, agent: 450, quni: 99 },
  { fills: 2, agent: 900, quni: 198 },
  { fills: 3, agent: 1350, quni: 297 },
  { fills: 4, agent: 1800, quni: 396 },
  { fills: 5, agent: 2250, quni: 495 },
  { fills: 6, agent: 2700, quni: 594 },
]

const PAY_STEPS = [
  { label: 'List free', detail: 'Every room, every house' },
  { label: 'Accept', detail: 'Verified shortlist' },
  { label: 'You pay', detail: '$99 Listing or 7%' },
] as const

function CountUp({ to, play }: { to: number; play: boolean }) {
  const reduce = useReducedMotion()
  const [n, setN] = useState(reduce ? to : 0)

  useEffect(() => {
    if (!play) return
    if (reduce) {
      setN(to)
      return
    }
    const start = performance.now()
    const dur = 900
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [play, to, reduce])

  return <>${n.toLocaleString('en-AU')}</>
}

function FeeTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value?: number; name?: string; color?: string }[]
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/20 bg-slate-950/90 px-3 py-2 text-xs text-white shadow-md backdrop-blur-md">
      <p className="font-semibold">{label}</p>
      {payload.map((p) => (
        <p key={String(p.name)} className="mt-0.5 text-slate-300">
          <span style={{ color: p.color }}>{p.name}</span>: ${p.value?.toLocaleString('en-AU')}
        </p>
      ))}
    </div>
  )
}

/** $99 fee vs $15,600 annual rent ($300/wk × 52) - arithmetic only. */
function FeeVsRentCircle({ play }: { play: boolean }) {
  const reduce = useReducedMotion()
  // Circumference ~ 2πr with r=54 → ~339. Fee slice ≈ 99/15600 of circle ≈ 0.63%
  const feeDash = 6
  const restDash = 333

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md sm:p-5">
      <p className="text-sm font-semibold text-white">Fee vs annual rent</p>
      <p className="mt-1 text-xs text-slate-400">$99 Listing on a $300/wk room ($15,600/yr)</p>
      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <svg viewBox="0 0 140 140" className="h-36 w-36">
          <defs>
            <linearGradient id="rentRing" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#22D3EE" />
            </linearGradient>
            <linearGradient id="feeSlice" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#F472B6" />
              <stop offset="100%" stopColor="#FB923C" />
            </linearGradient>
          </defs>
          <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
          <motion.circle
            cx="70"
            cy="70"
            r="54"
            fill="none"
            stroke="url(#rentRing)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${restDash} ${feeDash}`}
            transform="rotate(-90 70 70)"
            initial={reduce ? false : { pathLength: 0, opacity: 0 }}
            animate={play ? { pathLength: 1, opacity: 1 } : undefined}
            transition={{ duration: 1.1 }}
          />
          <motion.circle
            cx="70"
            cy="70"
            r="54"
            fill="none"
            stroke="url(#feeSlice)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${feeDash} ${restDash}`}
            strokeDashoffset={-restDash}
            transform="rotate(-90 70 70)"
            initial={reduce ? false : { opacity: 0 }}
            animate={play ? { opacity: 1 } : undefined}
            transition={{ delay: 0.4 }}
            style={{ filter: 'drop-shadow(0 0 8px #F472B6)' }}
          />
          <text x="70" y="66" textAnchor="middle" className="fill-white" style={{ fontSize: 22, fontWeight: 700 }}>
            $99
          </text>
          <text x="70" y="84" textAnchor="middle" className="fill-slate-400" style={{ fontSize: 10 }}>
            of $15.6k
          </text>
        </svg>
        <ul className="space-y-2 text-xs text-slate-300">
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" />
            Annual rent $15,600
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-fuchsia-400 to-orange-400 shadow-[0_0_10px_#F472B6]" />
            Quni Listing $99
          </li>
        </ul>
      </div>
    </div>
  )
}

function WhenYouPayTimeline({ play }: { play: boolean }) {
  const reduce = useReducedMotion()
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md sm:p-5">
      <p className="text-sm font-semibold text-white">When you pay</p>
      <p className="mt-1 text-xs text-slate-400">Zero until acceptance</p>
      <ol className="relative mt-8 grid grid-cols-3 gap-2">
        <div className="absolute left-[16%] right-[16%] top-4 h-px bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400" />
        {PAY_STEPS.map((step, i) => (
          <li key={step.label} className="relative flex flex-col items-center text-center">
            <motion.span
              className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-cyan-300 bg-slate-950 text-xs font-bold text-white shadow-[0_0_15px_rgba(34,211,238,0.85)]"
              initial={reduce ? false : { scale: 0.6, opacity: 0 }}
              animate={play ? { scale: 1, opacity: 1 } : undefined}
              transition={{ delay: reduce ? 0 : 0.15 + i * 0.15 }}
            >
              {i + 1}
            </motion.span>
            <p className="mt-3 text-xs font-semibold text-white sm:text-sm">{step.label}</p>
            <p className="mt-1 text-[10px] text-slate-400 sm:text-xs">{step.detail}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function FeeMathSection() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInViewOnce(ref, { threshold: 0.15, rootMargin: '0px' })
  const reduce = useReducedMotion()
  const play = reduce || inView

  return (
    <section ref={ref} className="relative border-b border-white/10" aria-labelledby="fee-math-heading">
      <div className="relative z-10 mx-auto max-w-site px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <SceneReveal>
          <p className="bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-[11px] font-semibold uppercase tracking-[0.2em] text-transparent sm:text-xs">
            The math
          </p>
          <h2
            id="fee-math-heading"
            className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-tight"
          >
            Letting fees eat yield. Vacancy eats profit.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Fee comparisons for a $300/wk room - agent letting fee vs Quni Listing at $99 on
            acceptance. Fee comparison based on published fee schedules.
          </p>
        </SceneReveal>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <SceneReveal>
            <FeeVsRentCircle play={play} />
          </SceneReveal>
          <SceneReveal delay={0.06}>
            <WhenYouPayTimeline play={play} />
          </SceneReveal>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-10">
          <SceneReveal delay={0.05}>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md sm:p-6">
              <p className="text-sm font-semibold text-white">One $300/wk room - letting fee</p>
              <p className="mt-1 text-xs text-slate-400">Agent 1-2 weeks&apos; rent vs Quni Listing $99</p>
              <div className="mt-4 flex flex-wrap items-end gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Quni</p>
                  <p className="bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text font-display text-4xl font-bold text-transparent sm:text-5xl">
                    <CountUp to={99} play={play} />
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Agent range</p>
                  <p className="font-display text-2xl font-bold text-slate-200 sm:text-3xl">$300-600</p>
                </div>
              </div>
              <div className="mt-4 h-[220px] w-full sm:h-[260px]">
                {play ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={SINGLE_ROOM} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barAgentLow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#64748B" />
                          <stop offset="100%" stopColor="#334155" />
                        </linearGradient>
                        <linearGradient id="barAgentHigh" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#94A3B8" />
                          <stop offset="100%" stopColor="#475569" />
                        </linearGradient>
                        <linearGradient id="barQuni" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F472B6" />
                          <stop offset="50%" stopColor="#A855F7" />
                          <stop offset="100%" stopColor="#22D3EE" />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#94A3B8', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                      />
                      <YAxis hide />
                      <Tooltip content={<FeeTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                      <Bar
                        dataKey="fee"
                        name="Fee"
                        radius={[8, 8, 0, 0]}
                        isAnimationActive={!reduce}
                        animationDuration={900}
                      >
                        {SINGLE_ROOM.map((d) => (
                          <Cell key={d.name} fill={d.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
            </div>
          </SceneReveal>

          <SceneReveal delay={0.1}>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md sm:p-6">
              <p className="text-sm font-semibold text-white">Six room-fills in a year - cumulative fees</p>
              <p className="mt-1 text-xs text-slate-400">
                Agent mid (~$450/fill) vs Quni $99/fill. Gap shaded violet/cyan.
              </p>
              <div className="mt-4 flex flex-wrap items-end gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Fee gap over 6 fills</p>
                  <p className="bg-gradient-to-r from-orange-400 to-fuchsia-400 bg-clip-text font-display text-4xl font-bold text-transparent sm:text-5xl">
                    <CountUp to={2106} play={play} />
                  </p>
                </div>
              </div>
              <div className="mt-4 h-[220px] w-full sm:h-[260px]">
                {play ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={YEARLY} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="electricGap" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#A855F7" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#22D3EE" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="fills"
                        tickFormatter={(v) => (v === 1 ? '1 fill' : `${v} fills`)}
                        tick={{ fill: '#94A3B8', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis hide />
                      <Tooltip content={<FeeTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="agent"
                        name="Agent"
                        stroke="#94A3B8"
                        strokeWidth={2}
                        fill="url(#electricGap)"
                        isAnimationActive={!reduce}
                        animationDuration={1000}
                      />
                      <Area
                        type="monotone"
                        dataKey="quni"
                        name="Quni"
                        stroke="#22D3EE"
                        strokeWidth={2.5}
                        fill="transparent"
                        isAnimationActive={!reduce}
                        animationDuration={1000}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
            </div>
          </SceneReveal>
        </div>

        <SceneReveal delay={0.12}>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/20 to-violet-600/10 p-5 shadow-[0_0_30px_rgba(244,114,182,0.2)] sm:p-6">
              <p className="font-display text-xl font-bold text-white">Quni Listing</p>
              <p className="mt-2 bg-gradient-to-r from-fuchsia-300 to-cyan-300 bg-clip-text font-display text-3xl font-bold text-transparent">
                $99
              </p>
              <p className="mt-1 text-sm text-slate-300">Flat on acceptance. Free to list.</p>
            </div>
            <div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/15 to-violet-600/10 p-5 sm:p-6">
              <p className="font-display text-xl font-bold text-white">Quni Managed</p>
              <p className="mt-2 font-display text-3xl font-bold text-cyan-300">7%</p>
              <p className="mt-1 text-sm text-slate-300">Of weekly rent. Zero until acceptance.</p>
            </div>
          </div>
          <p className="mt-5 text-center text-base font-medium text-slate-200 sm:text-lg">
            You pay for outcomes, chosen per property.
          </p>
        </SceneReveal>
      </div>

      <div className="relative overflow-hidden border-t border-white/10 bg-gradient-to-r from-fuchsia-600/40 via-violet-600/50 to-cyan-500/40 px-4 py-12 sm:px-6 sm:py-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(244,114,182,0.35),transparent_55%)]" />
        <div className="relative z-10 mx-auto max-w-site text-center">
          <h3 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Fill your next vacant room.
          </h3>
          <div className="mt-6 flex justify-center">
            <GlowCta />
          </div>
        </div>
      </div>
    </section>
  )
}
