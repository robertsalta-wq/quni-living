import Section from '../../ui/Section'
import { RENTER_SITUATION_OPTIONS, type RenterSituation } from '../../../lib/renterSituation'
import { routeSectionTitle as routeTitleForSituation } from '../../../lib/renterProfileSection'
import { Check, ProfileSectionIcon, SITUATION_TILE_ICONS } from './profileSectionIcons'
import {
  renterSituationGridClass,
  renterSituationTileClass,
  renterSituationTileLabelClass,
  renterSituationTileLabelSelectedClass,
  renterSituationTileSelectedClass,
  renterWriteErrorClass,
} from '../../../lib/renterProfileFormClasses'

type Props = {
  currentSituation: RenterSituation | null
  onSelect: (situation: RenterSituation) => void
  busy?: boolean
  error?: string | null
  expanded: boolean
  onToggle: () => void
}

function situationSummary(situation: RenterSituation): string {
  const label = RENTER_SITUATION_OPTIONS.find((o) => o.value === situation)?.label ?? situation
  const route = routeTitleForSituation(situation)
  return `${label} · ${route}`
}

type PickerBodyProps = {
  currentSituation: RenterSituation | null
  onSelect: (situation: RenterSituation) => void
  busy?: boolean
  error?: string | null
}

/** Situation tiles only — used inside hub drill-in (no accordion chrome). */
export function RenterSituationPickerBody({
  currentSituation,
  onSelect,
  busy = false,
  error,
}: PickerBodyProps) {
  return (
    <>
      {error ? (
        <p className={renterWriteErrorClass} role="alert">
          {error}
        </p>
      ) : null}
      {currentSituation == null ? (
        <p className="mb-3.5 text-[13px] text-[var(--quni-ink-4)]">
          Tell us your situation so we ask for the right details.
        </p>
      ) : null}
      <div className={renterSituationGridClass}>
        {RENTER_SITUATION_OPTIONS.map((opt) => {
          const selected = currentSituation === opt.value
          const TileIcon = SITUATION_TILE_ICONS[opt.value]
          return (
            <button
              key={opt.value}
              type="button"
              disabled={busy}
              onClick={() => onSelect(opt.value)}
              className={`${renterSituationTileClass}${selected ? ` ${renterSituationTileSelectedClass}` : ''}`}
            >
              {selected ? (
                <span
                  className="absolute right-[9px] top-[9px] flex h-[19px] w-[19px] items-center justify-center rounded-full bg-[var(--quni-coral)]"
                  aria-hidden
                >
                  <Check size={11} color="#fff" strokeWidth={3.5} />
                </span>
              ) : null}
              <TileIcon
                size={26}
                strokeWidth={1.8}
                color={selected ? 'var(--quni-coral)' : 'var(--quni-ink-2)'}
                aria-hidden
              />
              <span
                className={`${renterSituationTileLabelClass}${selected ? ` ${renterSituationTileLabelSelectedClass}` : ''}`}
              >
                {opt.label}
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-3.5 text-[12.5px] text-[var(--quni-ink-5)]">
        Your choice sets which details we ask for next.
      </p>
      {busy ? (
        <p className="mt-2 text-[12.5px] text-[var(--quni-ink-5)]" aria-live="polite">
          Saving your choice…
        </p>
      ) : null}
    </>
  )
}

export function RenterSituationSection({
  currentSituation,
  onSelect,
  busy = false,
  error,
  expanded,
  onToggle,
}: Props) {
  const status = currentSituation != null && !expanded ? 'done' : 'todo'
  const collapsible = currentSituation != null

  return (
    <Section
      id="renter-section-situation"
      icon={<ProfileSectionIcon kind="situation" />}
      title="Your situation"
      subtitle="So we ask for the right details"
      status={status}
      summary={currentSituation != null ? situationSummary(currentSituation) : undefined}
      expanded={expanded}
      onToggle={() => {
        if (busy || !collapsible) return
        onToggle()
      }}
      collapsible={collapsible}
      editLabel="Edit"
    >
      <RenterSituationPickerBody
        currentSituation={currentSituation}
        onSelect={onSelect}
        busy={busy}
        error={error}
      />
    </Section>
  )
}
