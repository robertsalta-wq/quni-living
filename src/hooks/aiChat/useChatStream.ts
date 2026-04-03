import { useCallback, useMemo, useRef, useState } from 'react'
import type { UseChatStreamArgs, UseChatStreamResult, ChatStreamState } from '../../lib/aiChat/chatTypes'

/** Abort fetch + stream if the assistant never finishes (avoids stuck “Sending…” UI). */
const CHAT_STREAM_TIMEOUT_MS = 120_000

function extractErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return 'Something went wrong.'
  const obj = payload as { error?: unknown; message?: unknown }
  if (typeof obj.message === 'string' && obj.message.trim()) return obj.message.trim()
  return typeof obj.error === 'string' ? obj.error : 'Something went wrong.'
}

export function useChatStream(): UseChatStreamResult {
  const [state, setState] = useState<ChatStreamState>('idle')
  const [assistantText, setAssistantText] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const assistantTextRef = useRef<string>('')

  const abort = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const sendMessage = useCallback(
    async (args: UseChatStreamArgs) => {
      abortControllerRef.current?.abort()

      const controller = new AbortController()
      abortControllerRef.current = controller

      let abortedByTimeout = false
      const timeoutId = setTimeout(() => {
        abortedByTimeout = true
        controller.abort()
      }, CHAT_STREAM_TIMEOUT_MS)

      setState('streaming')
      setError(null)
      setAssistantText('')
      assistantTextRef.current = ''

      try {
        const chatPayload = { ...args }
        delete chatPayload.accessToken
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(args.accessToken ? { Authorization: `Bearer ${args.accessToken}` } : {}),
          },
          body: JSON.stringify(chatPayload),
          signal: controller.signal,
        })

        if (!res.ok) {
          clearTimeout(timeoutId)
          let payload: unknown = null
          try {
            payload = await res.json()
          } catch {
            payload = await res.text().catch(() => null)
          }

          const msg = extractErrorMessage(payload)
          setError(msg)
          setState('error')
          return
        }

        if (!res.body) {
          clearTimeout(timeoutId)
          setError('Chat response has no stream.')
          setState('error')
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder('utf-8')

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          if (!value) continue

          const chunk = decoder.decode(value, { stream: true })
          if (!chunk) continue

          assistantTextRef.current += chunk
          setAssistantText(assistantTextRef.current)
        }

        // Flush decoder.
        const tail = decoder.decode(undefined, { stream: false })
        if (tail) {
          assistantTextRef.current += tail
          setAssistantText(assistantTextRef.current)
        }

        clearTimeout(timeoutId)

        const assembled = assistantTextRef.current.trim()
        if (!assembled) {
          setError('No reply was received. Please try again.')
          setState('error')
          return
        }

        // Assistant row is persisted in /api/chat.ts after the stream completes.
        setState('done')
      } catch (e: unknown) {
        clearTimeout(timeoutId)
        if (e instanceof Error && e.name === 'AbortError') {
          if (abortedByTimeout) {
            setError('The reply took too long. Please try again or use New chat.')
            setState('error')
          } else {
            setError(null)
            setState('idle')
          }
          return
        }
        setError(e instanceof Error ? e.message : 'Something went wrong.')
        setState('error')
      }
    },
    [abortControllerRef],
  )

  const result: UseChatStreamResult = useMemo(
    () => ({
      state,
      assistantText,
      error,
      sendMessage,
      abort,
    }),
    [state, assistantText, error, sendMessage, abort],
  )

  return result
}

