import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import AiSparkleIcon from '../AiSparkleIcon'
import { useOpenAiChat } from '../../context/AiChatOpenContext'
import { isAppShellPath } from '../../lib/appShell'
import { ASK_AI_BUTTON_LABEL } from './chatAiLabels'

/** Property detail mobile sticky CTA — FAB sits above it. */
function propertyDetailHasStickyBar(pathname: string): boolean {
  return /^\/(listings|properties)\/[^/]+$/.test(pathname)
}

/**
 * Floating Ask AI — marketing / public / admin only.
 * App-shell routes use AppActionBar (mobile) or AppHeader (desktop) instead.
 */
export default function AskAiFab() {
  const { pathname } = useLocation()
  const openChat = useOpenAiChat()

  const mobileBottomClass = useMemo(() => {
    if (propertyDetailHasStickyBar(pathname)) {
      return 'max-md:bottom-[max(5rem,calc(0.75rem+env(safe-area-inset-bottom,0px)))]'
    }
    return 'max-md:bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))]'
  }, [pathname])

  if (isAppShellPath(pathname)) return null

  return (
    <button
      type="button"
      onClick={openChat}
      aria-label={ASK_AI_BUTTON_LABEL}
      className={[
        'touch-manipulation fixed z-[10000] flex min-h-[3rem] min-w-[3rem] flex-col items-center justify-center gap-0.5 rounded-full bg-[var(--quni-coral)] px-3 py-2 text-white shadow-sm',
        'hover:bg-[var(--quni-coral-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--quni-coral)]/40 focus:ring-offset-2',
        'max-md:right-4 md:bottom-6 md:right-6 md:min-h-0 md:min-w-0 md:px-4 md:py-3',
        mobileBottomClass,
      ].join(' ')}
    >
      <AiSparkleIcon className="h-5 w-5 shrink-0" />
      <span className="text-[10px] font-bold leading-none tracking-wide">AI</span>
    </button>
  )
}
