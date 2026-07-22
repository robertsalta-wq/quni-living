import { useState } from 'react'
import Section from '../../ui/Section'
import { RENTER_SITUATION_OPTIONS, type RenterSituation } from '../../../lib/renterSituation'
import { routeSectionTitle as routeTitleForSituation } from '../../../lib/renterProfileSection'
import { Check, ProfileSectionIcon, SITUATION_TILE_ICONS } from './profileSectionIcons'
import {
  renterWriteErrorClass,
} from '../../../lib/renterProfileFormClasses'

type Props = {
  currentSituation: RenterSituation | null
  onSelect: (situation: RenterSituation) => void
  busy?: boolean
  error?: string | null
}

function situationSummary(situation: RenterSituation): string {
  const label = RENTER_SITUATION_OPTIONS.find((o) => o.value === situation)?.label ?? situation
  const route = routeTitleForSituation(situation)
  return `${label} · ${route}`
}

export function RenterSituationSection({ currentSituation, onSelect, busy = false, error }: Props) {
  const [editing, setEditing] = useState(currentSituation == null)
  const expanded = currentSituation == null || editing
  const status = currentSituation != null && !editing ? 'done' : 'todo'

  return (
    <Section
      id="renter-section-situation"
      icon={<ProfileSectionIcon kind="situation" />}
      title="Your situation"
      status={status}
      summary={currentSituation != null ? situationSummary(currentSituation) : undefined}
      expanded={expanded}
      onToggle={() => {
        if (busy || currentSituation == null) return
        setEditing((v) => !v)
      }}
      collapsible={currentSituation != null}
      editLabel="Edit"
    >
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
      <div className="renter-profile-situation-grid">
        {RENTER_SITUATION_OPTIONS.map((opt) => {
          const selected = currentSituation === opt.value
          const TileIcon = SITUATION_TILE_ICONS[opt.value]
          return (
            <button
              key={opt.value}
              type="button"
              disabled={busy}
              onClick={() => {
                onSelect(opt.value)
                if (currentSituation != null) setEditing(false)
              }}
              className={`renter-profile-situation-tile${selected ? ' renter-profile-situation-tile-selected' : ''}`}
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
              <span className="renter-profile-situation-tile-label">{opt.label}</span>
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
    </Section>
  )
}
