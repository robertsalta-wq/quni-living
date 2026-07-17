import type { ReactNode } from 'react'
import SceneReveal from './SceneReveal'

type Props = {
  eyebrow: string
  title: string
  body: string
  visual: ReactNode
  reverse?: boolean
  tone?: 'white' | 'cream' | 'soft'
}

const toneClass = {
  white: 'bg-white',
  cream: 'bg-[#FDF8F5]',
  soft: 'bg-[#FDF0EC]',
} as const

/**
 * Full-width alternating operator moment: copy + coded visual.
 * Mobile stacks copy then visual; desktop alternates via `reverse`.
 */
export default function OperatorMoment({
  eyebrow,
  title,
  body,
  visual,
  reverse = false,
  tone = 'white',
}: Props) {
  return (
    <section className={`${toneClass[tone]} border-b border-gray-100`}>
      <div className="mx-auto max-w-site px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div
          className={`grid items-center gap-10 lg:gap-16 ${
            reverse ? 'lg:grid-cols-[1.05fr_0.95fr]' : 'lg:grid-cols-[0.95fr_1.05fr]'
          }`}
        >
          <SceneReveal className={reverse ? 'lg:order-2' : undefined}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF6F61] sm:text-xs">
              {eyebrow}
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
              {title}
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg">{body}</p>
          </SceneReveal>
          <SceneReveal className={reverse ? 'lg:order-1' : undefined} delay={0.08}>
            <div className="relative min-h-[280px] w-full sm:min-h-[320px] lg:min-h-[380px]">{visual}</div>
          </SceneReveal>
        </div>
      </div>
    </section>
  )
}
