import { useState } from 'react'
import { downloadQldHouseRulesPdf } from '../../lib/downloadQldHouseRulesPdf'
import {
  QLD_HOUSE_RULE_SUBJECTS,
  QLD_HOUSE_RULE_SUBJECT_LABELS,
  QLD_HOUSE_RULES_COMMON_AREAS_MAX,
  QLD_HOUSE_RULES_COMMON_AREAS_REQUIRED,
  QLD_HOUSE_RULES_EXTRA_MAX,
  QLD_HOUSE_RULES_PREMISES_LINE_MAX,
  type QldHouseRuleExtras,
  type QldHouseRuleSubject,
  type QldHouseRulesVariant,
} from '../../lib/tenancy/qldHouseRules'

const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--quni-ink-4)]'
const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[var(--quni-rust)] focus:outline-none focus:ring-1 focus:ring-[var(--quni-rust)]'
const btnClass =
  'rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'

export type QldRoomingHouseRulesFieldsProps = {
  commonAreas: string
  extras: QldHouseRuleExtras
  onCommonAreasChange: (value: string) => void
  onExtraChange: (subject: QldHouseRuleSubject, value: string) => void
  premisesLine?: string
  onPremisesLineChange?: (value: string) => void
  showPremisesLine?: boolean
  compactIntro?: boolean
}

export function QldRoomingHouseRulesFields({
  commonAreas,
  extras,
  onCommonAreasChange,
  onExtraChange,
  premisesLine = '',
  onPremisesLineChange,
  showPremisesLine = false,
  compactIntro = false,
}: QldRoomingHouseRulesFieldsProps) {
  return (
    <div className="space-y-6">
      {compactIntro ? null : (
        <div className="space-y-2 text-sm text-gray-700">
          <p>
            Queensland rooming accommodation uses the house rules prescribed in Schedule 7, plus any extra
            rules you write under the seven subjects the Act allows. This is the legal document, not the
            marketplace chips above.
          </p>
          <p>
            Download two copies from the same content. Give the resident copy to the proposed resident
            before you enter into the agreement (s 275). Put the wall-display copy up at a place in the
            rental premises where residents are likely to see it (s 276). Display is required, not optional.
          </p>
        </div>
      )}
      {showPremisesLine && onPremisesLineChange ? (
        <div>
          <label htmlFor="qld-hr-premises" className={labelClass}>
            Premises (optional, PDF header)
          </label>
          <input
            id="qld-hr-premises"
            value={premisesLine}
            onChange={(e) => onPremisesLineChange(e.target.value)}
            maxLength={QLD_HOUSE_RULES_PREMISES_LINE_MAX}
            className={inputClass}
            placeholder="Street, suburb, state, postcode"
          />
        </div>
      ) : null}
      <div>
        <label htmlFor="qld-hr-common-areas" className={labelClass}>
          Common areas at these rental premises
        </label>
        <p className="mb-2 text-xs text-gray-600">
          Required. Completes Schedule 7 rule 3(5). Example: kitchen, bathrooms, hallway, backyard.
        </p>
        <textarea
          id="qld-hr-common-areas"
          aria-label="Common areas at these rental premises"
          value={commonAreas}
          onChange={(e) => onCommonAreasChange(e.target.value)}
          maxLength={QLD_HOUSE_RULES_COMMON_AREAS_MAX}
          rows={3}
          className={inputClass}
          placeholder="kitchen, bathrooms, hallway, backyard"
        />
      </div>
      <div className="space-y-4">
        <div>
          <p className={labelClass}>Additional rules (optional)</p>
          <p className="text-xs text-gray-600">
            Only these subjects. Leave a heading blank to omit it. There is no free-text box for other
            topics.
          </p>
        </div>
        {QLD_HOUSE_RULE_SUBJECTS.map((subject) => (
          <div key={subject}>
            <label htmlFor={`qld-hr-extra-${subject}`} className={labelClass}>
              {QLD_HOUSE_RULE_SUBJECT_LABELS[subject]}
            </label>
            <textarea
              id={`qld-hr-extra-${subject}`}
              aria-label={QLD_HOUSE_RULE_SUBJECT_LABELS[subject]}
              value={extras[subject] ?? ''}
              onChange={(e) => onExtraChange(subject, e.target.value)}
              maxLength={QLD_HOUSE_RULES_EXTRA_MAX}
              rows={3}
              className={inputClass}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export function QldRoomingHouseRulesDownloadBar({
  commonAreas,
  extras,
  premisesLine,
}: {
  commonAreas: string
  extras: QldHouseRuleExtras
  premisesLine?: string
}) {
  const [busy, setBusy] = useState<QldHouseRulesVariant | null>(null)
  const [error, setError] = useState<string | null>(null)
  const ready = commonAreas.trim().length > 0

  async function download(variant: QldHouseRulesVariant) {
    setError(null)
    if (!ready) {
      setError(QLD_HOUSE_RULES_COMMON_AREAS_REQUIRED)
      return
    }
    setBusy(variant)
    try {
      await downloadQldHouseRulesPdf({
        variant,
        commonAreas,
        extras,
        premisesLine,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate the house rules PDF.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btnClass}
          disabled={busy !== null}
          onClick={() => void download('resident')}
        >
          {busy === 'resident' ? 'Preparing…' : 'Download resident copy'}
        </button>
        <button
          type="button"
          className={btnClass}
          disabled={busy !== null}
          onClick={() => void download('wall')}
        >
          {busy === 'wall' ? 'Preparing…' : 'Download wall-display copy'}
        </button>
      </div>
      {!ready ? (
        <p className="text-xs text-gray-500">Add the common-areas description before downloading.</p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
