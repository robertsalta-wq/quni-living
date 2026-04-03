import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChatMessage, ListingContext } from '../../lib/aiChat/chatTypes'
import { fetchListingContextBlockForChat } from '../../lib/aiChat/fetchListingContextBlock'
import { useAuthContext } from '../../context/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useChatStream } from '../../hooks/aiChat/useChatStream'
import { usePersona } from '../../hooks/aiChat/usePersona'
import { useVisitorSessionId } from '../../hooks/aiChat/useVisitorSessionId'
import ChatMessageBubble from './ChatMessageBubble'
import ChatPromptChips from './ChatPromptChips'
import TurnstileGate from './TurnstileGate'

type Props = {
  variant: 'widget' | 'embed'
  listingContext?: ListingContext
  onClose?: () => void
}

function generateConversationId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `c_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function trimToLastMessages(all: ChatMessage[], maxMessages: number): ChatMessage[] {
  if (all.length <= maxMessages) return all
  return all.slice(all.length - maxMessages)
}

function useIsMobileBreakpoint(maxWidthPx: number): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(`(max-width: ${maxWidthPx}px)`).matches
  })

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidthPx}px)`)
    const onChange = () => setIsMobile(mq.matches)
    // Initial sync.
    setIsMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => {
      mq.removeEventListener('change', onChange)
    }
  }, [maxWidthPx])

  return isMobile
}

