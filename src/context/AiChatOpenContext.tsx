import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import ChatPanel from '../components/aiChat/ChatPanel'

type AiChatOpenContextValue = {
  openChat: () => void
  isChatOpen: boolean
}

const AiChatOpenContext = createContext<AiChatOpenContextValue | null>(null)

/** Hosts the AI chat panel and exposes `openChat` for action bar, desktop header, and marketing FAB. */
export function AiChatOpenProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const openChat = useCallback(() => setOpen(true), [])
  const close = useCallback(() => setOpen(false), [])
  const value = useMemo(() => ({ openChat, isChatOpen: open }), [openChat, open])

  return (
    <AiChatOpenContext.Provider value={value}>
      {children}
      {open ? <ChatPanel variant="widget" onClose={close} /> : null}
    </AiChatOpenContext.Provider>
  )
}

/** Opens the AI chat panel — shared by action bar, desktop header, and marketing FAB. */
export function useOpenAiChat(): () => void {
  const ctx = useContext(AiChatOpenContext)
  return ctx?.openChat ?? (() => {})
}

/** True while the chat panel is mounted — the FAB hides so it never floats over the panel. */
export function useIsAiChatOpen(): boolean {
  return useContext(AiChatOpenContext)?.isChatOpen ?? false
}
