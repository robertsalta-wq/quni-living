import AiSparkleIcon from '../AiSparkleIcon'
import { useOpenAiChat } from '../../context/AiChatOpenContext'
import { ASK_AI_BUTTON_LABEL } from './chatAiLabels'

/** Desktop app-shell Ask AI — trailing header cluster (same opener as the FAB / action bar). */
export default function AskAiHeaderControl() {
  const openChat = useOpenAiChat()
  return (
    <button
      type="button"
      onClick={openChat}
      aria-label={ASK_AI_BUTTON_LABEL}
      className="inline-flex items-center gap-1.5 rounded-full text-[var(--quni-coral)] hover:text-[var(--quni-coral-active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
    >
      <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[var(--quni-coral)] text-white">
        <AiSparkleIcon className="h-3.5 w-3.5 shrink-0" />
      </span>
      <span className="text-sm font-semibold leading-none">{ASK_AI_BUTTON_LABEL}</span>
    </button>
  )
}