export default function ChatPanel({ variant, listingContext, onClose }: Props) {
  const { session } = useAuthContext()
  const { personaKey, firstName } = usePersona()
  const visitorSessionId = useVisitorSessionId()
  const chatStream = useChatStream()

  const conversationId = useMemo(() => generateConversationId(), [])

  // Rolling window: 10 user+assistant pairs = 20 messages.
  const MAX_MESSAGES = 20

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState<string>('')
  const [localError, setLocalError] = useState<string | null>(null)

  const [hasEverFocused, setHasEverFocused] = useState(false)

  const pendingAssistantCommitRef = useRef<boolean>(false)

  const isMobile = useIsMobileBreakpoint(640)
  const composerRef = useRef<HTMLTextAreaElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  const isStreaming = chatStream.state === 'streaming'

  /** Last Turnstile token for visitors; reused on every /api/chat call until persona changes (not cleared per send). */
  const [storedVisitorTurnstileToken, setStoredVisitorTurnstileToken] = useState<string | null>(null)

  /** Remount TurnstileGate after “New chat” so the widget can issue a new token if needed. */
  const [visitorTurnstileGateKey, setVisitorTurnstileGateKey] = useState(0)

  const showVisitorTurnstileGate = personaKey === 'visitor' && messages.length === 0

  useEffect(() => {
    if (personaKey !== 'visitor') setStoredVisitorTurnstileToken(null)
  }, [personaKey])

  const title = useMemo(() => {
    if (personaKey === 'landlord') return 'AI for landlords'
    if (personaKey === 'student_renter') return 'AI for renters'
    return 'Quni assistant'
  }, [personaKey])

  const placeholder = useMemo(() => {
    if (personaKey === 'landlord') return 'Ask for help drafting…'
    if (personaKey === 'student_renter') return 'Ask about listings, suburbs, or fit…'
    return 'Ask a question about Quni…'
  }, [personaKey])

  const scrollToBottom = useCallback(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [])

  useEffect(() => {
    // When messages or streaming output changes, keep the view pinned to the latest content.
    scrollToBottom()
  }, [messages, chatStream.assistantText, scrollToBottom])

  useEffect(() => {
    // Commit assistant text only after the stream completes.
    if (chatStream.state !== 'done') return
    if (!pendingAssistantCommitRef.current) return
    pendingAssistantCommitRef.current = false

    const finalText = chatStream.assistantText.trim()
    if (!finalText) return

    setMessages((prev) => trimToLastMessages([...prev, { role: 'assistant', content: finalText }], MAX_MESSAGES))
    // assistant is committed only after stream ends
  }, [chatStream.assistantText, chatStream.state])

  useEffect(() => {
    if (chatStream.state === 'error') {
      pendingAssistantCommitRef.current = false
    }
  }, [chatStream.state])

  useEffect(() => {
    return () => {
      chatStream.abort()
    }
  }, [chatStream])

  const send = useCallback(
    async (turnstileToken: string | null) => {
      const trimmed = draft.trim()
      if (!trimmed) {
        setLocalError('Message cannot be empty.')
        return
      }
      if (isStreaming) return

      setLocalError(null)
      const userMessage: ChatMessage = { role: 'user', content: trimmed }
      const nextMessagesForRequest = trimToLastMessages([...messages, userMessage], MAX_MESSAGES)

      // Commit user message immediately so the conversation feels instant.
      setMessages(nextMessagesForRequest)

      // Clear draft so the UI resets immediately.
      setDraft('')

      pendingAssistantCommitRef.current = true
      // assistant will be committed by the effect when streaming completes

      let listingContextBlock: string | undefined
      if (personaKey === 'student_renter' && listingContext && isSupabaseConfigured) {
        try {
          listingContextBlock = await fetchListingContextBlockForChat(supabase, listingContext)
        } catch {
          listingContextBlock = undefined
        }
      }

      const incomingTurnstile = turnstileToken?.trim() || null
      if (personaKey === 'visitor' && incomingTurnstile) {
        setStoredVisitorTurnstileToken(incomingTurnstile)
      }
      const turnstileForRequest =
        personaKey === 'visitor'
          ? incomingTurnstile ?? storedVisitorTurnstileToken ?? undefined
          : undefined

      const args = {
        messages: nextMessagesForRequest,
        userMessage: trimmed,
        listingContext,
        listingContextBlock,
        firstName: firstName ?? undefined,
        chatPersona: personaKey,
        visitorSessionId: personaKey === 'visitor' ? visitorSessionId ?? undefined : undefined,
        turnstileToken: turnstileForRequest,
        conversationId,
        accessToken: session?.access_token,
      }

      if (personaKey === 'visitor' && !visitorSessionId) {
        pendingAssistantCommitRef.current = false
        setLocalError('Your session has expired. Please reload and try again.')
        return
      }

      await chatStream.sendMessage(args)
    },
    [
      chatStream,
      draft,
      isStreaming,
      listingContext,
      messages,
      personaKey,
      storedVisitorTurnstileToken,
      visitorSessionId,
      conversationId,
      session?.access_token,
    ],
  )

  const clearChat = useCallback(() => {
    if (isStreaming) chatStream.abort()
    setMessages([])
    setDraft('')
    setLocalError(null)
    pendingAssistantCommitRef.current = false
    if (personaKey === 'visitor') setVisitorTurnstileGateKey((k) => k + 1)
  }, [chatStream, isStreaming, personaKey])

  const onPickChip = useCallback((prompt: string) => {
    setDraft(prompt)
    if (!hasEverFocused) setHasEverFocused(true)
    // Focus after state updates.
    window.setTimeout(() => composerRef.current?.focus(), 0)
  }, [hasEverFocused])

  const handleSendClick = useCallback(() => {
    void send(null)
  }, [send])

  const commonPanelClass = variant === 'widget' ? 'fixed bottom-6 right-6 z-[1000]' : 'w-full'

  const panelCardClass = isMobile
    ? 'fixed inset-0 z-[1000] bg-white'
    : commonPanelClass

  const cardInnerClass = isMobile
    ? 'flex flex-col h-full'
    : 'w-[420px] max-w-[calc(100%-2rem)] rounded-2xl border border-gray-100 bg-white shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)]'

  const showClose = Boolean(onClose)

  return (
    <div className={panelCardClass}>
      <div className={cardInnerClass}>
        <div
          className={[
            'flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100',
            isMobile ? 'sticky top-0 bg-white' : '',
          ].join(' ')}
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
            {firstName ? <p className="text-xs text-gray-500">Hi {firstName}</p> : <p className="text-xs text-gray-500">Ask me anything.</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearChat}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              {messages.length === 0 ? 'Reset' : 'New chat'}
            </button>
            {showClose ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                aria-label="Close chat"
              >
                Close
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, idx) => (
              <ChatMessageBubble key={`${idx}-${m.role}-${m.content.slice(0, 12)}`} role={m.role} text={m.content} />
            ))}

            {isStreaming ? (
              <ChatMessageBubble role="assistant" text={chatStream.assistantText} isStreaming />
            ) : null}

            {messages.length === 0 ? (
              <div className="pt-2">
                <ChatPromptChips personaKey={personaKey} onPick={onPickChip} disabled={isStreaming} />
              </div>
            ) : null}
          </div>

          {localError || chatStream.error ? (
            <div className="px-4 py-2">
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
                {localError ?? chatStream.error ?? 'Something went wrong.'}
              </p>
            </div>
          ) : null}

          <div className="border-t border-gray-100 px-4 py-3 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (showVisitorTurnstileGate) {
                  // TurnstileGate handles verification; user can press the send button there.
                  return
                }
                handleSendClick()
              }}
              className="space-y-3"
            >
              <label className="sr-only" htmlFor="quni-chat-input">
                Chat input
              </label>

              <textarea
                id="quni-chat-input"
                ref={composerRef}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value)
                  setLocalError(null)
                }}
                rows={3}
                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm leading-relaxed text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/30 focus:border-[#FF6F61] bg-white"
                placeholder={placeholder}
                disabled={isStreaming}
                onFocus={() => setHasEverFocused(true)}
              />

              {showVisitorTurnstileGate ? (
                <TurnstileGate
                  key={visitorTurnstileGateKey}
                  sending={isStreaming}
                  buttonLabel="Send message"
                  onSend={async (turnstileToken) => {
                    await send(turnstileToken)
                  }}
                />
              ) : (
                <button
                  type="submit"
                  disabled={
                    isStreaming ||
                    !draft.trim() ||
                    (personaKey === 'visitor' && !visitorSessionId) ||
                    (personaKey === 'visitor' && messages.length > 0 && !storedVisitorTurnstileToken)
                  }
                  className="w-full rounded-xl bg-[#FF6F61] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#e85d52] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isStreaming ? 'Sending…' : 'Send'}
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

