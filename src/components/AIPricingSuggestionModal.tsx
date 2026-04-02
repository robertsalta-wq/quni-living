import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import AiSparkleIcon from './AiSparkleIcon'

type PricingSuggestion = {
  low: number
  high: number
  reasoning: string
}

export type AIPricingSuggestionModalProps = {
  isOpen: boolean
  onClose: () => void
  onAccept: (price: number) => void
  roomType: string
  suburb: string
  nearbyUniversities?: string[]
  amenities?: string[]
  furnished?: boolean
  billsIncluded?: boolean
}

export default function AIPricingSuggestionModal({
  isOpen,
  onClose,
  onAccept,
  roomType,
  suburb,
  nearbyUniversities,
  amenities,
  furnished,
  billsIncluded,
}: AIPricingSuggestionModalProps) {
  const titleId = useId()
  const [loading, setLoading] = useState(false)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<PricingSuggestion | null>(null)
  const loadingMessages = useMemo(
    () => [
      'Researching the market…',
      'Checking Flatmates listings…',
      'Looking up Scape and Iglu pricing…',
      'Calculating your suggested range…',
    ],
    [],
  )

  const canSubmit = useMemo(() => Boolean(roomType.trim() && suburb.trim()), [roomType, suburb])

  const run = useCallback(async () => {
    if (!canSubmit) {
      setSuggestion(null)
      setError('Add room type and suburb to get an AI price suggestion.')
      return
    }
    setLoading(true)
    setError(null)
    setSuggestion(null)
    try {
      const res = await fetch('/api/ai/suggest-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomType: roomType.trim(),
          suburb: suburb.trim(),
          ...(nearbyUniversities?.length ? { nearbyUniversities } : {}),
          ...(amenities?.length ? { amenities } : {}),
          ...(typeof furnished === 'boolean' ? { furnished } : {}),
          ...(typeof billsIncluded === 'boolean' ? { billsIncluded } : {}),
        }),
      })
      const data = (await res.json().catch(() => null)) as
        | { low?: number; high?: number; reasoning?: string; error?: string }
        | null
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
      if (
        typeof data?.low !== 'number' ||
        typeof data?.high !== 'number' ||
        typeof data?.reasoning !== 'string' ||
        data.high < data.low
      ) {
        throw new Error('Invalid AI pricing suggestion returned')
      }
      setSuggestion({
        low: Math.round(data.low),
        high: Math.round(data.high),
        reasoning: data.reasoning.trim(),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate pricing suggestion.')
    } finally {
      setLoading(false)
    }
  }, [canSubmit, roomType, suburb, nearbyUniversities, amenities, furnished, billsIncluded])

  useEffect(() => {
    if (!isOpen) return
    void run()
  }, [isOpen, run])

  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!loading) {
      setLoadingMessageIndex(0)
      return
    }
    const interval = window.setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length)
    }, 4000)
    return () => window.clearInterval(interval)
  }, [loading, loadingMessages.length])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-2xl border border-gray-100 bg-white p-6 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="py-8 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            <p className="mt-4 text-sm text-gray-600">{loadingMessages[loadingMessageIndex]}</p>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <h2
              id={titleId}
              className="flex items-center gap-2 text-lg font-semibold text-gray-900"
            >
              <AiSparkleIcon className="h-5 w-5 shrink-0 text-[#FF6B6B]" />
              AI pricing suggestion
            </h2>
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  void run()
                }}
                className="rounded-lg bg-[#FF6B6B] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        ) : suggestion ? (
          <div className="space-y-5">
            <h2
              id={titleId}
              className="flex items-center gap-2 text-lg font-semibold text-gray-900"
            >
              <AiSparkleIcon className="h-5 w-5 shrink-0 text-[#FF6B6B]" />
              Suggested price range
            </h2>
            <p className="text-3xl font-bold tracking-tight text-gray-900">
              ${suggestion.low} - ${suggestion.high} / week
            </p>
            <p className="text-sm leading-relaxed text-gray-500">{suggestion.reasoning}</p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const midpoint = Math.round((suggestion.low + suggestion.high) / 2)
                  onAccept(midpoint)
                  onClose()
                }}
                className="rounded-lg bg-[#FF6B6B] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
              >
                Use this price
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            <p className="text-center text-xs text-gray-500">
              Pricing based on current Flatmates.com.au listings and Scape/Iglu rates in your area.
            </p>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-600">No suggestion available.</p>
          </div>
        )}
      </div>
    </div>
  )
}
