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
import { useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useInViewOnce } from './useInViewOnce'
import { CORAL, NEUTRAL_BAR, SIGNUP_LISTING } from './tokens'
import SceneReveal from './SceneReveal'

const SINGLE_ROOM = [
  { name: 'Agent (low)', fee: 300, fill: NEUTRAL_BAR },
  { name: 'Agent (high)', fee: 600, fill: '#9CA3AF' },
  { name: 'Quni', fee: 99, fill: CORAL },
]

const YEARLY = [
  { fills: 1, agent: 450, quni: 99 },
  { fills: 2, agent: 900, quni: 198 },
  { fills: 3, agent: 1350, quni: 297 },
  { fills: 4, agent: 1800, quni: 396 },
  { fills: 5, agent: 2250, quni: 495 },
  { fills: 6, agent: 2700, quni: 594 },
]

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
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-gray-900">{label}</p>
      {payload.map((p) => (
        <p key={String(p.name)} className="mt-0.5 text-gray-600">
          <span style={{ color: p.color }}>{p.name}</span>: ${p.value?.toLocaleString('en-AU')}
        </p>
      ))}
    </div>
  )
}

/** Fee-comparison charts (arithmetic only - not performance claims). */
export default function FeeMathSection() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInViewOnce(ref, { threshold: 0.15, rootMargin: '0px' })
  const reduce = useReducedMotion()
  const play = reduce || inView

  return (
    <section ref={ref} className="border-b border-gray-100 bg-white" aria-labelledby="fee-math-heading">
      <div className="mx-auto max-w-site px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <SceneReveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF6F61] sm:text-xs">
            The math
          </p>
          <h2
            id="fee-math-heading"
            className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.75rem] lg:leading-tight"
          >
            Letting fees eat yield. Vacancy eats profit.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
            Fee comparisons for a $300/wk room - agent letting fee vs Quni Listing at $99 on
            acceptance. Fee comparison based on published fee schedules.
          </p>
        </SceneReveal>

        <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:gap-10">
          <SceneReveal delay={0.05}>
            <div className="rounded-2xl border border-gray-100 bg-[#FDF8F5] p-4 sm:p-6">
              <p className="text-sm font-semibold text-gray-900">One $300/wk room - letting fee</p>
              <p className="mt-1 text-xs text-gray-500">Agent 1-2 weeks&apos; rent vs Quni Listing $99</p>
              <div className="mt-4 flex flex-wrap items-end gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">Quni</p>
                  <p className="font-display text-4xl font-bold text-[#FF6F61] sm:text-5xl">
                    <CountUp to={99} play={play} />
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">Agent range</p>
                  <p className="font-display text-2xl font-bold text-gray-700 sm:text-3xl">$300-600</p>
                </div>
              </div>
              <div className="mt-4 h-[220px] w-full sm:h-[260px]">
                {play ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={SINGLE_ROOM} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#6B7280', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                      />
                      <YAxis hide />
                      <Tooltip content={<FeeTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
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
            <div className="rounded-2xl border border-gray-100 bg-[#FDF8F5] p-4 sm:p-6">
              <p className="text-sm font-semibold text-gray-900">Six room-fills in a year - cumulative fees</p>
              <p className="mt-1 text-xs text-gray-500">
                Agent mid (~$450/fill) vs Quni $99/fill. Gap shaded coral.
              </p>
              <div className="mt-4 flex flex-wrap items-end gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">Fee gap over 6 fills</p>
                  <p className="font-display text-4xl font-bold text-[#FF6F61] sm:text-5xl">
                    <CountUp to={2106} play={play} />
                  </p>
                </div>
              </div>
              <div className="mt-4 h-[220px] w-full sm:h-[260px]">
                {play ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={YEARLY} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colivingGap" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CORAL} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={CORAL} stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="fills"
                        tickFormatter={(v) => (v === 1 ? '1 fill' : `${v} fills`)}
                        tick={{ fill: '#6B7280', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis hide />
                      <Tooltip content={<FeeTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="agent"
                        name="Agent"
                        stroke="#9CA3AF"
                        strokeWidth={2}
                        fill="url(#colivingGap)"
                        isAnimationActive={!reduce}
                        animationDuration={1000}
                      />
                      <Area
                        type="monotone"
                        dataKey="quni"
                        name="Quni"
                        stroke={CORAL}
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
            <div className="rounded-2xl border border-[#FF6F61]/25 bg-white p-5 shadow-sm sm:p-6">
              <p className="font-display text-xl font-bold text-gray-900">Quni Listing</p>
              <p className="mt-2 font-display text-3xl font-bold text-[#FF6F61]">$99</p>
              <p className="mt-1 text-sm text-gray-600">Flat on acceptance. Free to list.</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="font-display text-xl font-bold text-gray-900">Quni Managed</p>
              <p className="mt-2 font-display text-3xl font-bold text-gray-900">7%</p>
              <p className="mt-1 text-sm text-gray-600">Of weekly rent. Zero until acceptance.</p>
            </div>
          </div>
          <p className="mt-5 text-center text-base font-medium text-gray-800 sm:text-lg">
            You pay for outcomes, chosen per property.
          </p>
        </SceneReveal>
      </div>

      <div className="bg-[#FF6F61] px-4 py-12 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-site text-center">
          <h3 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Fill your next vacant room.
          </h3>
          <div className="mt-6">
            <Link
              to={SIGNUP_LISTING}
              className="inline-flex items-center justify-center rounded-xl border border-white/90 bg-white px-6 py-3 text-sm font-semibold text-[#FF6F61] shadow-md transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#FF6F61]"
            >
              Fill your next vacant room
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
