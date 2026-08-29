import { landlordDraftPublishPromptCopy } from '../../lib/landlordDraftPublishPrompt'
import { dashboardPrimaryBtnClass } from '../../lib/dashboardButtons'

type Props = {
  draftCount: number
  busy?: boolean
  onPublish: () => void
  onGoListings: () => void
}

export default function LandlordDraftPublishPrompt({
  draftCount,
  busy,
  onPublish,
  onGoListings,
}: Props) {
  const copy = landlordDraftPublishPromptCopy(draftCount)
  if (!copy) return null
  const publishNow = draftCount === 1

  return (
    <div
      className="mb-5 rounded-xl border border-[rgba(255,111,97,0.40)] bg-[rgba(255,111,97,0.06)] px-4 py-3.5 sm:px-5"
      role="status"
    >
      <div className="flex flex-col gap-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
        <div className="min-w-0">
          <p className="text-[14.5px] font-bold text-[var(--quni-ink)]">{copy.title}</p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--quni-ink-4)]">{copy.body}</p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={publishNow ? onPublish : onGoListings}
          className={`${dashboardPrimaryBtnClass} shrink-0`}
        >
          {busy && publishNow ? 'Publishing…' : copy.actionLabel}
        </button>
      </div>
    </div>
  )
}
