import { useState, type FormEvent } from 'react'

type Props = {
  disabled?: boolean
  onSend: (body: string) => Promise<void>
  onTypingActivity?: () => void
  onTypingStop?: () => void
}

export default function MessageComposer({ disabled, onSend, onTypingActivity, onTypingStop }: Props) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text || sending || disabled) return
    setError(null)
    onTypingStop?.()
    setBody('')
    setSending(true)
    try {
      await onSend(text)
    } catch (err) {
      setBody(text)
      setError(err instanceof Error ? err.message : 'Could not send')
    } finally {
      setSending(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-gray-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      {error && (
        <p className="mb-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2 items-end">
        <textarea
          value={body}
          onChange={(e) => {
            const next = e.target.value
            setBody(next)
            if (next.trim()) onTypingActivity?.()
            else onTypingStop?.()
          }}
          onBlur={() => {
            if (!body.trim()) onTypingStop?.()
          }}
          rows={2}
          placeholder="Write a message…"
          disabled={disabled}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[44px] max-h-32"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleSubmit(e)
            }
          }}
        />
        <button
          type="submit"
          disabled={disabled || sending || !body.trim()}
          className="shrink-0 rounded-xl bg-[var(--quni-coral)] text-white px-4 py-2.5 text-sm font-semibold hover:opacity-95 disabled:opacity-50"
        >
          {sending ? '…' : 'Send'}
        </button>
      </div>
    </form>
  )
}
