import { Link } from 'react-router-dom'
import { SIGNUP_LISTING } from './tokens'

type Props = {
  className?: string
  children?: string
}

/** Sleek CTA with hover glow. */
export default function GlowCta({ className = '', children = 'Fill your next vacant room' }: Props) {
  return (
    <Link
      to={SIGNUP_LISTING}
      className={`group relative inline-flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(168,85,247,0.45)] transition duration-300 hover:shadow-[0_0_40px_rgba(34,211,238,0.55)] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-300/60 focus:ring-offset-2 focus:ring-offset-slate-950 sm:w-auto ${className}`}
    >
      <span className="absolute inset-0 translate-y-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-orange-400 opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100" />
      <span className="relative">{children}</span>
    </Link>
  )
}
