import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import AiSparkleIcon from './AiSparkleIcon'
import {
  applyProofreadSuggestion,
  assignSuggestionOccurrences,
  type ProofreadSuggestion,
} from '../lib/proofreadSuggestions'

export const proofreadBtnClass =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-[#FF6B6B] bg-white px-4 py-2 text-sm font-semibold text-[#FF6B6B] shadow-sm hover:bg-[#FFF5F5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B6B] disabled:cursor-not-allowed disabled:opacity-50'

type ProofreadPhase = 'idle' | 'loading' | 'results' | 'empty' | 'error'

export function useListingProofread(
  text: string,
  onTextChange: (text: string) => void,
  fieldName: string,
) {
  const [phase, setPhase] = useState<ProofreadPhase>('idle')
  const [suggestions, setSuggestions] = useState<ProofreadSuggestion[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
    setToast(message)
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, 5000)
  }, [])

  const runProofread = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || phase === 'loading') return

    setPhase('loading')
    setSuggestions([])

    try {
      const res = await fetch('/api/ai/proofread-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = (await res.json()) as {
        suggestions?: Array<{ original: string; suggested: string; reason: string }>
        error?: string
      }

      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`)
      }

      if (!Array.isArray(data.suggestions)) {
        throw new Error('Could not read proofread suggestions. Please try again.')
      }

      const assigned = assignSuggestionOccurrences(data.suggestions, text)
      if (assigned.length === 0) {
        setPhase('empty')
      } else {
        setSuggestions(assigned)
        setPhase('results')
      }
    } catch (e) {
      setPhase('error')
      showToast(e instanceof Error ? e.message : 'Proofread failed. Please try again.')
    }
  }, [phase, showToast, text])

  const acceptSuggestion = useCallback(
    (suggestion: ProofreadSuggestion) => {
      const nextText = applyProofreadSuggestion(text, suggestion)
      onTextChange(nextText)
      setSuggestions((prev) => {
        const next = prev.filter((s) => s.id !== suggestion.id)
        if (next.length === 0) {
          setPhase('idle')
        }
        return next
      })
    },
    [onTextChange, text],
  )

  const rejectSuggestion = useCallback((suggestionId: string) => {
    setSuggestions((prev) => {
      const next = prev.filter((s) => s.id !== suggestionId)
      if (next.length === 0) {
        setPhase('idle')
      }
      return next
    })
  }, [])

  const canProofread = Boolean(text.trim())

  const proofreadButton = (
    <button
      type="button"
      onClick={() => {
        void runProofread()
      }}
      disabled={!canProofread || phase === 'loading'}
      className={proofreadBtnClass}
      aria-label={`Proofread ${fieldName}`}
    >
      {phase === 'loading' ? (
        <>
          <span
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"
            aria-hidden
          />
          Proofreading…
        </>
      ) : (
        <>
          <AiSparkleIcon className="h-4 w-4 shrink-0 text-[#FF6B6B]" />
          Proofread
        </>
      )}
    </button>
  )

  const feedback = (
    <>
      {phase === 'empty' ? (
        <p className="text-sm text-emerald-700" role="status">
          No suggestions, looks good
        </p>
      ) : null}

      {phase === 'results' && suggestions.length > 0 ? (
        <ul className="space-y-2" aria-label={`${fieldName} proofread suggestions`}>
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.id}
              className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-1 text-sm">
                <p className="text-gray-900">
                  <span className="line-through decoration-red-400/80">{suggestion.original}</span>
                  <span className="mx-1.5 text-gray-400" aria-hidden>
                    →
                  </span>
                  <span className="font-medium text-emerald-800">{suggestion.suggested}</span>
                </p>
                <p className="text-xs text-gray-600">{suggestion.reason}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => acceptSuggestion(suggestion)}
                  className="rounded-md bg-[#0F6E56] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#0d5c4a]"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => rejectSuggestion(suggestion.id)}
                  className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {toast ? (
        <div
          className="fixed bottom-6 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg"
          role="alert"
        >
          {toast}
        </div>
      ) : null}
    </>
  )

  return { proofreadButton, feedback, canProofread, phase }
}

export type AIListingProofreadProps = {
  text: string
  onTextChange: (text: string) => void
  /** Shown in the proofread button aria-label. */
  fieldName: string
  className?: string
  /** Optional label or intro copy rendered beside the Proofread button. */
  headerSlot?: ReactNode
  /** Place the Proofread button in the header row or below the field. */
  buttonPlacement?: 'header' | 'footer'
  children?: ReactNode
}

export default function AIListingProofread({
  text,
  onTextChange,
  fieldName,
  className,
  headerSlot,
  buttonPlacement = 'header',
  children,
}: AIListingProofreadProps) {
  const { proofreadButton, feedback, canProofread } = useListingProofread(text, onTextChange, fieldName)

  const buttonRow = (
    <div className="flex flex-wrap items-center gap-3">
      {proofreadButton}
      {!canProofread ? (
        <p className="text-xs text-gray-500">Add text above to proofread, or use Reset to platform default.</p>
      ) : null}
    </div>
  )

  return (
    <div className={className}>
      {buttonPlacement === 'header' && headerSlot ? (
        <div className="mb-1 flex flex-wrap items-center gap-3">
          {headerSlot}
          {proofreadButton}
        </div>
      ) : buttonPlacement === 'header' ? (
        buttonRow
      ) : null}

      {children}

      {buttonPlacement === 'footer' ? <div className="mt-2">{buttonRow}</div> : null}

      <div className="mt-2">{feedback}</div>
    </div>
  )
}
