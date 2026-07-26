import { useOpenAiChat } from '../../context/AiChatOpenContext'
import AiSparkleIcon from '../AiSparkleIcon'
import { ASK_QUNI_PILL_LABEL } from './chatAiLabels'

/**
 * Slim docked Reception bar (marketing / non–app-shell mobile).
 * Opens the existing ChatPanel fullscreen on narrow viewports. Patient — never auto-opens.
 */
export default function AskQuniMobileDock() {
  const openChat = useOpenAiChat()

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[900] border-t border-[var(--quni-cream-border)] bg-[var(--quni-surface-1)]/95 px-3 pt-2 backdrop-blur-sm sm:hidden"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
    >
      <button
        type="button"
        onClick={() => openChat()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--quni-coral)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-1)] hover:bg-[var(--quni-coral-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
        aria-label={ASK_QUNI_PILL_LABEL}
      >
        <AiSparkleIcon className="h-4 w-4 shrink-0" />
        {ASK_QUNI_PILL_LABEL}
      </button>
    </div>
  )
}
