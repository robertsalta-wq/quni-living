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
  /**
   * Strip outer card chrome + title — for embedding inside `<Section>` (or any
   * parent that already provides the bordered surface). Never nest a bordered
   * card inside Section / ActionCard.
   */
  embedded?: boolean
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
  embedded = false,
}: Props) {
  const body = (
    <>
      {showGenerate && !assessment && (
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className={`${embedded ? '' : 'mt-3 '}flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--quni-coral)] py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--quni-coral-hover)] disabled:opacity-60`}
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
        <div className={`${embedded ? '' : 'mt-3 '}max-w-[600px] space-y-3`}>
          <div className="text-left text-sm leading-relaxed text-admin-ink-2">
            <p className="max-w-[600px] whitespace-pre-wrap">{assessment}</p>
            {assessmentAt && (
              <p className="mt-2 text-[11px] text-admin-ink-5">Generated {formatAssessmentAt(assessmentAt)}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading || refreshDisabled}
            title={refreshDisabled ? refreshDisabledReason : undefined}
            className="text-xs font-semibold text-[var(--quni-coral)] hover:text-[var(--quni-coral-hover)] disabled:opacity-50 disabled:cursor-not-allowed underline underline-offset-2"
          >
            {loading ? 'Refreshing…' : 'Refresh assessment'}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-center text-xs text-admin-ink-5">Assessment unavailable. Please try again.</p>}

      <p className="mt-3 text-[11px] leading-snug text-admin-ink-5">
        This assessment is AI-generated and assistive only. It does not constitute verification of the applicant&apos;s
        identity or credentials.
      </p>
    </>
  )

  if (embedded) {
    return (
      <div id={anchorId} className="scroll-mt-4">
        {body}
      </div>
    )
  }

  return (
    <section id={anchorId} className="quni-card scroll-mt-4 p-6">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-admin-ink-5">
        <AiSparkleIcon className="h-4 w-4 shrink-0 text-[var(--quni-coral)]" />
        AI assessment
      </h3>
      {body}
    </section>
  )
}
