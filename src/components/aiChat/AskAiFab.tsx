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
 * Floating Ask AI — mobile, outside the authenticated app shell.
 * Desktop uses the header control; mobile app-shell routes use AppActionBar.
 * Open to everyone, signed in or not.
 */
export default function AskAiFab() {
  const { pathname } = useLocation()
  const openChat = useOpenAiChat()

  const bottomClass = useMemo(() => {
    if (propertyDetailHasStickyBar(pathname)) {
      return 'bottom-[max(5rem,calc(0.75rem+env(safe-area-inset-bottom,0px)))]'
    }
    return 'bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))]'
  }, [pathname])

  if (isAppShellPath(pathname)) return null

  return (
    <button
      type="button"
      onClick={openChat}
      aria-label={ASK_AI_BUTTON_LABEL}
      className={[
        'touch-manipulation fixed right-4 z-[10000] flex min-h-[3rem] min-w-[3rem] flex-col items-center justify-center gap-0.5 rounded-full bg-[var(--quni-coral)] px-3 py-2 text-white shadow-sm md:hidden',
        'hover:bg-[var(--quni-coral-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--quni-coral)]/40 focus:ring-offset-2',
        bottomClass,
      ].join(' ')}
    >
      <AiSparkleIcon className="h-5 w-5 shrink-0" />
      <span className="text-[10px] font-bold leading-none tracking-wide">AI</span>
    </button>
  )
}
