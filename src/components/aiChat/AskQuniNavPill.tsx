import { useOpenAiChat } from '../../context/AiChatOpenContext'
import AiSparkleIcon from '../AiSparkleIcon'
import { ASK_QUNI_PILL_LABEL } from './chatAiLabels'

const pillClass =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--quni-coral-border)] bg-[var(--quni-coral-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--quni-coral-active)] shadow-sm hover:bg-admin-coral/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)] sm:text-[13px]'

type Props = {
  className?: string
  /** Hide on very small screens when a docked bar covers the same action. */
  hideOnNarrow?: boolean
}

/** Desktop/header pill — opens the existing chat panel (never auto-opens). */
export default function AskQuniNavPill({ className = '', hideOnNarrow = false }: Props) {
  const openChat = useOpenAiChat()
  return (
    <button
      type="button"
      onClick={() => openChat()}
      className={[pillClass, hideOnNarrow ? 'hidden sm:inline-flex' : '', className]
        .filter(Boolean)
        .join(' ')}
      aria-label={ASK_QUNI_PILL_LABEL}
    >
      <AiSparkleIcon className="h-3.5 w-3.5 shrink-0" />
      {ASK_QUNI_PILL_LABEL}
    </button>
  )
}
