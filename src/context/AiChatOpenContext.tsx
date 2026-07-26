import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import ChatPanel from '../components/aiChat/ChatPanel'
import type { AudienceMode } from '../components/aiChat/ChatPromptChips'

export type OpenAiChatOptions = {
  /** Prefill the composer (e.g. from a suggested question). */
  draft?: string
  /** Reception desk audience for suggested questions inside the panel. */
  audienceMode?: AudienceMode
}

type AiChatOpenContextValue = {
  openChat: (opts?: OpenAiChatOptions) => void
}

const AiChatOpenContext = createContext<AiChatOpenContextValue | null>(null)

/** Hosts the AI chat panel and exposes `openChat` for nav / dock / desks (no FAB). */
export function AiChatOpenProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [seedDraft, setSeedDraft] = useState<string | undefined>(undefined)
  const [audienceMode, setAudienceMode] = useState<AudienceMode | undefined>(undefined)

  const openChat = useCallback((opts?: OpenAiChatOptions) => {
    if (opts?.draft != null) setSeedDraft(opts.draft)
    if (opts?.audienceMode != null) setAudienceMode(opts.audienceMode)
    setOpen(true)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    setSeedDraft(undefined)
  }, [])

  const value = useMemo(() => ({ openChat }), [openChat])

  return (
    <AiChatOpenContext.Provider value={value}>
      {children}
      {open ? (
        <ChatPanel
          variant="widget"
          onClose={close}
          audienceMode={audienceMode}
          initialDraft={seedDraft}
        />
      ) : null}
    </AiChatOpenContext.Provider>
  )
}

/** Opens the AI chat panel — patient; never auto-called on mount. */
export function useOpenAiChat(): (opts?: OpenAiChatOptions) => void {
  const ctx = useContext(AiChatOpenContext)
  return ctx?.openChat ?? (() => {})
}
