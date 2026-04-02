import { useCallback, useState } from 'react'
import AiSparkleIcon from './AiSparkleIcon'

const coralBtnClass =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF6B6B] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B6B] disabled:cursor-not-allowed disabled:opacity-50'
const coralOutlineBtnClass =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-[#FF6B6B] bg-white px-4 py-2 text-sm font-semibold text-[#FF6B6B] shadow-sm hover:bg-[#FFF5F5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B6B] disabled:cursor-not-allowed disabled:opacity-50'

export type AIDescriptionGeneratorProps = {
  roomType: string
  weeklyRent?: number
  suburb: string
  nearbyUniversities?: string[]
  amenities?: string[]
  houseRules?: string
  billsIncluded?: boolean
  furnished?: boolean
  existingDescription?: string
  onGenerated: (description: string) => void
}

export default function AIDescriptionGenerator({
  roomType,
  weeklyRent,
  suburb,
  nearbyUniversities,
  amenities,
  houseRules,
  billsIncluded,
  furnished,
  existingDescription,
  onGenerated,
}: AIDescriptionGeneratorProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false)

  const canSubmit = Boolean(roomType.trim() && suburb.trim())

  const run = useCallback(async (mode: 'generate' | 'improve') => {
    if (!canSubmit || loading) return
    setError(null)
    setLoading(true)
    try {
      const trimmedExistingDescription = existingDescription?.trim() ?? ''
      const res = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomType: roomType.trim(),
          suburb: suburb.trim(),
          ...(weeklyRent !== undefined && Number.isFinite(weeklyRent) ? { weeklyRent } : {}),
          ...(nearbyUniversities && nearbyUniversities.length > 0 ? { nearbyUniversities } : {}),
          ...(amenities && amenities.length > 0 ? { amenities } : {}),
          ...(houseRules?.trim() ? { houseRules: houseRules.trim() } : {}),
          ...(typeof billsIncluded === 'boolean' ? { billsIncluded } : {}),
          ...(typeof furnished === 'boolean' ? { furnished } : {}),
          ...(mode === 'improve' && trimmedExistingDescription
            ? { existingDescription: trimmedExistingDescription }
            : {}),
        }),
      })
      const data = (await res.json()) as { description?: string; error?: string }
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`)
      }
      if (typeof data.description !== 'string' || !data.description.trim()) {
        throw new Error('No description returned')
      }
      onGenerated(data.description.trim())
      setHasGeneratedOnce(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [
    canSubmit,
    loading,
    roomType,
    suburb,
    weeklyRent,
    nearbyUniversities,
    amenities,
    houseRules,
    billsIncluded,
    furnished,
    existingDescription,
    onGenerated,
  ])

  const hasExistingDescription = Boolean(existingDescription?.trim())
  const writeLabel = hasGeneratedOnce ? 'Regenerate with AI' : 'Write with AI'

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            void run('generate')
          }}
          disabled={!canSubmit || loading}
          className={coralBtnClass}
        >
          {loading ? (
            <>
              <span
                className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent"
                aria-hidden
              />
              Generating…
            </>
          ) : (
            <>
              <AiSparkleIcon className="h-4 w-4 shrink-0 text-white" />
              {writeLabel}
            </>
          )}
        </button>
        {hasExistingDescription && (
          <button
            type="button"
            onClick={() => {
              void run('improve')
            }}
            disabled={!canSubmit || loading}
            className={coralOutlineBtnClass}
          >
            {loading ? (
              'Generating…'
            ) : (
              <>
                <AiSparkleIcon className="h-4 w-4 shrink-0 text-[#FF6B6B]" />
                Improve mine
              </>
            )}
          </button>
        )}
        {!canSubmit && (
          <p className="text-xs text-gray-500">Add room type and suburb to use AI.</p>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
