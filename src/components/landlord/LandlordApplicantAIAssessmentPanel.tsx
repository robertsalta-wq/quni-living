import AiSparkleIcon from '../AiSparkleIcon'

type Props = {
  anchorId?: string
  assessment: string | null
  assessmentAt: string | null
  loading: boolean
  error: boolean
  onGenerate: () => void
  onRefresh: () => void
  refreshDisabled: boolean
  refreshDisabledReason?: string
  showGenerate: boolean
}

function formatAssessmentAt(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('en-AU', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return ''
  }
}

export default function LandlordApplicantAIAssessmentPanel({
  anchorId = 'landlord-ai-assessment',
  assessment,
  assessmentAt,
  loading,
  error,
  onGenerate,
  onRefresh,
  refreshDisabled,
  refreshDisabledReason,
  showGenerate,
}: Props) {
  return (
    <section id={anchorId} className="scroll-mt-4 rounded-xl border border-gray-100 bg-white px-4 py-4">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <AiSparkleIcon className="h-4 w-4 shrink-0 text-[#FF6F61]" />
        AI assessment
      </h3>

      {showGenerate && !assessment && (
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6F61] py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#e85d52] disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span
                className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent"
                aria-hidden
              />
              Generating…
            </span>
          ) : (
            <>
              <AiSparkleIcon className="h-4 w-4 shrink-0 text-white" />
              Generate AI assessment
            </>
          )}
        </button>
      )}

      {assessment && (
        <div className="mt-3 space-y-3">
          <div className="rounded-xl border border-stone-200/90 bg-[#FFF8F0] px-3 py-3 text-left text-sm leading-relaxed text-gray-800">
            <p className="whitespace-pre-wrap">{assessment}</p>
            {assessmentAt && (
              <p className="mt-2 text-[11px] text-gray-500">Generated {formatAssessmentAt(assessmentAt)}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading || refreshDisabled}
            title={refreshDisabled ? refreshDisabledReason : undefined}
            className="text-xs font-semibold text-[#FF6F61] hover:text-[#e85d52] disabled:opacity-50 disabled:cursor-not-allowed underline underline-offset-2"
          >
            {loading ? 'Refreshing…' : 'Refresh assessment'}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-center text-xs text-gray-500">Assessment unavailable. Please try again.</p>}

      <p className="mt-3 text-[11px] leading-snug text-gray-500">
        This assessment is AI-generated and assistive only. It does not constitute verification of the student&apos;s
        identity or credentials.
      </p>
    </section>
  )
}
