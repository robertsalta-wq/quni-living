import AiSparkleIcon from '../AiSparkleIcon'
import { useOpenAiChat } from '../../context/AiChatOpenContext'
import { ASK_AI_BUTTON_LABEL } from './chatAiLabels'

/**
 * Header Ask AI control - marketing and desktop app shell.
 * Open to everyone (no auth gate); the panel handles visitor vs signed-in personas.
 */
export default function AskAiHeaderControl({ className = '' }: { className?: string }) {
  const openChat = useOpenAiChat()
  return (
    <button
      type="button"
      onClick={openChat}
      aria-label={ASK_AI_BUTTON_LABEL}
      className={[
        'inline-flex shrink-0 items-center gap-1.5 rounded-full text-[var(--quni-coral)] hover:text-[var(--quni-coral-active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[var(--quni-coral)] text-white">
        <AiSparkleIcon className="h-3.5 w-3.5 shrink-0" />
      </span>
      <span className="text-sm font-semibold leading-none">{ASK_AI_BUTTON_LABEL}</span>
    </button>
  )
}
